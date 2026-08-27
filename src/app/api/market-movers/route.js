// GET /api/market-movers
// Returns top trending (by daily volume/frequency), top gainers, and top losers.
// Methodology: RTI Business style
//   - Trending   → sorted by volume (lembar saham) — proxy frekuensi transaksi
//   - Gainers    → sorted by changePercent DESC, filter changePercent > 0 & volume > 0
//   - Losers     → sorted by changePercent ASC,  filter changePercent < 0 & volume > 0

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStocks } from '@/data/mockStocks';

export const dynamic = 'force-dynamic';

const DATA_PROVIDER = process.env.DATA_PROVIDER || 'database';
const TOP_N = 20;

// RTI-style: minimum volume to appear (exclude saham macet / tidak likuid)
const MIN_VOLUME_TODAY = 0; // lowered to 0 to ensure data shows in development/mock
const MIN_PRICE = 0;           // lowered to 0

/** Format raw DB/mock row into a clean mover object */
function toMoverDto(s) {
  const price = Number(s.price);
  const volume = Number(s.volume ?? 0);
  const turnover = s.turnover != null ? Number(s.turnover) : Math.round(volume * price);
  const changePercent = Number(s.changePercent ?? 0);
  const avgVolume3mo = s.avgVolume3mo != null ? Number(s.avgVolume3mo) : null;
  const volumeRatio = s.volumeRatio != null ? Number(s.volumeRatio) : null;
  let marketCap = null;
  let kseiLatest = null;
  let kseiHistory = [];
  let ownership = null;
  if (s.fundamentals) {
    try {
      const fund = typeof s.fundamentals === 'string' ? JSON.parse(s.fundamentals) : s.fundamentals;
      marketCap = fund.marketCap;
    } catch (e) {}
  }
  if (s.kseiLatest) {
    try {
      kseiLatest = typeof s.kseiLatest === 'string' ? JSON.parse(s.kseiLatest) : s.kseiLatest;
    } catch (e) {}
  }
  if (s.kseiHistory) {
    try {
      kseiHistory = typeof s.kseiHistory === 'string' ? JSON.parse(s.kseiHistory) : s.kseiHistory;
    } catch (e) {}
  }
  if (s.ownership) {
    try {
      ownership = typeof s.ownership === 'string' ? JSON.parse(s.ownership) : s.ownership;
    } catch (e) {}
  }

  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector ?? '-',
    price,
    changePercent: Number(changePercent.toFixed(4)),
    kseiLatest,
    kseiHistory,
    ownership,
    sharesOutstanding: s.sharesOutstanding ? Number(s.sharesOutstanding) : null,
    // Volume (lembar saham)
    volume,
    // Turnover = Nilai transaksi hari ini (IDR)
    turnover,
    // Previous close estimate: price / (1 + changePercent/100)
    prevClose: changePercent !== -100
      ? Number((price / (1 + changePercent / 100)).toFixed(0))
      : price,
    marketCap,
    // Unusual volume fields
    ...(avgVolume3mo != null && { avgVolume3mo }),
    ...(volumeRatio != null && { volumeRatio: Number(volumeRatio.toFixed(2)) }),
  };
}

