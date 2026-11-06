# Spa City Solitaire refinement, November 2026

**User-directed early closure. Formal release HOLD.**

The user directed testing to end. This report retains the original scoped observations and their limitations. The formal campaign record remains BASE, QUEUED, loop 0. Full qualification, production deployment and production smoke remain unverified. [R41 campaign record](<D:/hsg-campaign/evidence/refinement-2026-11/desktop-director-progress-d9696d13-41ae-427a-bb9e-a366f45ed43c/report.json>)

## Source and publication

The fix history integrated into `main` contains `3c95afd1de73693176e2e5b9ccad10140bd9f683`. The fix already includes the tracked `index.html`. Its SHA-256 is `8f5bc2ec432be605f6edeeda971ac95acd8575dcf8da222a81bad23aadfb85a4`. No tests were run during this integration.


The historical publication inventory records `v2.3.0` at commit `60b95b8df964b5ce54d75721d5b0d8f849371a99`. The corresponding committed index SHA-256 was `c2947e2449d247dfb1e4ccfeff1acd5fee9b67d7eecfe19bb8f38523a3a1680b`. Current public response bytes and deployment identity still require verification. [Historical site ref inventory](<C:/Video Game Projects/campaigns/refinement-2026-11/preflight/p0-01-attempt1/stdout.txt>) · [Committed index inventory](<C:/Video Game Projects/campaigns/refinement-2026-11/preflight/p0-11-assessment/stdout.txt>)

- Local `refine/2026-11` at `3c95afd1de73693176e2e5b9ccad10140bd9f683` in `D:/hsg-campaign/worktrees/solitaire/desktop-refine-20261104`.

## Coverage matrix

The rows record bounded observations by workflow. Formal completion of each applicable workflow and profile is still pending. [Workflow and profile requirements](<C:/Video Game Projects/campaigns/refinement-2026-11/MASTER-PROMPT.md>)

| Workflow | Scoped evidence and remaining work |
| --- | --- |
| WF-01 Build and integrity | Historical preflight retained the exact committed index for the no-build game. Current candidate artifact, budgets and integrity gate remain pending. |
| WF-02 Feature inventory | Complete feature-to-real-input coverage map remains pending. |
| WF-03 Core loop | Legal pointer and keyboard play and save/reload ran at both desktop sizes. A legitimate Klondike dead end occurred after 68 moves. |
| WF-04 Input | Physical iPad Safari exercised native stock draws, Undo and a read-assisted card drag during scoped Klondike play. |
| WF-05 Layout | Scoped desktop rendering and physical iPad rendering are retained. Full viewport, safe-area, scale and rotation checks remain pending. |
| WF-06 Mechanics | Independent full rules, seeded shadow models and balance comparisons remain pending. |
| WF-07 Persistence | Restart and New Deal now autosave immediately. Scoped reload and old-reader checks passed. |
| WF-08 Audio | Full real-input audio, analyser and recovery evidence remains pending. Human audibility remains unverified. |
| WF-09 Lifecycle | Physical menu, background and Resume preserved piles in the scoped native run. Full lifecycle matrix remains pending. |
| WF-10 Performance | Hardware-qualified frame cost, throttled load and 30-minute soak remain pending. |
| WF-11 Accessibility | Full keyboard, contrast, scalable text and assistive checks remain pending. |
| WF-12 Content and licensing | Complete help, site controls, claims and licensing audit remains pending. |
| WF-13 Player integration | Scoped local player paths were observed in Chrome and Edge. Current formal workflow, exact production routes and candidate smoke remain pending. |
| WF-14 Visual polish | Scoped screenshots and visual review are retained. Complete all-screen visual assessment remains pending. |

## Defect log

| Severity | Recorded defect or finding | Integration status |
| --- | --- | --- |
| S1 | Restart/New deal was not autosaved until first move | Integrated source fix `3c95afd1de73693176e2e5b9ccad10140bd9f683`. Included in the repository integration. Production deployment remains unverified. |

The integrated changes affect play as follows. Starting over or dealing again records the new board before the first move. [Local commit and worktree index](<D:/hsg-campaign/platform-support/release-controller/final-report-readiness-031009b8-9c99-4849-87ee-76e539afcebb/REPORT-READINESS.json>)

## Before and after

The selected original desktop suite passed 48/48. The Restart/New Deal regression failed on the baseline. The local fix passed four size/action checks, 3/3 persistence checks, 48/48 unchanged cases, and 5/5 old-reader checks. [Evidence 1 · 9712](<D:/hsg-campaign/evidence/refinement-2026-11/desktop-solitaire-final-handoff-7e79e21e-0667-463a-8046-fa648ee2b73f/handoff.json>)

## Evidence tiers

- Installed Chrome and Edge basic player observations are scoped E2 desktop evidence. Hardware qualification and broader workflow coverage remain separate. [Desktop scope and profile limits](<D:/hsg-campaign/evidence/refinement-2026-11/desktop-director-progress-d9696d13-41ae-427a-bb9e-a366f45ed43c/report.json>)
- The physical iPad Safari lane records 1 completed bounded gameplay run across 1 attempt. The R8 local route returned 200 with body SHA-256 `8f5bc2ec432be605f6edeeda971ac95acd8575dcf8da222a81bad23aadfb85a4`. The last gameplay body SHA-256 was `8f5bc2ec432be605f6edeeda971ac95acd8575dcf8da222a81bad23aadfb85a4` from source commit `3c95afd1de73693176e2e5b9ccad10140bd9f683`. Physical iPad scope is recorded separately from the Android and WebKit proxy tiers. [Physical iPad route](<D:/hsg-campaign/evidence/refinement-2026-11/ipad-route-verification-r8-9157fa31-c2c2-46ee-a788-e9bb70e3a59e/route-report.json>) · [Physical iPad gameplay](<D:/hsg-campaign/evidence/refinement-2026-11/ipad-final-report-c14434a9-3a6e-49f6-83fa-a1bea341c260/FINAL-REPORT.json>)

## Pending coverage and limitations

- 48 selected original desktop cases passed. Natural play ended at a legitimate 68-move dead end. Whole game and mode coverage remain unproved.
- Full A1 and A2 Android Chrome workflow evidence, the complete device and mode matrix, all historical save/rollback paths, independent rounds and production smoke remain pending. [R41 campaign record](<D:/hsg-campaign/evidence/refinement-2026-11/desktop-director-progress-d9696d13-41ae-427a-bb9e-a366f45ed43c/report.json>)

## Not Covered

No approved exclusions. Pending work is listed above.

## Manual checklist candidates

- Real iPhone Safari, Android handset performance and heat, and audible-output review remain for the end-of-campaign manual checklist. [Manual-checklist requirement](<C:/Video Game Projects/campaigns/refinement-2026-11/MASTER-PROMPT.md>)
