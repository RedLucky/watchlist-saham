'use client';

import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';
import { analyzeCandlestickPatterns } from '@/lib/candlestickPatterns';

export default function StockChart({ ticker }) {
  const chartContainerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showMarkersOnChart, setShowMarkersOnChart] = useState(true);
  const [selectedRange, setSelectedRange] = useState('5Y');

  // References to dynamic chart series and lines
  const chartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const rawChartDataRef = useRef([]);
  const dynamicPriceLinesRef = useRef([]);

  useEffect(() => {
    let chart;
    let removeResizeListener = null;

    const fetchChartData = async () => {
      try {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/chart?ticker=${ticker}&years=5`);
        if (!res.ok) throw new Error('Failed to load chart data');
        const { data, ma20, ma50, analytics: chartAnalytics } = await res.json();
        
        if (data.length === 0) throw new Error('No data available');

        rawChartDataRef.current = data;

        // Analyze Candlestick Patterns from data
        const detectedPatterns = analyzeCandlestickPatterns(data);
        setPatternAnalysis(detectedPatterns);

        // Theme aware styling
        const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

        // Initialize chart component
        chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 360,
          layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: textColor,
          },
          grid: {
            vertLines: { color: gridColor },
            horzLines: { color: gridColor },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
          },
          rightPriceScale: {
            borderColor: borderColor,
          },
          timeScale: {
            borderColor: borderColor,
            timeVisible: true,
          },
          handleScroll: isMobile
            ? {
                mouseWheel: false,
                pressedMouseMove: true,
                horzTouchDrag: false,
                vertTouchDrag: false,
              }
            : true,
          handleScale: isMobile
            ? {
                axisPressedMouseMove: false,
                mouseWheel: false,
                pinch: false,
              }
            : true,
        });

        chartInstanceRef.current = chart;

        // Candlesticks
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        candlestickSeries.setData(data);
        candlestickSeriesRef.current = candlestickSeries;

        // Draw Candlestick Pattern Markers directly on chart!
        if (detectedPatterns.allDetected?.length > 0) {
          const markers = detectedPatterns.allDetected.map(p => ({
            time: p.time,
            position: p.direction === 'bullish' ? 'belowBar' : 'aboveBar',
            color: p.direction === 'bullish' ? '#10b981' : p.direction === 'bearish' ? '#ef4444' : '#f59e0b',
            shape: p.direction === 'bullish' ? 'arrowUp' : p.direction === 'bearish' ? 'arrowDown' : 'circle',
            text: `${p.emoji} ${p.shortName || p.name.split(' ')[0]}`,
            size: 1.5,
          }));
          createSeriesMarkers(candlestickSeries, markers);
        }

        // Volume
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });
        
        const volumeData = data.map(d => ({
          time: d.time,
          value: d.value,
          color: d.close > d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        }));
        volumeSeries.setData(volumeData);

        // Moving Averages
        const ma20Series = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1,
          title: 'MA20'
        });
        ma20Series.setData(ma20);

        const ma50Series = chart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1,
          title: 'MA50'
        });
        ma50Series.setData(ma50);

        // Support / Resistance / Boundaries
        if (chartAnalytics?.support) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.support,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Support',
          });
        }
        if (chartAnalytics?.supportZone?.low) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.supportZone.low,
            color: 'rgba(16,185,129,0.55)',
            lineWidth: 1,
            lineStyle: 4,
            axisLabelVisible: false,
            title: 'S-Zone Low',
          });
        }
        if (chartAnalytics?.supportZone?.high) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.supportZone.high,
            color: 'rgba(16,185,129,0.55)',
            lineWidth: 1,
            lineStyle: 4,
            axisLabelVisible: false,
            title: 'S-Zone High',
          });
        }
        if (chartAnalytics?.resistance) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.resistance,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Resistance',
          });
        }
        if (chartAnalytics?.resistanceZone?.low) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.resistanceZone.low,
            color: 'rgba(239,68,68,0.55)',
            lineWidth: 1,
            lineStyle: 4,
            axisLabelVisible: false,
            title: 'R-Zone Low',
          });
        }
        if (chartAnalytics?.resistanceZone?.high) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.resistanceZone.high,
            color: 'rgba(239,68,68,0.55)',
            lineWidth: 1,
            lineStyle: 4,
            axisLabelVisible: false,
            title: 'R-Zone High',
          });
        }

        // Fit Content
        chart.timeScale().fitContent();
        setAnalytics(chartAnalytics || null);
        
        setLoading(false);

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
        };

        window.addEventListener('resize', handleResize);
        removeResizeListener = () => window.removeEventListener('resize', handleResize);

      } catch (err) {
        setLoading(false);
        setError(err.message);
        setAnalytics(null);
        setPatternAnalysis(null);
      }
    };

    fetchChartData();

    return () => {
      if (removeResizeListener) {
        removeResizeListener();
      }
      if (chart) {
        chart.remove();
      }
    };
  }, [ticker]);

  // Function to draw or clear Entry/SL/TP levels of a selected pattern
  const handleDrawPatternLevels = (pattern) => {
    if (!candlestickSeriesRef.current || !pattern) return;

    // Remove previous dynamic lines
    dynamicPriceLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current.removePriceLine(line);
      } catch (e) {
        // ignore
      }
    });
    dynamicPriceLinesRef.current = [];

    // Draw Entry / Exit Line
    if (pattern.entryPrice) {
      const entryLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.entryPrice,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: pattern.direction === 'bearish' ? `🚪 Exit (${pattern.shortName})` : `🎯 Entry (${pattern.shortName})`,
      });
      dynamicPriceLinesRef.current.push(entryLine);
    }

    // Draw Stop Loss Line
    if (pattern.stopLossPrice) {
      const slLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.stopLossPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: pattern.direction === 'bearish' ? '⚠️ Cut Loss Darurat' : '🛡️ Stop Loss',
      });
      dynamicPriceLinesRef.current.push(slLine);
    }

    // Draw Take Profit / Downside Target Line
    if (pattern.takeProfitPrice) {
      const isBearish = pattern.direction === 'bearish';
      const tpLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.takeProfitPrice,
        color: isBearish ? '#f59e0b' : '#10b981',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: isBearish ? '📉 Target Penurunan (Support)' : '🚀 Target Take Profit',
      });
      dynamicPriceLinesRef.current.push(tpLine);
    }

    setShowPatternModal(false);
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    if (!chartInstanceRef.current || !rawChartDataRef.current?.length) return;
    
    const chartData = rawChartDataRef.current;
    if (range === '5Y' || range === 'ALL') {
      chartInstanceRef.current.timeScale().fitContent();
      return;
    }

    const lastItem = chartData[chartData.length - 1];
    const lastDate = new Date(lastItem.time);
    const fromDate = new Date(lastDate);

    if (range === '1M') fromDate.setMonth(fromDate.getMonth() - 1);
    else if (range === '3M') fromDate.setMonth(fromDate.getMonth() - 3);
    else if (range === '6M') fromDate.setMonth(fromDate.getMonth() - 6);
    else if (range === '1Y') fromDate.setFullYear(fromDate.getFullYear() - 1);
    else if (range === '3Y') fromDate.setFullYear(fromDate.getFullYear() - 3);

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = lastDate.toISOString().split('T')[0];

    try {
      chartInstanceRef.current.timeScale().setVisibleRange({
        from: fromStr,
        to: toStr,
      });
    } catch (e) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  const currentPattern = patternAnalysis?.currentPattern;

  return (
    <div className="w-full relative rounded-xl overflow-hidden glass border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1321]">
      {/* ── TOP TOOLBAR, TIMEFRAME SELECTOR & PATTERN BUTTON ───────────── */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/90 dark:bg-white/[0.02]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>📊</span> Grafik TradingView — {ticker} (5 Tahun)
            </h3>
            {currentPattern && (
              <span
                onClick={() => setShowPatternModal(true)}
                className={`cursor-pointer inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full transition-all hover:scale-105 shadow-sm ${
                  currentPattern.direction === 'bullish'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40'
                    : currentPattern.direction === 'bearish'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40'
                }`}
              >
                <span>{currentPattern.emoji}</span>
                <span>Pola: {currentPattern.name}</span>
                <span className="font-bold">({currentPattern.direction === 'bullish' ? '▲ Potensi Naik' : currentPattern.direction === 'bearish' ? '▼ Potensi Turun' : '⚖️ Netral'})</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] overflow-x-auto whitespace-nowrap pb-0.5">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Up</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Down</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-0.5 bg-[#3b82f6]"></span> MA20</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-0.5 bg-[#a855f7]"></span> MA50</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-0.5 bg-[#10b981]"></span> Support</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/[0.05] font-semibold text-slate-700 dark:text-slate-300"><span className="w-2 h-0.5 bg-[#ef4444]"></span> Resistance</span>
          </div>
        </div>

        {/* TIMEFRAME BUTTONS & CANDLESTICK PATTERN BUTTON */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap flex-shrink-0">
          {/* Timeframe Range Selector (1M, 3M, 6M, 1Y, 3Y, 5Y) */}
          <div className="flex items-center bg-slate-200/90 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-300 dark:border-slate-700/60 shadow-inner">
            {[
              { id: '1M', label: '1B' },
              { id: '3M', label: '3B' },
              { id: '6M', label: '6B' },
              { id: '1Y', label: '1T' },
              { id: '3Y', label: '3T' },
              { id: '5Y', label: '5T' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleRangeChange(r.id)}
                className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
                  selectedRange === r.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/80 dark:hover:bg-slate-700/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPatternModal(true)}
            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-400/60 dark:border-amber-500/40 text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95"
          >
            <span className="text-sm">🕯️</span> Pola Candle
          </button>
        </div>
      </div>
      {analytics && !loading && (
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex gap-2 overflow-x-auto text-[11px] pb-1 snap-x">
            <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[170px] shrink-0 snap-start">
              <span className="text-slate-500 dark:text-slate-400">Arah Trend</span>
              <div className={`font-bold ${
                analytics.trend?.direction === 'up'
                  ? 'text-emerald-500'
                  : analytics.trend?.direction === 'down'
                  ? 'text-rose-500'
                  : 'text-amber-600 dark:text-amber-300'
              }`}>
                {analytics.trend?.label} ({analytics.trend?.confidence ?? 0}%)
              </div>
            </div>
            <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[210px] shrink-0 snap-start">
              <span className="text-slate-500 dark:text-slate-400">Support / Resistance</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {formatPrice(analytics.support)} {' / '} {formatPrice(analytics.resistance)}
              </div>
            </div>
            <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[250px] shrink-0 snap-start">
              <span className="text-slate-500 dark:text-slate-400">Zona S / R</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {formatPrice(analytics.supportZone?.low)}-{formatPrice(analytics.supportZone?.high)} {' / '} {formatPrice(analytics.resistanceZone?.low)}-{formatPrice(analytics.resistanceZone?.high)}
              </div>
            </div>
            <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[200px] shrink-0 snap-start">
              <span className="text-slate-500 dark:text-slate-400">Batas Volatilitas</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {formatPrice(analytics.bounds?.lower)} - {formatPrice(analytics.bounds?.upper)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1a]/50 backdrop-blur-sm">
          <div className="animate-spin w-8 h-8 rounded-full border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1a]/80">
          <p className="text-red-400 text-sm">Gagal memuat grafik: {error}</p>
        </div>
      )}
      
      <div ref={chartContainerRef} className="w-full h-[360px] touch-pan-y"/>

      {/* ── CANDLESTICK PATTERN RECOGNITION MODAL ───────────────────────── */}
      {showPatternModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🕯️</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Analisis Pola Candlestick — {ticker}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pola formasi digambar langsung dengan marker pada candlestick grafik TradingView
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPatternModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Pattern Content */}
            {currentPattern ? (
              <div className="space-y-4">
                {/* Main Detected Pattern Card */}
                <div className={`rounded-2xl p-4 border transition-all ${
                  currentPattern.direction === 'bullish'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/50'
                    : currentPattern.direction === 'bearish'
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500/50'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500/50'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{currentPattern.emoji}</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                          Pola Terdeteksi Terkini ({currentPattern.time})
                        </span>
                        <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                          {currentPattern.name}
                        </h4>
                      </div>
                    </div>

                    <span className={`px-3 py-1 text-xs font-black rounded-xl shadow-sm self-start sm:self-auto ${
                      currentPattern.direction === 'bullish'
                        ? 'bg-emerald-500 text-white'
                        : currentPattern.direction === 'bearish'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {currentPattern.directionLabel}
                    </span>
                  </div>

                  {/* Reliability Meter */}
                  <div className="space-y-1.5 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Tingkat Keandalan Pola:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{currentPattern.reliabilityLevel}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          currentPattern.direction === 'bullish'
                            ? 'bg-emerald-500'
                            : currentPattern.direction === 'bearish'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${currentPattern.reliability}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Market Psychology Breakdown */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span>🧠</span>
                    <span>Psikologi & Aksi Pasar:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentPattern.psychology}
                  </p>
                </div>

                {/* Actionable Trading Guidelines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      📋 Rekomendasi Rencana Trading
                    </h5>
                    {(currentPattern.entryPrice || currentPattern.takeProfitPrice) && (
                      <button
                        onClick={() => handleDrawPatternLevels(currentPattern)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        📈 Gambar Level Entry/SL/TP di Grafik
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Saran Tindakan</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentPattern.action}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{currentPattern.entryLabel || 'Area Entry'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{currentPattern.entryRange}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{currentPattern.slLabel || 'Stop Loss'}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{currentPattern.stopLoss}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{currentPattern.tpLabel || 'Target Take Profit'}</span>
                      <span className={`font-bold ${currentPattern.direction === 'bearish' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {currentPattern.takeProfit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* History of Detected Patterns (Last 30 Days) */}
                {patternAnalysis?.historyPatterns?.length > 1 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      🕒 Riwayat Pola Sebelumnya (Klik untuk gambar level)
                    </h5>
                    <div className="space-y-1.5">
                      {patternAnalysis.historyPatterns.slice(1).map((hist, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDrawPatternLevels(hist)}
                          className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700/40 text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <span>{hist.emoji}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">{hist.name}</span>
                            <span className="text-[10px] text-slate-400">({hist.time})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              hist.direction === 'bullish'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : hist.direction === 'bearish'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {hist.direction === 'bullish' ? '▲ Bullish' : hist.direction === 'bearish' ? '▼ Bearish' : '⚖️ Netral'}
                            </span>
                            <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold">Gambar ➔</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">Memuat analisis pola...</div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPatternModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}
