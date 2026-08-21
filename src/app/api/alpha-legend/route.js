import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/dataService';
import { evaluateAlphaLegends } from '@/lib/alphaLegendEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: pick the first finite numeric value from candidates, or fallback
function safeNum(...args) {
  for (const v of args) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return args[args.length - 1]; // last arg is the fallback
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const formula = searchParams.get('formula');

    // Fetch active stocks using active DataProvider
    const provider = getActiveProvider();
    const rawStocks = await provider.getStocks();

    // Standardize stock attributes for calculation from raw provider format
    let stocksToProcess = (rawStocks || []).map(s => {
      const fund = s.fundamentals || {};
      const perVal = typeof fund.per === 'number' ? fund.per : (typeof s.pe === 'number' ? s.pe : (typeof s.per === 'number' ? s.per : 0));
      const pbvVal = typeof fund.pbv === 'number' ? fund.pbv : (typeof s.pbv === 'number' ? s.pbv : 0);
      const roeVal = typeof fund.roe === 'number' ? fund.roe : (typeof s.roe === 'number' ? s.roe : 0);
      const derVal = typeof fund.der === 'number' ? fund.der : (typeof s.der === 'number' ? s.der : 0);
      const divYieldVal = typeof fund.dividendYield === 'number' ? fund.dividendYield : (typeof s.divYield === 'number' ? s.divYield : (typeof s.dividendYield === 'number' ? s.dividendYield : 0));
      const revGrowthVal = typeof fund.revenueGrowth === 'number' ? fund.revenueGrowth : (typeof s.revenueGrowth === 'number' ? s.revenueGrowth : (typeof s.salesGrowth === 'number' ? s.salesGrowth : 0));
      let profitGrowthVal = typeof fund.profitGrowth === 'number' ? fund.profitGrowth : (typeof s.profitGrowth === 'number' ? s.profitGrowth : (typeof s.epsGrowth === 'number' ? s.epsGrowth : null));

      // Calculate profit growth if missing but netProfit array exists
      if (profitGrowthVal === null) {
        if (Array.isArray(fund.netProfit) && fund.netProfit.length >= 2) {
          const profits = fund.netProfit;
          if (profits.length >= 3) {
            const base1 = Math.max(Math.abs(profits[0]), 1);
            const base2 = Math.max(Math.abs(profits[1]), 1);
            const g1 = (profits[1] - profits[0]) / base1;
            const g2 = (profits[2] - profits[1]) / base2;
            profitGrowthVal = ((g1 + g2) / 2) * 100;
          } else {
            const base = Math.max(Math.abs(profits[0]), 1);
            profitGrowthVal = ((profits[1] - profits[0]) / base) * 100;
          }
        } else {
          profitGrowthVal = 0;
        }
      }

      return {
        symbol: s.ticker || s.symbol,
        name: s.name || s.ticker,
        sector: s.sector || '',
        subSector: s.subSector || null,
        industry: s.industry || s.sector || '',
        price: s.price || 0,
        pe: perVal,
        per: perVal,
        pbv: pbvVal,
        roe: roeVal,
        der: derVal,
        currentRatio: safeNum(fund.currentRatio, s.currentRatio, null),
        divYield: divYieldVal,
        revenueGrowth: revGrowthVal,
        profitGrowth: profitGrowthVal,
        fcf: safeNum(fund.freeCashflow, s.fcf, 0),
        peg: profitGrowthVal > 0 ? Number((perVal / profitGrowthVal).toFixed(2)) : 0,
        piotroskiFScore: safeNum(fund.piotroskiFScore, s.piotroskiFScore, 5),
        altmanZScore: safeNum(fund.altmanZScore, s.altmanZScore, 2.5),
        psr: safeNum(fund.psr, s.psr, null),
        shareholders: s.shareholders || [],
        smartMoney: s.smartMoney || null
      };
    });

    // Filter by sector if provided
    if (sector && sector !== 'all') {
      stocksToProcess = stocksToProcess.filter(s => 
        (s.sector && s.sector.toLowerCase().includes(sector.toLowerCase())) ||
        (s.industry && s.industry.toLowerCase().includes(sector.toLowerCase()))
      );
    }

    const evaluatedStocks = evaluateAlphaLegends(stocksToProcess);

    // Filter by formula if requested
    let finalStocks = evaluatedStocks;
    if (formula && formula !== 'all') {
      finalStocks = evaluatedStocks.filter(s => s.passedFormulaKeys.includes(formula));
    }

    return NextResponse.json({
      success: true,
      total: finalStocks.length,
      stocks: finalStocks
    });
  } catch (error) {
    console.error('Error in /api/alpha-legend:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses data Alpha Legend' },
      { status: 500 }
    );
  }
}
