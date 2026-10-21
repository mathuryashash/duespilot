// Disputes: read-only, summarise only (BLOCKER 2d). Uses the allowlisted toolkit tool list_disputes; no accept/refund anywhere.
type Tools = Record<string, { execute?: (args: any, opts?: any) => PromiseLike<unknown> }>;

export async function listDisputes(tools: Tools) {
  const raw = await tools.list_disputes.execute!({ page_size: 10 }, { toolCallId: 'ui', messages: [] });
  const j = typeof raw === 'string' ? JSON.parse(raw) : (raw as any);
  if (j?.error) throw new Error(String(j.error.message ?? 'list_disputes failed').slice(0, 200));
  return ((j?.items ?? []) as any[]).map((x) => ({
    id: x.dispute_id, reason: x.reason, status: x.status, stage: x.dispute_life_cycle_stage,
    amount_usd: Number(x.dispute_amount?.value ?? 0), created: x.create_time,
  }));
}
