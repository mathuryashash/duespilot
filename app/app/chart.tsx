'use client';
// AG Charts expected-cash chart (client-only; imported via next/dynamic from widgets.tsx).
import { AgCharts } from 'ag-charts-react';
import { AllCommunityModule as ChartsModule, ModuleRegistry as ChartsRegistry, type AgCartesianChartOptions } from 'ag-charts-community';

ChartsRegistry.registerModules([ChartsModule]);

type Week = { start: string; expected_net: number; byClient: Record<string, number> };
export default function CashChart({ f }: { f: { weeks: Week[]; later_net: number; at_risk_usd: number; gross_usd: number; fees_usd: number; invoices: number } }) {
  const clients = [...new Set(f.weeks.flatMap((w) => Object.keys(w.byClient)))];
  const data = f.weeks.map((w) => ({ week: `wk of ${w.start.slice(5)}`, ...Object.fromEntries(clients.map((c) => [c, w.byClient[c] ?? 0])) }));
  const options: AgCartesianChartOptions = {
    data, height: 280,
    title: { text: 'Expected cash in, next 6 weeks (USD, after PayPal fee)' },
    subtitle: { text: `${f.invoices} open invoices · each weighted by the client's on-time record` },
    series: clients.map((c) => ({ type: 'bar' as const, xKey: 'week', yKey: c, yName: c, stacked: true })),
    axes: { x: { type: 'category', position: 'bottom' }, y: { type: 'number', position: 'left', label: { formatter: ({ value }: { value: number }) => `$${Math.round(value).toLocaleString()}` } } },
    legend: { position: 'bottom' },
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, margin: '8px 0', flexWrap: 'wrap' }}>
        {[['Open, gross', f.gross_usd], ['PayPal fees (4.4% + $0.30 each)', -f.fees_usd], ['At risk (history says may not pay)', -f.at_risk_usd], ['Expected later than 6 weeks', f.later_net]].map(([k, v]) => (
          <div key={String(k)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', minWidth: 170 }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{k}</div><div style={{ fontWeight: 700 }}>{Number(v) < 0 ? '−' : ''}${Math.abs(Number(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>))}
      </div>
      <AgCharts options={options} />
      <p style={{ fontSize: 12, color: '#6b7280' }}>Estimate. Weight = reliability score (clamped 5-98%); expected date = due date + the client&apos;s average days late; an invoice already past that is pushed to next week and its weight halves for every 30 days past. Fee is PayPal India&apos;s published rate for receiving international payments; FX markup and GST on the fee are not included.</p>
    </div>
  );
}
