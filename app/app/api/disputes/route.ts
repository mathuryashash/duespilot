import { NextResponse } from 'next/server';
import { disputes } from '@/lib/server';

// Read-only: list_disputes via the allowlisted toolkit. No accept/refund anywhere in the product.
export async function GET() {
  try { return NextResponse.json({ disputes: await disputes() }); }
  catch (e) { return NextResponse.json({ disputes: [], error: (e as Error).message.slice(0, 200) }); }
}
