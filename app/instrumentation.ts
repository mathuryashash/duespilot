// Scheduled PayPal refresh while the server runs (poll fallback when the webhook is down or not registered).
// POLL_INTERVAL_MIN (default 2; 0 disables). Only unsettled invoices are fetched.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const min = Number(process.env.POLL_INTERVAL_MIN ?? 2);
  if (!(min > 0)) return;
  const [{ startPoller }, { refreshInvoices }] = await Promise.all([import('./lib/poller'), import('./lib/server')]);
  startPoller(async () => {
    const r = await refreshInvoices(false);
    if (r.changed.length || r.errors) console.log('[poller]', JSON.stringify({ changed: r.changed, errors: r.errors }));
  }, min * 60_000);
}
