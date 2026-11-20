# Spa City Solitaire: brass Art Deco table hardware, rendered to transparent PNG sprites.
# Run: blender -b --factory-startup --python brass.py -- <outdir> [names...]
# Every piece is built procedurally (no external assets).
import bpy, bmesh, math, sys, os
from mathutils import Vector

# Synced 9-slice constant for dialog-frame (512x512 px -> CSS border-image slice 118; CD-WF3-03).
DIALOG_FRAME_SLICE = 118

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0]) if argv else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'renders')
ONLY = set(argv[1:])
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    # AgX tone mapping prevents metallic specular clipping to pure white (WF-3 §2.2).
    try:
        sc.view_settings.view_transform = 'AgX'
    except TypeError:
        sc.view_settings.view_transform = 'Filmic'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.32, 0.30, 0.27, 1); bg.inputs[1].default_value = 0.6
    return sc


def mat_brass(name='brass', col=(0.83, 0.62, 0.30), rough=0.28):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    return m


def mat_enamel(name, col, rough=0.30):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough
    coat_key = 'Coat Weight' if (bpy.app.version >= (4, 0, 0) and 'Coat Weight' in b.inputs) else 'Clearcoat'
    if coat_key in b.inputs:
        b.inputs[coat_key].default_value = 0.6
    return m


