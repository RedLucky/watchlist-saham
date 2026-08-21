import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { budget, stocks } = await req.json();

    const numericBudget = Number(budget);
    if (!numericBudget || numericBudget <= 0 || !stocks || !Array.isArray(stocks)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Prepare stocks with calculated lot cost and return score
    let processedStocks = stocks.map(st => {
      const yieldPct = Math.max(0, Number(st.yield || 0));
      const growthPct = Math.max(0, Number(st.growth || 0));
      const totalReturnPct = yieldPct + growthPct;
      const lotCost = Number(st.price || 0) * 100;
      
      return {
        ...st,
        lotCost,
        totalReturnPct: totalReturnPct > 0 ? totalReturnPct : 5,
        lotsToBuy: 0,
        allocatedBudget: 0
      };
    }).filter(st => st.lotCost > 0);

    if (processedStocks.length === 0) {
      return NextResponse.json({ success: true, optimalLots: {}, remainingBudget: numericBudget });
    }

    // Intelligent Proportional Allocation:
    // Guarantee a minimum diversification floor per stock (e.g. 10-15%)
    // and distribute the floating capital proportionally based on expected return (yield + growth).
    const N = processedStocks.length;
    const baseFloorPct = Math.min(0.12, 0.80 / N);
    const availableFloatingPct = Math.max(0, 1.0 - (baseFloorPct * N));

    const totalScore = processedStocks.reduce((sum, s) => sum + s.totalReturnPct, 0);

    const targets = processedStocks.map(s => {
      const floatShare = totalScore > 0 
        ? (s.totalReturnPct / totalScore) * availableFloatingPct 
        : availableFloatingPct / N;
      const targetWeight = baseFloorPct + floatShare;
      return {
        stock: s,
        targetBudget: numericBudget * targetWeight
      };
    });

    let remainingBudget = numericBudget;

    // Phase 1: Allocate integer lots closest to target budget
    for (const t of targets) {
      const lots = Math.floor(t.targetBudget / t.stock.lotCost);
      t.stock.lotsToBuy = lots;
      t.stock.allocatedBudget = lots * t.stock.lotCost;
      remainingBudget -= t.stock.allocatedBudget;
    }

    // Phase 2: Exhaust leftover cash by buying extra lots of highest return stocks
    const sortedByReturn = [...processedStocks].sort((a, b) => b.totalReturnPct - a.totalReturnPct);
    let madePurchase = true;
    while (madePurchase && remainingBudget > 0) {
      madePurchase = false;
      for (const st of sortedByReturn) {
        if (remainingBudget >= st.lotCost) {
          st.lotsToBuy += 1;
          st.allocatedBudget += st.lotCost;
          remainingBudget -= st.lotCost;
          madePurchase = true;
        }
      }
    }

    // Build the final map
    const optimalLots = {};
    processedStocks.forEach(st => {
      optimalLots[st.ticker] = st.lotsToBuy;
    });

    return NextResponse.json({
      success: true,
      optimalLots,
      remainingBudget
    });
  } catch (error) {
    console.error('Optimization API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
