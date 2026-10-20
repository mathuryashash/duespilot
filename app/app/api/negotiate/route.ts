import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runNegotiation } from '@/lib/server';

const Body = z.object({ clientId: z.string().max(20), totalUsd: z.number().positive().max(10_000), project: z.string().min(1).max(80) });

export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: 'bad input' }, { status: 400 });
  try { return NextResponse.json(await runNegotiation(b.data.clientId, b.data.totalUsd, b.data.project)); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}
