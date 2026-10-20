'use client';
import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

type S = { clients: any[]; invoices: any[]; pending: any[]; negotiations: Record<string, any>; audit: { at: string; what: string }[]; live: any };

const clientCols: ColDef[] = [
  { field: 'company', flex: 1 }, { field: 'name' }, { field: 'score', headerName: 'Reliability', width: 120, sort: 'desc' },
  { field: 'avg_days_late', headerName: 'Avg days late', width: 130 }, { field: 'invoices', width: 100 },
  { field: 'outstanding_usd', headerName: 'Outstanding $', width: 140, valueFormatter: (p) => '$' + Number(p.value).toFixed(2) },
  { field: 'has_ap_agent', headerName: 'AP agent', width: 110 },
];
const invCols: ColDef[] = [
  { field: 'id', flex: 1 }, { field: 'role', width: 100 }, { field: 'amount_usd', headerName: 'Amount $', width: 120 },
  { field: 'status', width: 120 }, { field: 'updated_at', width: 220 },
  { field: 'pay_link', headerName: 'Payer view', flex: 1, cellRenderer: (p: any) => (p.value ? <a href={p.value} target="_blank" rel="noreferrer">open</a> : '') },
];

export default function Home() {
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [neg, setNeg] = useState<any>(null);
  const [form, setForm] = useState({ clientId: 'haggler', totalUsd: 3200, project: 'Storefront redesign' });

  const load = async (live = false) => setS(await (await fetch('/api/state' + (live ? '?live=1' : ''))).json());
  useEffect(() => { load(true); const t = setInterval(() => load(), 5000); return () => clearInterval(t); }, []);

  async function call(label: string, url: string, body?: unknown) {
    setBusy(label); setErr('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.status);
      return j;
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(''); load(); }
  }

  const open = s?.pending.filter((p) => p.status === 'pending') ?? [];
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1>DuesPilot <small style={{ fontWeight: 400, fontSize: 14 }}>PayPal <b>sandbox</b> demo · client history is SEEDED demo data</small></h1>
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}

      <h2>Clients (seeded history → reliability score)</h2>
      <div style={{ height: 260 }}><AgGridReact rowData={s?.clients ?? []} columnDefs={clientCols} /></div>
      {s?.live && !s.live.error && <p style={{ fontSize: 13 }}>Live sandbox: {s.live.invoices_total} invoices on the merchant account; Transaction Search (30 d): {s.live.transactions_30d ?? 'n/a'} transactions.</p>}

      <h2>Negotiate with the client&apos;s AP agent</h2>
      <form onSubmit={async (e) => { e.preventDefault(); const r = await call('Negotiating (Nemotron)…', '/api/negotiate', form); if (r) setNeg(r); }}>
        <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          {s?.clients.filter((c) => c.has_ap_agent).map((c) => <option key={c.id} value={c.id}>{c.company} (score {c.score})</option>)}
        </select>{' '}
        <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} maxLength={80} />{' '}
        $<input type="number" value={form.totalUsd} min={1} max={10000} onChange={(e) => setForm({ ...form, totalUsd: Number(e.target.value) })} style={{ width: 90 }} />{' '}
        <button disabled={!!busy}>Negotiate</button> {busy && <i>{busy}</i>}
      </form>

      {neg && (
        <section>
          <h3>Transcript (score {neg.score})</h3>
          <ol>{neg.rounds.map((r: any) => (
            <li key={r.round} style={{ marginBottom: 8 }}>
              <b>DuesPilot:</b> {r.offer ? `${r.offer.deposit_pct}% deposit, balance net-${r.offer.balance_net_days}, ${r.offer.early_pay_discount_pct}% off within ${r.offer.early_pay_window_days} d. “${r.offer.message}”` : 'no valid offer'}
              {r.violations.length > 0 && <div style={{ color: 'crimson' }}>Blocked by mandate: {r.violations.join('; ')}</div>}
              {r.ap && <div><b>AP agent:</b> {r.ap.message}</div>}
            </li>))}</ol>
          {!neg.deal && <p>No deal within the mandate.</p>}
        </section>
      )}

      <h2>Pending approval</h2>
      {open.length === 0 && <p>Nothing waiting. Nothing is sent to PayPal without your click.</p>}
      {open.map((p) => (
        <div key={p.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 12 }}>Action {p.id} · hash {p.hash.slice(0, 16)}…</div>
          <table><thead><tr><th>Item</th><th>To</th><th>Amount</th><th>Due</th><th>Early-pay</th></tr></thead><tbody>
            {p.payload.drafts.map((d: any, i: number) => (
              <tr key={i}><td>{d.item_name}</td><td>{d.recipient_email}</td><td>${d.amount_usd.toFixed(2)}</td><td>{d.due_date}</td><td>{d.discount_pct ? `${d.discount_pct}% until ${d.discount_until}` : '—'}</td></tr>))}
          </tbody></table>
          <button disabled={!!busy} onClick={() => call('Creating + sending sandbox invoices…', `/api/actions/${p.id}/approve`, { hash: p.hash })}>Approve &amp; send {p.payload.drafts.length} PayPal invoices</button>
        </div>
      ))}

      <h2>Invoices in PayPal <button disabled={!!busy} onClick={() => call('Re-fetching from PayPal…', '/api/invoices/refresh')}>Refresh from PayPal</button></h2>
      <div style={{ height: 200 }}><AgGridReact rowData={s?.invoices ?? []} columnDefs={invCols} /></div>

      <h2>Audit log</h2>
      <ul style={{ fontSize: 13 }}>{[...(s?.audit ?? [])].reverse().map((a, i) => <li key={i}>{a.at} — {a.what}</li>)}</ul>
    </main>
  );
}
