import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runNegotiation } from '@/lib/server';

const Body = z.object({ clientId: z.string().max(20), totalUsd: z.number().positive().max(10_000), project: z.string().min(1).max(80), personaId: z.string().max(8).optional(), apMode: z.enum(['llm', 'rules']).optional() });

export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: 'bad input' }, { status: 400 });
  try { return NextResponse.json(await runNegotiation(b.data.clientId, b.data.totalUsd, b.data.project, b.data.personaId || undefined, b.data.apMode ?? (process.env.AP_AGENT === 'rules' ? 'rules' : 'llm'))); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}

// Persona list for the Negotiate tab (labels + whether any deal exists; policies stay server-side).
export async function GET() {
  const { personas } = await import('@/lib/personas');
  return NextResponse.json(personas().map((p) => ({ id: p.id, client_id: p.client_id, label: p.label, feasible: p.feasible })));
}