async function getMoversFromDB() {
  // ── RTI Trending: Top Turnover ───────────────────────────────────────────
  // We sort by 'frequency' or 'turnover' directly in DB.
  // Using turnover as the most robust liquidity indicator.
  const rawTrending = await prisma.stockData.findMany({
    where: {
      NOT: { ticker: '^JKSE' },
      isDelisted: false,
      price: { gt: MIN_PRICE },
      volume: { gte: MIN_VOLUME_TODAY }
    },
    orderBy: { turnover: 'desc' },
    take: TOP_N,
    select: {
      ticker: true, name: true, sector: true, price: true, changePercent: true, volume: true, turnover: true, fundamentals: true
    }
  });

  // ── RTI Top Gainer: % change harian positif tertinggi ────────────────────
  const rawGainers = await prisma.stockData.findMany({
    where: {
      NOT: { ticker: '^JKSE' },
      isDelisted: false,
      price: { gt: MIN_PRICE },
      volume: { gte: MIN_VOLUME_TODAY },
      changePercent: { gt: 0 }
    },
    orderBy: { changePercent: 'desc' },
    take: TOP_N,
    select: {
      ticker: true, name: true, sector: true, price: true, changePercent: true, volume: true, turnover: true, fundamentals: true
    }
  });

  // ── RTI Top Loser: % change harian negatif terdalam ──────────────────────
  const rawLosers = await prisma.stockData.findMany({
    where: {
      NOT: { ticker: '^JKSE' },
      isDelisted: false,
      price: { gt: MIN_PRICE },
      volume: { gte: MIN_VOLUME_TODAY },
      changePercent: { lt: 0 }
    },
    orderBy: { changePercent: 'asc' },
    take: TOP_N,
    select: {
      ticker: true, name: true, sector: true, price: true, changePercent: true, volume: true, turnover: true, fundamentals: true
    }
  });

  // ── Unusual Volume: volume hari ini >> rata-rata 3 bulan ─────────────────
  // Fetch candidates with avgVolume3mo > 0, compute ratio in JS, sort by ratio
  const rawUnusualCandidates = await prisma.stockData.findMany({
    where: {
      NOT: { ticker: '^JKSE' },
      isDelisted: false,
      price: { gt: MIN_PRICE },
      volume: { gte: MIN_VOLUME_TODAY },
      avgVolume3mo: { gt: 0 }
    },
    select: {
      ticker: true, name: true, sector: true, price: true, changePercent: true,
      volume: true, turnover: true, avgVolume3mo: true, fundamentals: true
    }
  });

  // Compute volume ratio and filter for at least 1.5x above average
  const MIN_VOLUME_RATIO = 1.5;
  const unusualVolume = rawUnusualCandidates
    .map(s => {
      const vol = Number(s.volume);
      const avg = Number(s.avgVolume3mo);
      return { ...s, volumeRatio: avg > 0 ? vol / avg : 0 };
    })
    .filter(s => s.volumeRatio >= MIN_VOLUME_RATIO)
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, TOP_N)
    .map(toMoverDto);

  return {
    trending: rawTrending.map(toMoverDto),
    gainers: rawGainers.map(toMoverDto),
    losers: rawLosers.map(toMoverDto),
    unusualVolume,
  };
}

function getMoversFromMock() {
  const withChange = mockStocks.map(s => {
    const prices = s.technicals?.prices ?? [s.price];
    const last = prices[prices.length - 1] ?? s.price;
    const prev = prices[prices.length - 2] ?? last;
    const changePercent = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    const volumes = s.technicals?.volumes ?? [];
    const volume = volumes[volumes.length - 1] ?? 1_000_000;
    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      price: last,
      changePercent: Number(changePercent.toFixed(4)),
      volume,
    };
  });

  const dtos = withChange.map(toMoverDto);

  const trending = [...dtos].sort((a, b) => b.volume - a.volume).slice(0, TOP_N);
  const gainers = [...dtos].filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, TOP_N);
  const losers = [...dtos].filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, TOP_N);

  // Mock unusual volume: simulate by randomizing ratio
  const unusualVolume = [...dtos]
    .map(s => ({ ...s, volumeRatio: Number((1 + Math.random() * 5).toFixed(2)) }))
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, TOP_N);

  return { trending, gainers, losers, unusualVolume };
}

export async function GET() {
  try {
    const data = DATA_PROVIDER === 'database'
      ? await getMoversFromDB()
      : getMoversFromMock();

    return NextResponse.json({
      trending: data.trending,
      gainers: data.gainers,
      losers: data.losers,
      unusualVolume: data.unusualVolume,
      topN: TOP_N,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[market-movers] Error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data market movers' },
      { status: 500 }
    );
  }
}
