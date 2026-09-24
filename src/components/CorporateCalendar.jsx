'use client';

import React, { useState, useEffect, useMemo } from 'react';

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
    let isMounted = true;
    setLoading(true);
    setError(null);

    const url = `/api/corporate-actions?month=${selectedMonth}&category=${categoryFilter}&search=${encodeURIComponent(searchQuery)}&_t=${Date.now()}`;
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data kalender aksi korporasi');
        return res.json();
      })
      .then(data => {
        if (isMounted) {
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
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Gagal terhubung ke server web');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [selectedMonth, categoryFilter, searchQuery]);

  // Month Navigation Helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const newYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newYearMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const newYearMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newYearMonth);
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
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch (e) {
      return selectedMonth;
    }
  }, [selectedMonth]);

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
    <div className="space-y-6">
      {/* ── 1. PAGE HEADER & STATS CARDS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl md:text-3xl">🗓️</span>
              <h1 className="font-black text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight">
                Kalender Aksi Korporasi & Dividen BEI
              </h1>
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Real-Time KSEI & BEI
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Jadwal resmi 4 tanggal keramat dividen (Cum Date, Ex Date, DPS, Pembayaran), RUPS, dan musim rilis Laporan Keuangan seluruh saham BEI.
            </p>
          </div>

          <button
            onClick={handleResetToday}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>🎯</span>
            <span>Hari Ini</span>
          </button>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stat 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Agenda ({formattedMonthLabel})</span>
            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {calendarData.summary?.totalEvents || 0} Agenda
            </div>
            <span className="text-[10px] text-slate-400">Dividen & Keterbukaan</span>
          </div>

          {/* Stat 2 */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-xs text-emerald-800 dark:text-emerald-400 block font-medium">Bisa Beli (Cum Date Aktif)</span>
            <div className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {calendarData.summary?.cumActiveCount || 0} Saham
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Masih berhak dividen</span>
          </div>

          {/* Stat 3 */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60">
            <span className="text-xs text-blue-800 dark:text-blue-400 block font-medium">Dana Dividen Pasar ({formattedMonthLabel})</span>
            <div className="text-lg md:text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 truncate">
              {formatTotalDana(calendarData.summary?.totalDividendPayout)}
            </div>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Perkiraan dana cair</span>
          </div>

          {/* Stat 4 */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60">
            <span className="text-xs text-purple-800 dark:text-purple-400 block font-medium">Dividend Yield Tertinggi</span>
            <div className="text-lg md:text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
              {calendarData.summary?.highestYieldStock ? (
                <span>{calendarData.summary.highestYieldStock.ticker} ({calendarData.summary.highestYieldStock.yieldPercent}%)</span>
              ) : '-'}
            </div>
            <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">
              {calendarData.summary?.highestYieldStock ? formatRupiah(calendarData.summary.highestYieldStock.dps) : 'Periode ini'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. CONTROLS & FILTER BAR ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors font-bold text-sm border border-slate-200 dark:border-slate-700"
              title="Bulan Sebelumnya"
            >
              ◀
            </button>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {calendarData.monthsAvailable?.length > 0 ? (
                calendarData.monthsAvailable.map((m) => {
                  const [y, mon] = m.split('-').map(Number);
                  const d = new Date(y, mon - 1, 1);
                  const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {label}
                    </option>
                  );
                })
              ) : (
                <option value={selectedMonth}>{formattedMonthLabel}</option>
              )}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors font-bold text-sm border border-slate-200 dark:border-slate-700"
              title="Bulan Berikutnya"
            >
              ▶
            </button>

            <span className="text-xs text-slate-400 font-mono hidden sm:inline ml-1">
              ({calendarData.events?.length || 0} event)
            </span>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Agenda
            </button>
            <button
              onClick={() => setCategoryFilter('DIVIDEND')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                categoryFilter === 'DIVIDEND'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>💰</span> Dividen Tunai
            </button>
            <button
              onClick={() => setCategoryFilter('DISCLOSURE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                categoryFilter === 'DISCLOSURE'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📰</span> Pengumuman BEI
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
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Tampilan Kalender Grid"
              >
                📅 Grid
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Tampilan Daftar Timeline"
              >
                📋 Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Legend Bar: Legenda Warna & Ikon Tanggal Aksi Korporasi */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🎨</span> Legenda Warna & Ikon Jadwal BEI & KSEI
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Petunjuk 4 Tanggal Keramat Dividen & Keterbukaan</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {/* Cum Date */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px] truncate">🛒 CUM DATE</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Batas akhir beli dividen</span>
              </div>
            </div>

            {/* Ex Date */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[11px] truncate">📉 EX DATE</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Tanpa hak dividen (Drop)</span>
              </div>
            </div>

            {/* Recording Date / DPS */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-[11px] truncate">📜 RECORDING</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Pencatatan DPT KSEI</span>
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-blue-600 dark:text-blue-400 block text-[11px] truncate">💳 PAYMENT</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Pencairan dana ke RDN</span>
              </div>
            </div>

            {/* BEI Disclosure / News */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 col-span-2 sm:col-span-1">
              <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0 shadow-2xs" />
              <div className="min-w-0">
                <span className="font-bold text-slate-600 dark:text-slate-300 block text-[11px] truncate">📰 KETERBUKAAN</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Pengumuman RUPS / BEI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT VIEWS ─────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Mengambil data kalender aksi korporasi untuk <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formattedMonthLabel}</span>...
          </p>
          <p className="text-xs text-slate-400 mt-1">Memproses jadwal dividen KSEI, Cum Date, Ex Date, & Keterbukaan BEI</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
          <button
            onClick={handleResetToday}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
          >
            Reset Kalender
          </button>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: GRID CALENDAR VIEW */}
          {viewMode === 'grid' && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 md:p-5 shadow-sm space-y-3">
              {/* Day Headers (Senin - Minggu) */}
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div className="text-rose-500 dark:text-rose-400">Sab</div>
                <div className="text-rose-500 dark:text-rose-400">Ming</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((cell, idx) => {
                  if (cell.isPadding) {
                    return (
                      <div
                        key={`pad-${idx}`}
                        className="min-h-[90px] md:min-h-[110px] rounded-xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
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
                      className={`min-h-[90px] md:min-h-[110px] p-1.5 md:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                        cell.isToday
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm ring-2 ring-indigo-400/40'
                          : eventsCount > 0
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-slate-600 cursor-pointer'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 opacity-60'
                      }`}
                    >
                      {/* Cell Header (Day Number + Event Indicator) */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs md:text-sm font-bold font-mono ${
                            cell.isToday
                              ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {eventsCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                            {eventsCount}
                          </span>
                        )}
                      </div>

                      {/* Event Badges List */}
                      <div className="space-y-1 my-1">
                        {displayEvents.map((ev) => {
                          const badgeColorClass =
                            ev.dateType === 'CUM_DATE'
                              ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                              : ev.dateType === 'EX_DATE'
                              ? 'bg-amber-500 text-white dark:bg-amber-600'
                              : ev.dateType === 'PAYMENT_DATE'
                              ? 'bg-blue-500 text-white dark:bg-blue-600'
                              : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';

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
                          <div className="text-[9px] font-bold text-center text-indigo-600 dark:text-indigo-400">
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
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm hover:border-indigo-400/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xl">{ev.icon || '📌'}</span>
                        <button
                          onClick={() => handleNavigateTicker(ev.ticker)}
                          className="text-base font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {ev.ticker}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{ev.name}</span>
                        
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                          ev.dateType === 'CUM_DATE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                          ev.dateType === 'EX_DATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                          ev.dateType === 'PAYMENT_DATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                        }`}>
                          {ev.dateType === 'CUM_DATE' ? 'CUM DATE 🛒' : ev.dateType === 'EX_DATE' ? 'EX DATE 📉' : ev.dateType === 'PAYMENT_DATE' ? 'PAYMENT 💳' : 'BEI NEWS 📰'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {ev.eventTitle}
                      </h4>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {ev.subText || ev.actionMessage}
                      </p>

                      {/* 4 Date Summary Stepper if Dividend */}
                      {ev.category === 'DIVIDEND' && (
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1 flex-wrap">
                          <span>Cum: <strong className="text-slate-900 dark:text-slate-200">{ev.cumDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>Ex: <strong className="text-slate-900 dark:text-slate-200">{ev.exDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>DPS Date: <strong className="text-slate-900 dark:text-slate-200">{ev.recordingDateFormatted || '-'}</strong></span>
                          <span>•</span>
                          <span>Payment: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{ev.paymentDateFormatted || '-'}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <div className="text-left md:text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {ev.dps > 0 ? formatRupiah(ev.dps) : `Rp ${ev.price?.toLocaleString('id-ID')}`}
                        </div>
                        {ev.yieldPercent > 0 && (
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            Yield: {ev.yieldPercent}%
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleNavigateTicker(ev.ticker)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 self-start md:self-auto"
                      >
                        <span>Lihat Detail Ticker</span>
                        <span>🧭</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                  <span className="text-3xl block mb-2">🏷️</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Tidak Ada Agenda Aksi Korporasi pada Filter Ini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Agenda Aksi Korporasi: {selectedDayEvents.date}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDayEvents.events.length} Aksi Korporasi Terdeteksi
                </p>
              </div>

              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayEvents.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ev.icon || '📌'}</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">{ev.ticker}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[180px]">{ev.name}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {ev.eventTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {ev.subText}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDayEvents(null);
                      handleNavigateTicker(ev.ticker);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0"
                  >
                    Buka Explorer 🧭
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
