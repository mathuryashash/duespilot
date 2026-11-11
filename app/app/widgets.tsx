'use client';
// Custom AG Grid cells and the AG Charts expected-cash chart.
import type { ICellRendererParams } from 'ag-grid-community';
import dynamic from 'next/dynamic';

// AG Charts touches browser APIs at import: load it on the client only (prerendering it ran the build out of memory).
export const CashChart = dynamic(() => import('./chart'), { ssr: false, loading: () => <p>Loading chart…</p> });

const PILL: Record<string, [string, string]> = {
  PAID: ['#dcfce7', '#166534'], MARKED_AS_PAID: ['#dcfce7', '#166534'], SENT: ['#dbeafe', '#1e40af'], SCHEDULED: ['#e0e7ff', '#3730a3'],
  UNPAID: ['#fef3c7', '#92400e'], PARTIALLY_PAID: ['#fef3c7', '#92400e'], DRAFT: ['#f3f4f6', '#374151'],
  DISPUTED: ['#fee2e2', '#991b1b'], CANCELLED: ['#f3f4f6', '#6b7280'],
  friendly: ['#dcfce7', '#166534'], firm: ['#fef3c7', '#92400e'], final: ['#fee2e2', '#991b1b'],
};
export const Pill = (p: ICellRendererParams) => {
  if (!p.value) return null;
  const [bg, fg] = PILL[String(p.value)] ?? ['#f3f4f6', '#374151'];
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{String(p.value).replace(/_/g, ' ').toLowerCase()}</span>;
};

// Reliability 0-100 as a bar; under 70 the mandate tightens (40% deposit, net <= 15).
export const ScoreBar = (p: ICellRendererParams) => {
  if (p.value == null) return null;
  const v = Number(p.value);
  const col = v >= 80 ? '#16a34a' : v >= 70 ? '#65a30d' : v >= 50 ? '#d97706' : '#dc2626';
  return (
    <span title={v < 70 ? 'Below 70: stricter terms (40% deposit, balance within 15 days)' : 'Standard terms'} style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%' }}>
      <span style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}><span style={{ display: 'block', width: `${v}%`, height: '100%', background: col }} /></span>
      <b style={{ width: 26, textAlign: 'right', fontSize: 12 }}>{v}</b>
    </span>
  );
};

export const aging = (due: string | null | undefined, today: string) => {
  if (!due) return '';
  const d = Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000);
  return d <= 0 ? 'not due' : d <= 15 ? '1-15 d late' : d <= 30 ? '16-30 d late' : d <= 60 ? '31-60 d late' : '60+ d late';
};
const AGE: Record<string, string> = { 'not due': '#6b7280', '1-15 d late': '#d97706', '16-30 d late': '#ea580c', '31-60 d late': '#dc2626', '60+ d late': '#7f1d1d' };
export const Aging = (p: ICellRendererParams) => (p.value ? <span style={{ color: AGE[p.value] ?? '#111', fontWeight: 600, fontSize: 12 }}>{p.value}</span> : null);

