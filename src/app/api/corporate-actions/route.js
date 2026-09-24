import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildCorporateActionsTimeline, parseDividendScheduleItem } from '@/lib/corporateActionEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/corporate-actions
 * 
 * Query Parameters:
 * - month: 'YYYY-MM' (e.g., '2026-09') or 'all' or 'upcoming'
 * - category: 'all' | 'DIVIDEND' | 'RUPS' | 'EARNINGS' | 'DISCLOSURE'
 * - search: ticker or company name search query
 * - status: 'all' | 'upcoming' | 'active' | 'completed'
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month') || ''; // 'YYYY-MM' or 'all' or 'upcoming'
    const categoryParam = (searchParams.get('category') || 'all').toUpperCase();
    const searchParam = (searchParams.get('search') || '').trim().toLowerCase();
    const statusParam = (searchParams.get('status') || 'all').toLowerCase();

    // Fetch all stocks with corporate action fields
    const stocks = await prisma.stockData.findMany({
      where: {
        isDelisted: false,
        sector: { not: null }
      },
      select: {
        ticker: true,
        name: true,
        price: true,
        changePercent: true,
        sector: true,
        subSector: true,
        dividendHistory: true,
        insiderTrades: true,
        fundamentals: true
      }
    });

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonthStr = monthParam === 'upcoming' ? currentYearMonth : (monthParam || currentYearMonth);

    const allEvents = [];
    const monthsAvailableSet = new Set();

    for (const stock of stocks) {
      const ticker = stock.ticker;
      const name = stock.name;
      const price = Number(stock.price || 0);
      const changePercent = Number(stock.changePercent || 0);
      const sector = stock.sector || '';

      // Skip if search filter is specified and doesn't match ticker or name
      if (searchParam && !ticker.toLowerCase().includes(searchParam) && !name.toLowerCase().includes(searchParam)) {
        continue;
      }

      const dividendHistory = stock.dividendHistory ? JSON.parse(stock.dividendHistory) : [];
      const fundamentals = stock.fundamentals ? JSON.parse(stock.fundamentals) : {};
      const insiderTrades = stock.insiderTrades ? JSON.parse(stock.insiderTrades) : [];

      // 1. Process Dividends
      const idxDivs = Array.isArray(dividendHistory) ? dividendHistory : [];
      for (let i = 0; i < idxDivs.length; i++) {
        const parsed = parseDividendScheduleItem(idxDivs[i], fundamentals, price);
        if (!parsed) continue;

        // Determine critical dates
        const cumDate = parsed.cumDate ? parsed.cumDate.slice(0, 10) : null;
        const exDate = parsed.exDate ? parsed.exDate.slice(0, 10) : null;
        const recordingDate = parsed.recordingDate ? parsed.recordingDate.slice(0, 10) : null;
        const paymentDate = parsed.paymentDate ? parsed.paymentDate.slice(0, 10) : null;

        // Collect available YYYY-MM
        if (cumDate) monthsAvailableSet.add(cumDate.slice(0, 7));
        if (paymentDate) monthsAvailableSet.add(paymentDate.slice(0, 7));

        const baseEventData = {
          ticker,
          name,
          price,
          changePercent,
          sector,
          category: 'DIVIDEND',
          dps: parsed.dps,
          yieldPercent: parsed.yieldPercent,
          fiscalYear: parsed.fiscalYear,
          dividendType: parsed.type,
          totalAmount: parsed.totalAmount,
          cumDate,
          cumDateFormatted: parsed.cumDateFormatted,
          exDate,
          exDateFormatted: parsed.exDateFormatted,
          recordingDate,
          recordingDateFormatted: parsed.recordingDateFormatted,
          paymentDate,
          paymentDateFormatted: parsed.paymentDateFormatted,
          stage: parsed.stage,
          status: parsed.status,
          badgeColor: parsed.badgeColor,
          countdown: parsed.countdown,
          actionMessage: parsed.actionMessage
        };

        // Create individual date events so they appear on their respective calendar days
        if (cumDate) {
          allEvents.push({
            id: `div-cum-${ticker}-${cumDate}-${i}`,
            ...baseEventData,
            date: cumDate,
            dateType: 'CUM_DATE',
            eventTitle: `Cum Dividen ${parsed.type} Rp ${parsed.dps > 0 ? parsed.dps.toLocaleString('id-ID') : ''}`,
            icon: '🛒',
            subText: 'Batas akhir beli saham untuk berhak dividen'
          });
        }

        if (exDate && exDate !== cumDate) {
          allEvents.push({
            id: `div-ex-${ticker}-${exDate}-${i}`,
            ...baseEventData,
            date: exDate,
            dateType: 'EX_DATE',
            eventTitle: `Ex Dividen ${parsed.type}`,
            icon: '📉',
            subText: 'Perdagangan tanpa hak dividen'
          });
        }

        if (paymentDate && paymentDate !== cumDate && paymentDate !== exDate) {
          allEvents.push({
            id: `div-pay-${ticker}-${paymentDate}-${i}`,
            ...baseEventData,
            date: paymentDate,
            dateType: 'PAYMENT_DATE',
            eventTitle: `Pencairan Dividen Kas ${parsed.dps > 0 ? `Rp ${parsed.dps.toLocaleString('id-ID')}` : ''}`,
            icon: '💳',
            subText: 'Dana dividen masuk otomatis ke RDN'
          });
        }
      }

      // 2. Process Corporate Announcements (Insider / Corporate Disclosures)
      const newsList = Array.isArray(insiderTrades) ? insiderTrades : [];
      for (let j = 0; j < newsList.length; j++) {
        const item = newsList[j];
        if (!item || !item.date) continue;
        const dateStr = item.date.slice(0, 10);
        monthsAvailableSet.add(dateStr.slice(0, 7));

        allEvents.push({
          id: `news-${ticker}-${dateStr}-${j}`,
          ticker,
          name,
          price,
          changePercent,
          sector,
          category: 'DISCLOSURE',
          date: dateStr,
          dateType: 'EVENT_DATE',
          eventTitle: item.title || 'Keterbukaan Informasi BEI',
          icon: '📰',
          subText: 'Pengumuman Resmi Keterbukaan Informasi BEI',
          url: item.url || null,
          status: 'Pengumuman Resmi',
          badgeColor: 'slate'
        });
      }
    }

    // Sort months available descending
    const monthsAvailable = [...monthsAvailableSet]
      .filter(m => m && m.length === 7)
      .sort((a, b) => b.localeCompare(a));

    // Filter events by month param if specified (unless 'all')
    let filteredEvents = allEvents;
    if (targetMonthStr && targetMonthStr !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.date && e.date.startsWith(targetMonthStr));
    }

    // Filter by category param
    if (categoryParam !== 'ALL') {
      filteredEvents = filteredEvents.filter(e => e.category === categoryParam);
    }

    // Filter by status param
    if (statusParam === 'upcoming') {
      filteredEvents = filteredEvents.filter(e => e.stage === 'CUM_ACTIVE' || e.stage === 'WAITING_PAYMENT' || e.date >= currentYearMonth);
    } else if (statusParam === 'active') {
      filteredEvents = filteredEvents.filter(e => e.stage === 'CUM_ACTIVE');
    }

    // Sort events chronologically (ascending for month view, or descending for list)
    filteredEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Compute summary metrics
    const cumActiveEvents = filteredEvents.filter(e => e.dateType === 'CUM_DATE' && e.stage === 'CUM_ACTIVE');
    const dividendEvents = filteredEvents.filter(e => e.category === 'DIVIDEND' && e.dateType === 'CUM_DATE');
    
    let totalDividendPayout = 0;
    let highestYieldStock = null;
    let maxYield = 0;

    for (const d of dividendEvents) {
      if (d.totalAmount > 0) {
        totalDividendPayout += d.totalAmount;
      }
      if (d.yieldPercent > maxYield) {
        maxYield = d.yieldPercent;
        highestYieldStock = {
          ticker: d.ticker,
          name: d.name,
          yieldPercent: d.yieldPercent,
          dps: d.dps,
          cumDateFormatted: d.cumDateFormatted
        };
      }
    }

    return NextResponse.json({
      success: true,
      month: targetMonthStr,
      totalEvents: filteredEvents.length,
      summary: {
        totalEvents: filteredEvents.length,
        cumActiveCount: cumActiveEvents.length,
        dividendEventsCount: dividendEvents.length,
        totalDividendPayout,
        highestYieldStock
      },
      monthsAvailable,
      events: filteredEvents
    });
  } catch (error) {
    console.error('[API /api/corporate-actions Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses data kalender aksi korporasi' },
      { status: 500 }
    );
  }
}
