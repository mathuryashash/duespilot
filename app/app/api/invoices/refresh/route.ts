import { NextResponse } from 'next/server';
import { refreshInvoices } from '@/lib/server';

export async function POST() {
  try { return NextResponse.json(await refreshInvoices()); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 502 }); }
}
