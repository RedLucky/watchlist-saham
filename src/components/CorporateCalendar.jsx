'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageShell, PageHeader } from './ui/PageShell';

/**
 * Bloomberg CA: Full Corporate Actions Calendar Page
 * 
 * Features:
 * 1. Monthly Calendar Grid View (7-column layout with day event pills)
 * 2. Chronological Timeline List View (grouped by date)
 * 3. Dividend Matrix Table View
 * 4. Interactive Day Modal (details for events on a specific date)
 * 5. One-Click Navigation to Stock Explorer with ticker selection
 */
export default function CorporateCalendar({ user = null, onSelectTicker = null }) {
  // Date State
  const now = new Date();
  const initialYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(initialYearMonth);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'DIVIDEND' | 'DISCLOSURE'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarData, setCalendarData] = useState({
    events: [],
    summary: {},
    monthsAvailable: []
  });

  // Selected Day Modal State
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { date: '2026-09-15', events: [...] }

  // Fetch Calendar Data
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = `/api/corporate-actions?month=${selectedMonth}&category=${categoryFilter}&search=${encodeURIComponent(searchQuery)}`;
    
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data kalender aksi korporasi');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setCalendarData({
            events: data.events || [],
            summary: data.summary || {},
            monthsAvailable: data.monthsAvailable || []
          });
        } else {
          setError(data.error || 'Terjadi kesalahan saat memproses data kalender');
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Gagal terhubung ke server web');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedMonth, categoryFilter, searchQuery]);

  // Month Navigation Helpers (Functional state update guarantees seamless fast-clicks)
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => {
      const current = prev || initialYearMonth;
      const [year, month] = current.split('-').map(Number);
      if (isNaN(year) || isNaN(month)) return current;
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      const current = prev || initialYearMonth;
      const [year, month] = current.split('-').map(Number);
      if (isNaN(year) || isNaN(month)) return current;
      const nextDate = new Date(year, month, 1);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    });
  };

  const handleResetToday = () => {
    setSelectedMonth(initialYearMonth);
    setSearchQuery('');
    setCategoryFilter('all');
  };

  // Format IDR Helper
  const formatRupiah = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  // Format Large Nominal IDR
  const formatTotalDana = (val) => {
    if (!val || isNaN(val) || val <= 0) return '-';
    const triliun = val / 1e12;
    if (triliun >= 1) return `Rp ${triliun.toFixed(2)} Triliun`;
    const miliar = val / 1e9;
    if (miliar >= 1) return `Rp ${miliar.toFixed(2)} Miliar`;
    return formatRupiah(val);
  };

  // Format Month Display Name (e.g. "September 2026")
  const formattedMonthLabel = useMemo(() => {
    try {
      const [y, m] = (selectedMonth || initialYearMonth).split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch (e) {
      return selectedMonth;
    }
  }, [selectedMonth, initialYearMonth]);

  // Dynamic Month Options (always includes selectedMonth, all monthsAvailable, and a rolling window of +/- 24 months)
  const monthOptions = useMemo(() => {
    const set = new Set(calendarData.monthsAvailable || []);
    if (selectedMonth) set.add(selectedMonth);
    if (initialYearMonth) set.add(initialYearMonth);

    const [currY, currM] = (selectedMonth || initialYearMonth).split('-').map(Number);
    if (!isNaN(currY) && !isNaN(currM)) {
      for (let offset = -24; offset <= 12; offset++) {
        const d = new Date(currY, currM - 1 + offset, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(ym);
      }
    }

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [calendarData.monthsAvailable, selectedMonth, initialYearMonth]);

  // Group events by day date for Grid View
  const eventsByDayMap = useMemo(() => {
    const map = {};
    const events = calendarData.events || [];
    for (const ev of events) {
      if (!ev.date) continue;
      const dayKey = ev.date;
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(ev);
    }
    return map;
  }, [calendarData.events]);

  // Generate Calendar Grid Days
  const calendarDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    const totalDays = lastDayOfMonth.getDate();
    // Monday as 0, Sunday as 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek < 0) startingDayOfWeek = 6;

    const days = [];
    // Leading empty padding days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ isPadding: true, dayNumber: null });
    }
    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dayEvents = eventsByDayMap[dateStr] || [];

      days.push({
        isPadding: false,
        dayNumber: d,
        dateStr,
        isToday,
        events: dayEvents
      });
    }

    return days;
  }, [selectedMonth, eventsByDayMap, now]);

  // Handle Action to open Ticker in Stock Explorer
  const handleNavigateTicker = (ticker) => {
    if (onSelectTicker && typeof onSelectTicker === 'function') {
      onSelectTicker(ticker);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Kalender Aksi Korporasi"
        subtitle="Jadwal resmi 4 tanggal keramat dividen, RUPS, dan musim rilis laporan keuangan seluruh saham BEI"
        badge={<span className="badge badge-up">KSEI & BEI</span>}
        actions={(
          <button onClick={handleResetToday} className="btn-secondary">
            <span aria-hidden="true">◎</span>
            <span>Hari Ini</span>
          </button>
        )}
      />

      {/* ── 1. SUMMARY STATS ──────────────────────────────────────────────── */}
      <div className="card p-4 md:p-5 space-y-4">

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stat 1 */}
          <div className="p-3.5 rounded-sm bg-sunken border border-line ">
            <span className="text-xs text-muted block font-medium">Total Agenda ({formattedMonthLabel})</span>
            <div className="text-lg md:text-xl font-black text-ink font-mono mt-0.5">
              {calendarData.summary?.totalEvents || 0} Agenda
            </div>
            <span className="text-[10px] text-muted">Dividen & Keterbukaan</span>
          </div>

          {/* Stat 2 */}
          <div className="p-3.5 rounded-sm bg-up-soft border border-up ">
            <span className="text-xs text-up block font-medium">Bisa Beli (Cum Date Aktif)</span>
            <div className="text-lg md:text-xl font-black text-up font-mono mt-0.5">
              {calendarData.summary?.cumActiveCount || 0} Saham
            </div>
            <span className="text-[10px] text-up ">Masih berhak dividen</span>
          </div>

          {/* Stat 3 */}
          <div className="p-3.5 rounded-sm bg-sunken border border-line ">
            <span className="text-xs text-ink block font-medium">Dana Dividen Pasar ({formattedMonthLabel})</span>
            <div className="text-lg md:text-xl font-black text-ink font-mono mt-0.5 truncate">
              {formatTotalDana(calendarData.summary?.totalDividendPayout)}
            </div>
            <span className="text-[10px] text-ink ">Perkiraan dana cair</span>
          </div>

          {/* Stat 4 */}
          <div className="p-3.5 rounded-sm bg-sunken border border-line ">
            <span className="text-xs text-ink block font-medium">Dividend Yield Tertinggi</span>
            <div className="text-lg md:text-xl font-black text-ink font-mono mt-0.5">
              {calendarData.summary?.highestYieldStock ? (
                <span>{calendarData.summary.highestYieldStock.ticker} ({calendarData.summary.highestYieldStock.yieldPercent}%)</span>
              ) : '-'}
            </div>
            <span className="text-[10px] text-ink ">
              {calendarData.summary?.highestYieldStock ? formatRupiah(calendarData.summary.highestYieldStock.dps) : 'Periode ini'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. CONTROLS & FILTER BAR ───────────────────────────────────────── */}
      <div className="bg-surface border border-line rounded-md p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-sm bg-sunken text-ink hover:bg-sunken transition-colors font-bold text-sm border border-line "
              title="Bulan Sebelumnya"
            >
              ◀
            </button>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 bg-sunken border border-line rounded-sm font-bold text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer shadow-xs"
            >
              {monthOptions.map((m) => {
                const [y, mon] = m.split('-').map(Number);
                const d = new Date(y, mon - 1, 1);
                const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                const isCurrent = m === initialYearMonth;
                return (
                  <option key={m} value={m}>
                    {label} {isCurrent ? '• (Bulan Ini)' : ''}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-sm bg-sunken text-ink hover:bg-sunken transition-colors font-bold text-sm border border-line "
              title="Bulan Berikutnya"
            >
              ▶
            </button>

            <span className="text-xs text-muted font-mono hidden sm:inline ml-1">
              ({calendarData.events?.length || 0} event)
            </span>
            {loading && (
              <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-accent border-t-transparent ml-1" title="Sinkronisasi data..."></span>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="tabs" role="group" aria-label="Filter kategori agenda">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className="tab"
            >
              Semua Agenda
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('DIVIDEND')}
              className={`tab ${categoryFilter === 'DIVIDEND' ? 'text-up' : ''}`}
            >
              <span aria-hidden="true">¤</span> Dividen Tunai
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('DISCLOSURE')}
              className={`tab ${categoryFilter === 'DISCLOSURE' ? 'text-ink' : ''}`}
            >
              <span aria-hidden="true">▤</span> Pengumuman BEI
            </button>
          </div>

          {/* View Mode & Search */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ticker / nama..."
                className="w-full pl-8 pr-3 py-1.5 bg-sunken border border-line rounded-sm text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted text-xs">
                ⌕
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-ink text-xs"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="tabs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className="tab"
                title="Tampilan Kalender Grid"
              >
                <span aria-hidden="true">▦</span> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                aria-pressed={viewMode === 'timeline'}
                className="tab"
                title="Tampilan Daftar Timeline"
              >
                <span aria-hidden="true">▤</span> Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Legend Bar: Legenda Warna & Ikon Tanggal Aksi Korporasi */}
        <div className="pt-3 border-t border-line ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>✦</span> Legenda Warna & Ikon Jadwal BEI & KSEI
            </span>
            <span className="text-[10px] text-muted font-medium">Petunjuk 4 Tanggal Keramat Dividen & Keterbukaan</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {/* Cum Date */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sunken border border-line ">
              <span className="w-3 h-3 rounded-full bg-up shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-up block text-[11px] truncate">▣ CUM DATE</span>
                <span className="text-[10px] text-muted block truncate">Batas akhir beli dividen</span>
              </div>
            </div>

            {/* Ex Date */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sunken border border-line ">
              <span className="w-3 h-3 rounded-full bg-warn shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-warn block text-[11px] truncate">↘ EX DATE</span>
                <span className="text-[10px] text-muted block truncate">Tanpa hak dividen (Drop)</span>
              </div>
            </div>

            {/* Recording Date / DPS */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sunken border border-line ">
              <span className="w-3 h-3 rounded-full bg-accent shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-ink block text-[11px] truncate">▤ RECORDING</span>
                <span className="text-[10px] text-muted block truncate">Pencatatan DPT KSEI</span>
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sunken border border-line ">
              <span className="w-3 h-3 rounded-full bg-accent shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-ink block text-[11px] truncate">▤ PAYMENT</span>
                <span className="text-[10px] text-muted block truncate">Pencairan dana ke RDN</span>
              </div>
            </div>

            {/* BEI Disclosure / News */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-sunken border border-line col-span-2 sm:col-span-1">
              <span className="w-3 h-3 rounded-full bg-muted shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-muted block text-[11px] truncate">▤ KETERBUKAAN</span>
                <span className="text-[10px] text-muted block truncate">Pengumuman RUPS / BEI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT VIEWS ─────────────────────────────────────────── */}
      {loading && !calendarData.events?.length && !calendarData.monthsAvailable?.length ? (
        <div className="bg-surface border border-line rounded-md p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-accent border-t-transparent mb-4"></div>
          <p className="text-sm font-semibold text-muted ">
            Mengambil data kalender aksi korporasi untuk <span className="text-ink font-bold">{formattedMonthLabel}</span>...
          </p>
          <p className="text-xs text-muted mt-1">Memproses jadwal dividen KSEI, Cum Date, Ex Date, & Keterbukaan BEI</p>
        </div>
      ) : error ? (
        <div className="bg-down-soft border border-down rounded-md p-6 text-center">
          <p className="text-down font-semibold">{error}</p>
          <button
            onClick={handleResetToday}
            className="mt-3 px-4 py-1.5 bg-down text-on-accent text-xs font-bold rounded-sm hover:bg-down"
          >
            Reset Kalender
          </button>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: GRID CALENDAR VIEW */}
          {viewMode === 'grid' && (
            <div className={`bg-surface border border-line rounded-md p-3 md:p-5 shadow-sm space-y-3 transition-opacity duration-200 ${loading ? 'opacity-70' : 'opacity-100'}`}>
              {/* Month Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line ">
                <div className="flex items-center gap-2">
                  <span className="text-base md:text-lg font-black text-ink flex items-center gap-1.5">
                    <span>▦</span>
                    <span>{formattedMonthLabel}</span>
                  </span>
                  <span className="text-xs text-muted font-mono">
                    ({calendarData.events?.length || 0} Agenda)
                  </span>
                  {loading && (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-accent border-t-transparent ml-1" title="Sinkronisasi data..."></span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={handlePrevMonth}
                    className="px-2.5 py-1 text-xs font-bold rounded-sm bg-sunken hover:bg-sunken text-ink transition-colors"
                  >
                    ◀ Bulan Lalu
                  </button>
                  <button
                    onClick={handleResetToday}
                    className="px-2.5 py-1 text-xs font-bold rounded-sm bg-sunken hover:bg-sunken text-ink transition-colors"
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="px-2.5 py-1 text-xs font-bold rounded-sm bg-sunken hover:bg-sunken text-ink transition-colors"
                  >
                    Bulan Depan ▶
                  </button>
                </div>
              </div>

              {/* Notice if month has no scheduled corporate events */}
              {calendarData.events?.length === 0 && (
                <div className="py-2.5 px-3.5 rounded-sm bg-sunken border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted ">
                  <span className="flex items-center gap-1.5 font-medium text-ink ">
                    <span>ⓘ</span> Belum ada agenda aksi korporasi atau dividen yang dijadwalkan untuk <strong>{formattedMonthLabel}</strong>.
                  </span>
                  <span className="text-[11px] text-muted">Gunakan tombol Bulan Depan ▶ atau pilih bulan lain dari dropdown.</span>
                </div>
              )}

              {/* Day Headers (Senin - Minggu) */}
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold text-muted border-b border-line pb-2">
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div className="text-down ">Sab</div>
                <div className="text-down ">Ming</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((cell, idx) => {
                  if (cell.isPadding) {
                    return (
                      <div
                        key={`pad-${idx}`}
                        className="min-h-[90px] md:min-h-[110px] rounded-sm bg-sunken border border-transparent"
                      />
                    );
                  }

                  const eventsCount = cell.events.length;
                  const displayEvents = cell.events.slice(0, 3);
                  const overflowCount = eventsCount - 3;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => {
                        if (eventsCount > 0) {
                          setSelectedDayEvents({ date: cell.dateStr, events: cell.events });
                        }
                      }}
                      className={`min-h-[90px] md:min-h-[110px] p-1.5 md:p-2 rounded-sm border transition-all flex flex-col justify-between ${
 cell.isToday
 ? 'bg-sunken border-accent shadow-sm ring-2 ring-accent'
 : eventsCount > 0
 ? 'bg-sunken border-line hover:border-line cursor-pointer'
 : 'bg-surface border-line opacity-60'
 }`}
                    >
                      {/* Cell Header (Day Number + Event Indicator) */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs md:text-sm font-bold font-mono ${
 cell.isToday
 ? 'w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center text-xs'
 : 'text-ink '
 }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {eventsCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sunken text-ink font-mono">
                            {eventsCount}
                          </span>
                        )}
                      </div>

                      {/* Event Badges List */}
                      <div className="space-y-1 my-1">
                        {displayEvents.map((ev) => {
                          const badgeColorClass =
                            ev.dateType === 'CUM_DATE'
                              ? 'bg-up text-on-accent '
                              : ev.dateType === 'EX_DATE'
                              ? 'bg-warn text-on-accent '
                              : ev.dateType === 'PAYMENT_DATE'
                              ? 'bg-accent text-on-accent '
                              : 'bg-sunken text-ink  ';

                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center justify-between gap-1 shadow-2xs ${badgeColorClass}`}
                              title={`${ev.ticker}: ${ev.eventTitle}`}
                            >
                              <span className="truncate">{ev.icon} {ev.ticker}</span>
                              {ev.dps > 0 && <span className="font-mono text-[9px] font-black opacity-90 hidden md:inline">Rp{ev.dps}</span>}
                            </div>
                          );
                        })}

                        {overflowCount > 0 && (
                          <div className="text-[9px] font-bold text-center text-ink ">
                            +{overflowCount} agenda lagi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TIMELINE LIST VIEW */}
          {viewMode === 'timeline' && (
            <div className="space-y-4">
              {calendarData.events?.length > 0 ? (
                calendarData.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-surface border border-line rounded-md p-4 md:p-5 shadow-sm hover:border-accent transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xl">{ev.icon || '•'}</span>
                        <button
                          onClick={() => handleNavigateTicker(ev.ticker)}
                          className="text-base font-black text-ink hover:text-ink transition-colors"
                        >
                          {ev.ticker}
                        </button>
                        <span className="text-xs text-muted line-clamp-1">{ev.name}</span>
                        
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
 ev.dateType === 'CUM_DATE' ? 'bg-up-soft text-up border border-up' :
 ev.dateType === 'EX_DATE' ? 'bg-warn-soft text-warn border border-warn' :
 ev.dateType === 'PAYMENT_DATE' ? 'bg-sunken text-ink border border-line' :
 'bg-sunken text-ink border border-line'
 }`}>
                          {ev.dateType === 'CUM_DATE' ? 'CUM DATE ▣' : ev.dateType === 'EX_DATE' ? 'EX DATE ↘' : ev.dateType === 'PAYMENT_DATE' ? 'PAYMENT ▤' : 'BEI NEWS ▤'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-ink ">
                        {ev.eventTitle}
                      </h4>
                      
                      <p className="text-xs text-muted ">
                        {ev.subText || ev.actionMessage}
                      </p>

                      {/* 4 Date Summary Stepper if Dividend */}
                      {ev.category === 'DIVIDEND' && (
                        <div className="flex items-center gap-3 text-[11px] font-mono text-muted pt-1 flex-wrap">
                          <span>Cum: <strong className="text-ink ">{ev.cumDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>Ex: <strong className="text-ink ">{ev.exDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>DPS Date: <strong className="text-ink ">{ev.recordingDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>Payment: <strong className="text-up font-bold">{ev.paymentDateFormatted || '-'}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-line flex-shrink-0">
                      <div className="text-left md:text-right">
                        <div className="text-sm font-black text-ink font-mono">
                          {ev.dps > 0 ? formatRupiah(ev.dps) : `Rp ${ev.price?.toLocaleString('id-ID')}`}
                        </div>
                        {ev.yieldPercent > 0 && (
                          <div className="text-xs font-bold text-up font-mono">
                            Yield: {ev.yieldPercent}%
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleNavigateTicker(ev.ticker)}
                        className="px-3 py-1.5 text-xs font-bold rounded-sm bg-sunken text-ink hover:bg-sunken transition-colors border border-line flex items-center gap-1 self-start md:self-auto"
                      >
                        <span>Lihat Detail Ticker</span>
                        <span>◎</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-surface border border-line rounded-md p-12 text-center shadow-sm">
                  <span className="text-3xl block mb-2">•</span>
                  <h3 className="font-bold text-sm text-ink ">
                    Tidak Ada Agenda Aksi Korporasi pada Filter Ini
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Coba ganti bulan pencarian atau reset filter kategori.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── 4. INTERACTIVE DAY MODAL ──────────────────────────────────────── */}
      {selectedDayEvents && (
        <div className="modal-backdrop">
          <div
            className="modal-panel sm:max-w-xl p-4 sm:p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-modal-title"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 id="day-modal-title" className="font-bold text-ink text-base">
                  Agenda Aksi Korporasi: {selectedDayEvents.date}
                </h3>
                <p className="text-xs text-muted ">
                  {selectedDayEvents.events.length} Aksi Korporasi Terdeteksi
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                aria-label="Tutup"
                className="btn-icon shrink-0"
              >
                <span aria-hidden="true" className="font-mono">✕</span>
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayEvents.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-sm bg-sunken border border-line flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ev.icon || '•'}</span>
                      <span className="font-black text-sm text-ink ">{ev.ticker}</span>
                      <span className="text-xs text-muted truncate max-w-[180px]">{ev.name}</span>
                    </div>
                    <div className="text-xs font-bold text-ink mt-1">
                      {ev.eventTitle}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {ev.subText}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDayEvents(null);
                      handleNavigateTicker(ev.ticker);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-sm bg-accent text-on-accent hover:bg-accent flex-shrink-0"
                  >
                    Buka Explorer ◎
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
