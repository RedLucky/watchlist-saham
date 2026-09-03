import { NextResponse } from 'next/server';
import { DatabaseProvider } from '@/lib/providers/DatabaseProvider';

export async function GET() {
  try {
    const provider = new DatabaseProvider();
    const stocks = await provider.getStocks();
    return NextResponse.json({ success: true, count: stocks.length, stocks: stocks.map(s => s.ticker) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
