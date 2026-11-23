// Pure worker-sharding planner for run.mjs (keeps perf.test.mjs and serial:true tests strictly serial).
export function clampWorkers(n) {
  const v = parseInt(n, 10);
  return Number.isFinite(v) && v > 0 ? Math.min(8, v) : 1;
}

export function planWorkers(tests, workers = 1) {
  const maxWorkers = clampWorkers(workers);
  if (maxWorkers <= 1) return { maxWorkers: 1, parallelGroups: [], serialItems: tests.map((test, index) => ({ test, index })) };
  const byFile = new Map();
  const serialItems = [];
  tests.forEach((test, index) => {
    if (test.serial || test.file === 'perf.test.mjs') {
      serialItems.push({ test, index });
      return;
    }
    const key = test.file || ('__test_' + index);
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push({ test, index });
  });
  return { maxWorkers, parallelGroups: [...byFile.values()], serialItems };
}
