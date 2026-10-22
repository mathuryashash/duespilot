import { NextResponse } from 'next/server';
import { resetDemo } from '@/lib/server';

// "Reset demo" button: clears demo activity; tracked PayPal sandbox invoices stay (they are real objects).
export async function POST() {
  await resetDemo(false);
  return NextResponse.json({ ok: true });
}
