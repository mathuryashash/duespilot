import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runIntake } from '@/lib/server';
import { MAX_BRIEF_CHARS } from '@/lib/intake';

const Body = z.object({ brief: z.string().min(5).max(MAX_BRIEF_CHARS) });

export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: `brief must be 5..${MAX_BRIEF_CHARS} chars` }, { status: 400 });
  try { return NextResponse.json(await runIntake(b.data.brief)); }
  catch (e) { return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 500 }); }
}
