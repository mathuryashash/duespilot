// Scheduled refresh while the server runs: no overlap (next run is scheduled after the current one finishes).
export function startPoller(run: () => Promise<unknown>, everyMs: number, onError: (e: unknown) => void = (e) => console.error('[poller]', String((e as Error)?.message ?? e).slice(0, 200))) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const tick = async () => {
    try { await run(); } catch (e) { onError(e); }
    if (!stopped) timer = setTimeout(tick, everyMs);
  };
  timer = setTimeout(tick, everyMs);
  timer.unref?.();
  return () => { stopped = true; clearTimeout(timer); };
}
