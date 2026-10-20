// Deterministic PayPal REST client (server only). Pattern after the paypaldev boilerplate (token cache, 401 re-mint),
// re-typed. Write calls are only reachable from executors run by approve().
import { config, type Config } from './config';
import type { Draft } from './draft';

let tok: { v: string; exp: number } | undefined;
async function token(c: Config) {
  if (tok && Date.now() < tok.exp) return tok.v;
  const r = await fetch(`${c.paypalBase}/v1/oauth2/token`, {
    method: 'POST', body: 'grant_type=client_credentials',
    headers: { Authorization: 'Basic ' + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!r.ok) throw new Error(`PayPal OAuth ${r.status}`);
  const j = await r.json();
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return tok.v;
}

export async function pp(method: string, p: string, body?: unknown, retried = false): Promise<any> {
  const c = config();
  const r = await fetch(c.paypalBase + p, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: `Bearer ${await token(c)}`, 'Content-Type': 'application/json' },
  });
  if (r.status === 401 && !retried) { tok = undefined; return pp(method, p, body, true); }
  const text = await r.text();
  const j = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(`PayPal ${method} ${p.split('?')[0]} -> ${r.status} ${j.name ?? ''} ${j.details?.[0]?.issue ?? j.message ?? ''}`.trim());
  return j;
}

export type InvoiceView = { id: string; status: string; amount_usd: number; number?: string; pay_link?: string; early_pay_rule?: 'none' | 'ok' | 'failed' };
export const view = (g: any): InvoiceView => ({
  id: g.id, status: g.status, amount_usd: Number(g.amount?.value ?? 0),
  number: g.detail?.invoice_number, pay_link: g.detail?.metadata?.recipient_view_url,
});
export const getInvoice = async (id: string) => view(await pp('GET', `/v2/invoicing/invoices/${encodeURIComponent(id)}`));

type Call = (method: string, p: string, body?: unknown) => Promise<any>;

// create -> (best-effort) early-pay conditional rule -> send. The sandbox returned 500 on every conditional-rules
// body we tried (20 Oct), so the discount is also stated in terms_and_conditions and a rule failure never blocks send.
export async function createAndSend(d: Draft, call: Call = pp): Promise<InvoiceView> {
  const terms = d.discount_pct > 0 && d.discount_until ? `Early-pay: ${d.discount_pct}% off if paid by ${d.discount_until}.` : undefined;
  const created = await call('POST', '/v2/invoicing/invoices', {
    detail: { currency_code: 'USD', invoice_date: d.invoice_date, note: d.note, terms_and_conditions: terms,
      payment_term: d.due_date === d.invoice_date ? { term_type: 'DUE_ON_RECEIPT' } : { due_date: d.due_date } },
    invoicer: { name: { given_name: 'DuesPilot', surname: 'Freelancer' } },
    primary_recipients: [{ billing_info: { email_address: d.recipient_email } }],
    items: [{ name: d.item_name, quantity: '1', unit_amount: { currency_code: 'USD', value: d.amount_usd.toFixed(2) } }],
  });
  const id = String(created.href ?? created.id).split('/').pop()!;
  let early_pay_rule: InvoiceView['early_pay_rule'] = 'none';
  if (terms) {
    early_pay_rule = await call('POST', `/v2/invoicing/invoices/${id}/conditional-rules`, { rules: [{
      conditional_rule_type: 'EARLY_PAYMENT_DISCOUNT', conditional_rule_value_type: 'PERCENT', conditional_rule_value: String(d.discount_pct),
      rule_expiry_terms: { rule_expiry_condition: 'SPECIFIC_DATE', condition_rule_end_date: d.discount_until } }] }).then(() => 'ok' as const, () => 'failed' as const);
  }
  await call('POST', `/v2/invoicing/invoices/${id}/send`, { send_to_invoicer: false, send_to_recipient: true });
  return { ...view(await call('GET', `/v2/invoicing/invoices/${id}`)), early_pay_rule };
}

// Webhook postback verification (BLOCKER 5). Needs PAYPAL_WEBHOOK_ID of a registered webhook.
export async function verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): Promise<boolean> {
  const c = config();
  if (!c.webhookId) return false;
  const h = (k: string) => headers[k] ?? headers[k.toLowerCase()];
  const r = await pp('POST', '/v1/notifications/verify-webhook-signature', {
    auth_algo: h('paypal-auth-algo'), cert_url: h('paypal-cert-url'), transmission_id: h('paypal-transmission-id'),
    transmission_sig: h('paypal-transmission-sig'), transmission_time: h('paypal-transmission-time'),
    webhook_id: c.webhookId, webhook_event: JSON.parse(rawBody),
  }).catch(() => ({}));
  return r.verification_status === 'SUCCESS';
}

// Live read-only context for the client table: recent sandbox invoices + 30 d transaction count.
export async function liveSummary() {
  const end = new Date(); const start = new Date(end.getTime() - 30 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 19) + '-0000';
  const [inv, tx] = await Promise.all([
    pp('GET', '/v2/invoicing/invoices?page=1&page_size=20&total_required=true'),
    pp('GET', `/v1/reporting/transactions?start_date=${iso(start)}&end_date=${iso(end)}&fields=transaction_info&page_size=100`).catch((e) => ({ error: String(e.message) })),
  ]);
  return {
    invoices_total: inv.total_items ?? inv.items?.length ?? 0,
    invoices: (inv.items ?? []).map((g: any) => ({ id: g.id, status: g.status, amount_usd: Number(g.amount?.value ?? 0), recipient: g.primary_recipients?.[0]?.billing_info?.email_address })),
    transactions_30d: tx.error ? null : (tx.transaction_details ?? []).length,
    transactions_error: tx.error ?? null,
  };
}
