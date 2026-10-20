import { NextResponse } from 'next/server';
import { approveSend } from '@/lib/server';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const r = await approveSend(id, String(body?.hash ?? ''));
  return NextResponse.json(r, { status: r.status });
}
