import { NextResponse } from 'next/server';
import { cashForecast } from '@/lib/server';

export const dynamic = 'force-dynamic'; // reads live state; never prerender at build

export async function GET() {
  try { return NextResponse.json(await cashForecast()); }
  catch (e) { return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 500 }); }
}
