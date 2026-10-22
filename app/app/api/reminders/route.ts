import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reminderPlan, draftReminder, advanceClock } from '@/lib/server';

export async function GET() { return NextResponse.json(await reminderPlan()); }

// { invoiceId } -> Nemotron drafts the text, creates a pending send_reminder action (nothing sent yet).
// { advanceDays } -> simulated clock (0 resets).
const Body = z.union([z.object({ invoiceId: z.string().max(40) }), z.object({ advanceDays: z.number().int().min(0).max(30) })]);
export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: 'bad input' }, { status: 400 });
  try {
    if ('advanceDays' in b.data) return NextResponse.json({ clock_days: await advanceClock(b.data.advanceDays) });
    return NextResponse.json(await draftReminder(b.data.invoiceId));
  } catch (e) { return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 400 }); }
}