def smooth_bevel(ob, bevel, mat):
    if bevel > 0:
        md = ob.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'
    ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def poly_obj(name, pts, depth, bevel, mat, z=0.0):
    """Extrude a closed 2D polygon (list of (x, y)) up by depth, with a bevel."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, y in pts]
    f = bm.faces.new(vs); bm.normal_update()
    if f.normal.z < 0: f.normal_flip()
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return smooth_bevel(ob, bevel, mat)


def arc(name, r_out, r_in, depth, mat, a0=0.0, a1=2 * math.pi, n=96, z=0.0, bevel=0.0):
    """An annulus sector as one extruded polygon (r_in may be 0 for a pie slice)."""
    pts = [(r_out * math.cos(a0 + (a1 - a0) * i / n), r_out * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    if r_in > 0: pts += [(r_in * math.cos(a1 - (a1 - a0) * i / n), r_in * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)]
    else: pts.append((0, 0))
    return poly_obj(name, pts, depth, bevel, mat, z)


def tube_ring(name, r, thick, depth, mat, z=0.0, n=128):
    """Full ring built via pure bmesh extrusion (no fragile Boolean modifier)."""
    r_out = r + thick / 2.0
    r_in = max(0.005, r - thick / 2.0)
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vo = [bm.verts.new((r_out * math.cos(2 * math.pi * i / n), r_out * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
    vi = [bm.verts.new((r_in * math.cos(2 * math.pi * i / n), r_in * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((vo[i], vo[j], vi[j], vi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    r2 = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    for v in [e for e in r2['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return smooth_bevel(ob, min(thick, depth) * .22, mat)


def camera_lights(size, center=(0, 0), sym45=False):
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = size
    co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
    co.location = (center[0], center[1], 10); bpy.context.scene.camera = co
    if sym45:
        # Symmetric 45-deg diagonal lighting so corner-fan stays evenly lit under -90 deg rotation (CD-WF3-05).
        rig = [('key', (3.5, 3.5, 7.5), 760, 4.0), ('fill_a', (-4.2, 1.8, 5.5), 240, 5.0),
               ('fill_b', (1.8, -4.2, 5.5), 240, 5.0), ('rim', (-3.5, -3.5, 2.8), 180, 3.0)]
    else:
        # Key light from the upper left (the game's lamp sits top-left of center), soft fill, low rim.
        rig = [('key', (-4, 5, 7), 900, 3), ('fill', (5, -2, 5), 160, 6), ('rim', (0, -6, 2), 220, 2)]
    for nm, loc, en, sz in rig:
        L = bpy.data.lights.new(nm, 'AREA'); L.energy = en; L.size = sz
        o = bpy.data.objects.new(nm, L); bpy.context.collection.objects.link(o)
        o.location = (loc[0] + center[0], loc[1] + center[1], loc[2])
        d = Vector((center[0], center[1], 0)) - Vector(o.location); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def render(name, px_w, px_h):
    sc = bpy.context.scene; sc.render.resolution_x = px_w; sc.render.resolution_y = px_h
    sc.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
    print('SAVED', sc.render.filepath)


# ---------------------------------------------------------------- pieces
def corner_fan():
    """Quarter-circle Deco fan for a table corner. Retains emerald jade enamel with rough=0.30 & 45-deg symmetric lighting (CD-WF3-05)."""
    reset(); brass = mat_brass(); dark = mat_brass('brassdk', (0.55, 0.38, 0.16), 0.38)
    jade = mat_enamel('jade', (0.02, 0.12, 0.08), rough=0.30)
    q0, q1 = 0.0, math.pi / 2
    arc('arc1', 2.0, 1.88, 0.06, brass, q0, q1, bevel=0.01)
    arc('arc2', 1.62, 1.55, 0.05, brass, q0, q1, bevel=0.008)
    arc('enamel', 1.55, 0.5, 0.02, jade, q0, q1)
    arc('hub', 0.55, 0.0, 0.14, brass, q0, q1, bevel=0.02)
    n = 9
    for i in range(n):
        a = q0 + (q1 - q0) * (i + .5) / n; w = 0.05 if i % 2 else 0.075
        L = 1.5 if i % 2 == 0 else 1.18
        pts = [(0.52 * math.cos(a - w), 0.52 * math.sin(a - w)), (L * math.cos(a - w * .3), L * math.sin(a - w * .3)),
               (L * math.cos(a + w * .3), L * math.sin(a + w * .3)), (0.52 * math.cos(a + w), 0.52 * math.sin(a + w))]
        poly_obj('ray_%d' % i, pts, 0.07, 0.008, brass, 0.02)
    # stepped bars along both table edges, lifted above the arcs; the hub covers where they meet
    for k, (ln, off) in enumerate([(2.9, 0.0), (2.5, 0.14), (2.15, 0.28)]):
        m = dark if k == 1 else brass
        poly_obj('cf_bx_%d' % k, [(0.3, off), (ln, off), (ln, off + 0.07), (0.3, off + 0.07)], 0.05, 0.01, m, 0.07)
        poly_obj('cf_by_%d' % k, [(off, 0.3), (off + 0.07, 0.3), (off + 0.07, ln), (off, ln)], 0.05, 0.01, m, 0.07)
    for i, a in enumerate([math.pi / 8, math.pi / 4, 3 * math.pi / 8]):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(1.75 * math.cos(a), 1.75 * math.sin(a), 0.05))
        s = bpy.context.object; s.name = 'cf_stud_%d' % i; s.scale.z = .6; s.data.materials.append(brass); bpy.ops.object.shade_smooth()
    camera_lights(3.1, (1.45, 1.45), sym45=True)
    render('corner-fan', 512, 512)


def rrect_pts(x0, y0, x1, y1, r, n=8):
    pts = []
    for cx, cy, a0 in [(x1 - r, y0 + r, -math.pi / 2), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, math.pi / 2), (x0 + r, y0 + r, math.pi)]:
        for i in range(n + 1):
            a = a0 + math.pi / 2 * i / n; pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def frame_obj(name, w, h, r, t, depth, mat, z=0.0, bevel=0.004):
    """A rounded-rectangle band (outer w×h, band width t) centred on the origin."""
    outer = rrect_pts(-w / 2, -h / 2, w / 2, h / 2, r); inner = rrect_pts(-w / 2 + t, -h / 2 + t, w / 2 - t, h / 2 - t, max(.005, r - t))
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vo = [bm.verts.new((x, y, z)) for x, y in outer]; vi = [bm.verts.new((x, y, z)) for x, y in inner]
    n = len(vo)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((vo[i], vo[j], vi[j], vi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    r2 = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    for v in [e for e in r2['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return smooth_bevel(ob, bevel, mat)


def corner_bracket_arc(name, sx, sy, w, h, r, t, arm_x, arm_y, depth, mat, z=0.0, bevel=0.004, n=10):
    """One open L-shaped rounded corner bracket arm for slot-cell (broken side rails)."""
    cx = sx * (w / 2 - r)
    cy = sy * (h / 2 - r)
    a0 = {(-1, -1): math.pi, (1, -1): -math.pi / 2, (1, 1): 0.0, (-1, 1): math.pi / 2}[(sx, sy)]
    r_in = max(0.005, r - t)
    # Build ordered outer arc + both straight arms, then return along inner arc.
    outer = []
    # Arm extending inward along X from corner end
    ex = sx * (w / 2 - arm_x)
    ey = sy * (h / 2 - arm_y)
    if sx * sy > 0:
        # (+1,+1) or (-1,-1): sweep from X-side arm around corner to Y-side arm
        outer.append((sx * (w / 2), ey))
        for i in range(n + 1):
            a = a0 + (math.pi / 2) * i / n
            outer.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        outer.append((ex, sy * (h / 2)))
        inner = [(ex, sy * (h / 2 - t))]
        for i in range(n, -1, -1):
            a = a0 + (math.pi / 2) * i / n
            inner.append((cx + r_in * math.cos(a), cy + r_in * math.sin(a)))
        inner.append((sx * (w / 2 - t), ey))
    else:
        # (+1,-1) or (-1,+1): sweep from Y-side arm around corner to X-side arm
        outer.append((ex, sy * (h / 2)))
        for i in range(n + 1):
            a = a0 + (math.pi / 2) * i / n
            outer.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        outer.append((sx * (w / 2), ey))
        inner = [(sx * (w / 2 - t), ey)]
        for i in range(n, -1, -1):
            a = a0 + (math.pi / 2) * i / n
            inner.append((cx + r_in * math.cos(a), cy + r_in * math.sin(a)))
        inner.append((ex, sy * (h / 2 - t)))
    return poly_obj(name, outer + inner, depth, bevel, mat, z)


def slot_plate(name='slot-plate'):
    """Closed double-rim brass inlay marking a permanent Foundation or King tableau slot."""
    reset(); brass = mat_brass(); dark = mat_brass('brassdk', (0.55, 0.38, 0.16), 0.38)
    W_, H_ = 1.0, 1.4
    frame_obj(name + '_rim', W_, H_, .075, .022, .03, brass)
    frame_obj(name + '_key', W_ - .08, H_ - .08, .05, .008, .015, dark)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, y0 = sx * (W_ / 2 - .07), sy * (H_ / 2 - .07)
            tag = '%s_%s_%s' % (name, 'p' if sx > 0 else 'n', 'p' if sy > 0 else 'n')
            for k, L in enumerate([.2, .14, .08]):
                o = .028 * k
                poly_obj('%s_cx_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + L), y0 - sy * o), (x0 - sx * (o + L), y0 - sy * (o + .016)), (x0 - sx * o, y0 - sy * (o + .016))], .025, .003, brass, .01)
                poly_obj('%s_cy_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + .016), y0 - sy * o), (x0 - sx * (o + .016), y0 - sy * (o + L)), (x0 - sx * o, y0 - sy * (o + L))], .025, .003, brass, .01)
    camera_lights(1.5 * 1.04)
    render(name, 400, 560)


def slot_cell(name='slot-cell'):
    """Open, segmented Art Deco corner brackets with broken side rails for temporary FreeCell parking (WF-3 §2.2)."""
    reset(); brass = mat_brass(); dark = mat_brass('brassdk', (0.55, 0.38, 0.16), 0.38)
    jade = mat_enamel('jade', (0.02, 0.12, 0.08), rough=0.30)
    W_, H_ = 1.0, 1.4
    for sx in (-1, 1):
        for sy in (-1, 1):
            tag = '%s_%s_%s' % (name, 'p' if sx > 0 else 'n', 'p' if sy > 0 else 'n')
            # Open corner bracket outer & inner rails (broken across middle 44% horizontally, 56% vertically)
            corner_bracket_arc(tag + '_rim', sx, sy, W_, H_, .075, .022, .28, .31, .03, brass)
            corner_bracket_arc(tag + '_key', sx, sy, W_ - .08, H_ - .08, .05, .008, .24, .27, .015, dark)
            x0, y0 = sx * (W_ / 2 - .07), sy * (H_ / 2 - .07)
            for k, L in enumerate([.2, .14, .08]):
                o = .028 * k
                poly_obj('%s_cx_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + L), y0 - sy * o), (x0 - sx * (o + L), y0 - sy * (o + .016)), (x0 - sx * o, y0 - sy * (o + .016))], .025, .003, brass, .01)
                poly_obj('%s_cy_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + .016), y0 - sy * o), (x0 - sx * (o + .016), y0 - sy * (o + L)), (x0 - sx * o, y0 - sy * (o + L))], .025, .003, brass, .01)
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.022, depth=.02, location=(x0 - sx * .1, y0 - sy * .1, .03))
            stud = bpy.context.object; stud.name = tag + '_jade'
            stud.data.materials.append(jade); bpy.ops.object.shade_smooth()
    camera_lights(1.5 * 1.04)
    render(name, 400, 560)


def token_recycle():
    """Brass coin with a raised circular arrow: oxidized bronze recessed face & softened rim roughness 0.36 (WF-3 §2.2)."""
    reset(); brass = mat_brass('brass', (0.83, 0.62, 0.30), rough=0.36); dark = mat_brass('bronze_ox', (0.28, 0.19, 0.08), 0.45)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.0, depth=.12, location=(0, 0, .06))
    coin = bpy.context.object; coin.name = 'tr_coin'; smooth_bevel(coin, .035, dark)
    tube_ring('tr_rim', .93, .06, .16, brass)
    a0, a1 = math.radians(110), math.radians(110 + 290)
    arc('tr_arrow', .6, .44, .2, brass, a0, a1, n=64, bevel=.012)
    ah = a0  # arrowhead at the start of the arc, pointing clockwise
    cx, cy = .52 * math.cos(ah), .52 * math.sin(ah)
    tx, ty = -math.sin(ah), math.cos(ah)   # tangent (counter-clockwise)
    nx, ny = math.cos(ah), math.sin(ah)
    pts = [(cx + nx * .2, cy + ny * .2), (cx - nx * .2, cy - ny * .2), (cx - tx * .26, cy - ty * .26)]
    poly_obj('tr_head', pts, .2, .012, brass)
    camera_lights(2.2)
    render('token-recycle', 256, 256)


def dialog_frame():
    """Square transparent metallic brass frame for a CSS 9-slice overlay (CD-WF3-03).
    Rendered at 512 px with 2% ortho bleed (S_ * 1.04); CSS slices at DIALOG_FRAME_SLICE (118 px)."""
    reset(); brass = mat_brass(); dark = mat_brass('brassdk', (0.55, 0.38, 0.16), 0.38)
    jade = mat_enamel('jade', (0.02, 0.12, 0.08), rough=0.30)
    S_ = 2.0
    frame_obj('df_band', S_, S_, .14, .07, .05, brass, bevel=.006)
    frame_obj('df_key', S_ - .2, S_ - .2, .07, .016, .025, dark, bevel=.003)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, y0 = sx * (S_ / 2 - .13), sy * (S_ / 2 - .13)
            tag = 'df_%s_%s' % ('p' if sx > 0 else 'n', 'p' if sy > 0 else 'n')
            for k, L in enumerate([.3, .2, .11]):
                o = .04 * k
                poly_obj('%s_cx_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + L), y0 - sy * o), (x0 - sx * (o + L), y0 - sy * (o + .022)), (x0 - sx * o, y0 - sy * (o + .022))], .03, .004, brass, .01)
                poly_obj('%s_cy_%d' % (tag, k), [(x0 - sx * o, y0 - sy * o), (x0 - sx * (o + .022), y0 - sy * o), (x0 - sx * (o + .022), y0 - sy * (o + L)), (x0 - sx * o, y0 - sy * (o + L))], .03, .004, brass, .01)
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.028, depth=.03, location=(x0 - sx * .16, y0 - sy * .16, .035))
            stud = bpy.context.object; stud.name = tag + '_jade'
            stud.data.materials.append(jade); bpy.ops.object.shade_smooth()
    camera_lights(S_ * 1.04)
    render('dialog-frame', 512, 512)


PIECES = {'dialog-frame': dialog_frame, 'corner-fan': corner_fan, 'slot-plate': slot_plate, 'slot-cell': slot_cell,
          'token-recycle': token_recycle}
for nm, fn in PIECES.items():
    if not ONLY or nm in ONLY: fn()
