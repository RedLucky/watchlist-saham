'use client';

import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { analyzeCandlestickPatterns } from '@/lib/candlestickPatterns';

/**
 * Format volume into compact human-readable text (K, M, B)
 */
function formatVolumeCompact(val) {
  if (!Number.isFinite(Number(val)) || Number(val) === 0) return '0';
  const num = Math.abs(Number(val));
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString('id-ID');
}

/**
 * Format standard rupiah price
 */
function formatPrice(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/**
 * Dynamic Multi-Timeframe Candlestick Aggregation (1D -> 1W -> 1M)
 */
function aggregateCandles(dailyData, timeframe = '1D') {
  if (!Array.isArray(dailyData) || dailyData.length === 0 || timeframe === '1D') {
    return dailyData || [];
  }

  const grouped = new Map();

  for (const bar of dailyData) {
    if (!bar || !bar.time) continue;
    const d = new Date(bar.time);
    let key;

    if (timeframe === '1W') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = monday.toISOString().split('T')[0];
    } else if (timeframe === '1M') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      key = `${year}-${month}-01`;
    } else {
      key = bar.time;
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        time: key,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        value: Number(bar.value || 0),
      });
    } else {
      const g = grouped.get(key);
      g.high = Math.max(g.high, bar.high);
      g.low = Math.min(g.low, bar.low);
      g.close = bar.close;
      g.value += Number(bar.value || 0);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Calculate Moving Average on aggregated candle arrays
 */
function calculateMA(candles, period) {
  if (!Array.isArray(candles) || candles.length < period) return [];
  const result = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: Math.round((sum / period) * 100) / 100,
    });
  }
  return result;
}

export default function StockChart({ ticker }) {
  const chartContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1Y');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D'); // '1D' | '1W' | '1M'
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live Crosshair Hover / Legend state
  const [hoverData, setHoverData] = useState(null);

  // Interactive Indicator Toggles
  const [indicators, setIndicators] = useState({
    ma20: true,
    ma50: true,
    ma200: true,
    bollinger: false,
    rsi: false,
    macd: false,
    patterns: true,
  });

  // Data cache from API
  const rawDataRef = useRef([]);
  const apiIndicatorsRef = useRef({
    ma20: [],
    ma50: [],
    ma200: [],
    bollinger: { upper: [], middle: [], lower: [] },
    rsi: [],
    macd: { macd: [], signal: [], histogram: [] },
  });

  // Series References
  const indicatorsRef = useRef(indicators);

  useEffect(() => {
    indicatorsRef.current = indicators;
  }, [indicators]);

  const chartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  const ma50SeriesRef = useRef(null);
  const ma200SeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbMidSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const macdSeriesRef = useRef(null);
  const macdSignalSeriesRef = useRef(null);
  const macdHistSeriesRef = useRef(null);
  const dynamicPriceLinesRef = useRef([]);

  // Toggle single indicator
  const toggleIndicator = (name) => {
    setIndicators(prev => {
      const next = { ...prev, [name]: !prev[name] };
      return next;
    });
  };

  // ── 1. Fetch & Initialize Chart ──────────────────────────────────────────
  useEffect(() => {
    let chart = null;
    let resizeObserver = null;
    let themeObserver = null;

    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/chart?ticker=${ticker}&years=5`);
        if (!res.ok) throw new Error('Gagal memuat histori data grafik');
        const json = await res.json();
        const { data, ma20, ma50, ma200, bollinger, rsi, macd, analytics: chartAnalytics } = json;

        if (!data || data.length === 0) throw new Error('Data historis tidak tersedia');

        rawDataRef.current = data;
        apiIndicatorsRef.current = {
          ma20: ma20 || [],
          ma50: ma50 || [],
          ma200: ma200 || [],
          bollinger: bollinger || { upper: [], middle: [], lower: [] },
          rsi: rsi || [],
          macd: macd || { macd: [], signal: [], histogram: [] },
        };

        // Candlestick pattern detection
        const detectedPatterns = analyzeCandlestickPatterns(data);
        setPatternAnalysis(detectedPatterns);

        // Styling
        const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
        const containerWidth = chartContainerRef.current?.clientWidth || 800;
        const chartHeight = isFullscreen ? 580 : 420;

        // Initialize Lightweight Charts v5
        chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: chartHeight,
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
            scaleMargins: {
              top: 0.08,
              bottom: 0.22,
            },
          },
          timeScale: {
            borderColor: borderColor,
            timeVisible: true,
            minBarSpacing: 0.2,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        });

        chartInstanceRef.current = chart;

        // 1. Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: true,
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        candlestickSeries.setData(data);
        candlestickSeriesRef.current = candlestickSeries;

        // 2. Candlestick Pattern Markers
        if (detectedPatterns.allDetected?.length > 0) {
          const markers = detectedPatterns.allDetected.slice(-25).map(p => ({
            time: p.time,
            position: p.direction === 'bullish' ? 'belowBar' : 'aboveBar',
            color: p.direction === 'bullish' ? '#10b981' : p.direction === 'bearish' ? '#ef4444' : '#f59e0b',
            shape: p.direction === 'bullish' ? 'arrowUp' : p.direction === 'bearish' ? 'arrowDown' : 'circle',
            text: `${p.emoji} ${p.shortName || p.name.split(' ')[0]}`,
            size: 1.2,
          }));
          createSeriesMarkers(candlestickSeries, markers);
        }

        // 3. Volume Histogram Series
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay on background
          scaleMargins: {
            top: 0.82,
            bottom: 0,
          },
        });
        const volumeData = data.map(d => ({
          time: d.time,
          value: d.value,
          color: d.close >= d.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
        }));
        volumeSeries.setData(volumeData);
        volumeSeriesRef.current = volumeSeries;

        // 4. Moving Averages: MA20 (Blue), MA50 (Purple), MA200 (Amber)
        const ma20Series = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1.5,
          title: 'MA20',
          visible: indicatorsRef.current.ma20,
        });
        ma20Series.setData(ma20 || []);
        ma20SeriesRef.current = ma20Series;

        const ma50Series = chart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1.5,
          title: 'MA50',
          visible: indicatorsRef.current.ma50,
        });
        ma50Series.setData(ma50 || []);
        ma50SeriesRef.current = ma50Series;

        const ma200Series = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 2,
          title: 'MA200',
          visible: indicatorsRef.current.ma200,
        });
        ma200Series.setData(ma200 || []);
        ma200SeriesRef.current = ma200Series;

        // 5. Bollinger Bands Series (Upper, Mid, Lower)
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: 'rgba(6, 182, 212, 0.8)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Upper',
          visible: indicatorsRef.current.bollinger,
        });
        bbUpperSeries.setData(bollinger?.upper || []);
        bbUpperSeriesRef.current = bbUpperSeries;

        const bbMidSeries = chart.addSeries(LineSeries, {
          color: 'rgba(6, 182, 212, 0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          title: 'BB Mid',
          visible: indicatorsRef.current.bollinger,
        });
        bbMidSeries.setData(bollinger?.middle || []);
        bbMidSeriesRef.current = bbMidSeries;

        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: 'rgba(6, 182, 212, 0.8)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Lower',
          visible: indicatorsRef.current.bollinger,
        });
        bbLowerSeries.setData(bollinger?.lower || []);
        bbLowerSeriesRef.current = bbLowerSeries;

        // 6. RSI (14) Secondary Overlay Sub-Pane
        const rsiSeries = chart.addSeries(LineSeries, {
          color: '#8b5cf6',
          lineWidth: 1.5,
          title: 'RSI(14)',
          priceScaleId: 'rsi',
          visible: indicatorsRef.current.rsi,
          scaleMargins: {
            top: 0.82,
            bottom: 0.02,
          },
        });
        rsiSeries.setData(rsi || []);
        rsiSeries.createPriceLine({
          price: 70,
          color: 'rgba(239, 68, 68, 0.6)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '70 OB',
        });
        rsiSeries.createPriceLine({
          price: 30,
          color: 'rgba(16, 185, 129, 0.6)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '30 OS',
        });
        rsiSeriesRef.current = rsiSeries;

        // 7. MACD Histogram & Lines
        const macdHistSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: 'macd',
          title: 'MACD Hist',
          visible: indicatorsRef.current.macd,
          scaleMargins: {
            top: 0.82,
            bottom: 0.02,
          },
        });
        macdHistSeries.setData(macd?.histogram || []);
        macdHistSeriesRef.current = macdHistSeries;

        const macdSeries = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1.5,
          priceScaleId: 'macd',
          title: 'MACD',
          visible: indicatorsRef.current.macd,
          scaleMargins: {
            top: 0.82,
            bottom: 0.02,
          },
        });
        macdSeries.setData(macd?.macd || []);
        macdSeriesRef.current = macdSeries;

        const macdSignalSeries = chart.addSeries(LineSeries, {
          color: '#f97316',
          lineWidth: 1.5,
          priceScaleId: 'macd',
          title: 'Signal',
          visible: indicatorsRef.current.macd,
          scaleMargins: {
            top: 0.82,
            bottom: 0.02,
          },
        });
        macdSignalSeries.setData(macd?.signal || []);
        macdSignalSeriesRef.current = macdSignalSeries;

        // 8. Static Support & Resistance Lines from Analytics
        if (chartAnalytics?.support) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.support,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'Support',
          });
        }
        if (chartAnalytics?.resistance) {
          candlestickSeries.createPriceLine({
            price: chartAnalytics.resistance,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'Resistance',
          });
        }

        // Default range (1 Year / 252 bars)
        if (data.length > 0) {
          try {
            const barsToShow = 252;
            const fromIndex = Math.max(0, data.length - barsToShow);
            const toIndex = data.length - 1;
            chart.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
          } catch (_) {
            chart.timeScale().fitContent();
          }
        }

        // Set default hover data to the latest candle
        if (data.length > 0) {
          const latest = data[data.length - 1];
          const prev = data.length > 1 ? data[data.length - 2] : latest;
          const chg = prev.close > 0 ? ((latest.close - prev.close) / prev.close) * 100 : 0;
          setHoverData({
            time: latest.time,
            open: latest.open,
            high: latest.high,
            low: latest.low,
            close: latest.close,
            changePct: chg,
            volume: latest.value,
          });
        }

        // 9. Floating Crosshair Legend Event Listener
        chart.subscribeCrosshairMove((param) => {
          if (!param || !param.time || !param.seriesData) {
            return;
          }
          const candle = param.seriesData.get(candlestickSeries);
          const vol = param.seriesData.get(volumeSeries);
          if (candle) {
            const chg = candle.open > 0 ? ((candle.close - candle.open) / candle.open) * 100 : 0;
            setHoverData({
              time: String(param.time),
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              changePct: chg,
              volume: vol?.value || 0,
            });
          }
        });

        // 10. Robust ResizeObserver on container
        if (chartContainerRef.current) {
          resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const newWidth = entries[0].contentRect.width;
            if (chart && newWidth > 0) {
              chart.applyOptions({ width: newWidth });
            }
          });
          resizeObserver.observe(chartContainerRef.current);
        }

        // 11. Theme Change Observer (Dark/Light Mutation)
        themeObserver = new MutationObserver(() => {
          const isNowDark = document.documentElement.classList.contains('dark');
          const tColor = isNowDark ? '#94a3b8' : '#475569';
          const gColor = isNowDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
          const bColor = isNowDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
          if (chart) {
            chart.applyOptions({
              layout: { textColor: tColor },
              grid: { vertLines: { color: gColor }, horzLines: { color: gColor } },
              rightPriceScale: { borderColor: bColor },
              timeScale: { borderColor: bColor },
            });
          }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        setAnalytics(chartAnalytics || null);
        setLoading(false);

      } catch (err) {
        setLoading(false);
        setError(err.message || 'Gagal memuat chart');
        setAnalytics(null);
        setPatternAnalysis(null);
      }
    };

    fetchChartData();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (themeObserver) themeObserver.disconnect();
      if (chart) chart.remove();
      chartInstanceRef.current = null;
    };
  }, [ticker, isFullscreen]);

  // ── 2. Sync Indicator Visibility Toggles ─────────────────────────────────
  useEffect(() => {
    if (ma20SeriesRef.current) ma20SeriesRef.current.applyOptions({ visible: indicators.ma20 });
    if (ma50SeriesRef.current) ma50SeriesRef.current.applyOptions({ visible: indicators.ma50 });
    if (ma200SeriesRef.current) ma200SeriesRef.current.applyOptions({ visible: indicators.ma200 });
    if (bbUpperSeriesRef.current) bbUpperSeriesRef.current.applyOptions({ visible: indicators.bollinger });
    if (bbMidSeriesRef.current) bbMidSeriesRef.current.applyOptions({ visible: indicators.bollinger });
    if (bbLowerSeriesRef.current) bbLowerSeriesRef.current.applyOptions({ visible: indicators.bollinger });
    if (rsiSeriesRef.current) rsiSeriesRef.current.applyOptions({ visible: indicators.rsi });
    if (macdSeriesRef.current) macdSeriesRef.current.applyOptions({ visible: indicators.macd });
    if (macdSignalSeriesRef.current) macdSignalSeriesRef.current.applyOptions({ visible: indicators.macd });
    if (macdHistSeriesRef.current) macdHistSeriesRef.current.applyOptions({ visible: indicators.macd });
  }, [indicators]);

  // ── 3. Handle Timeframe Aggregation (1D, 1W, 1M) ─────────────────────────
  const handleTimeframeChange = (tf) => {
    setSelectedTimeframe(tf);
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !rawDataRef.current.length) return;

    const aggregated = aggregateCandles(rawDataRef.current, tf);
    candlestickSeriesRef.current.setData(aggregated);

    const volData = aggregated.map(d => ({
      time: d.time,
      value: d.value,
      color: d.close >= d.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
    }));
    volumeSeriesRef.current.setData(volData);

    // Update MAs for aggregated timeframe
    if (ma20SeriesRef.current) ma20SeriesRef.current.setData(calculateMA(aggregated, 20));
    if (ma50SeriesRef.current) ma50SeriesRef.current.setData(calculateMA(aggregated, 50));
    if (ma200SeriesRef.current) ma200SeriesRef.current.setData(calculateMA(aggregated, 200));

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  // ── 4. Range Selector (1B, 3B, 6B, 1T, 3T, 5T) ───────────────────────────
  const handleRangeChange = (range) => {
    setSelectedRange(range);
    if (!chartInstanceRef.current || !rawDataRef.current.length) return;

    const currentData = aggregateCandles(rawDataRef.current, selectedTimeframe);
    const totalBars = currentData.length;

    let barsToShow;
    switch (range) {
      case '1M': barsToShow = selectedTimeframe === '1D' ? 22 : 4; break;
      case '3M': barsToShow = selectedTimeframe === '1D' ? 66 : 12; break;
      case '6M': barsToShow = selectedTimeframe === '1D' ? 132 : 26; break;
      case '1Y': barsToShow = selectedTimeframe === '1D' ? 252 : 52; break;
      case '3Y': barsToShow = selectedTimeframe === '1D' ? 756 : 156; break;
      case '5Y':
      case 'ALL':
      default: barsToShow = totalBars; break;
    }

    try {
      if (barsToShow >= totalBars) {
        chartInstanceRef.current.timeScale().fitContent();
      } else {
        const fromIndex = Math.max(0, totalBars - barsToShow);
        const toIndex = totalBars - 1;
        chartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
      }
    } catch (_) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  // ── 5. Pattern Price Levels Drawing ──────────────────────────────────────
  const handleDrawPatternLevels = (pattern) => {
    if (!candlestickSeriesRef.current || !pattern) return;

    dynamicPriceLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current.removePriceLine(line);
      } catch (_) {}
    });
    dynamicPriceLinesRef.current = [];

    if (pattern.entryPrice) {
      const entryLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.entryPrice,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: pattern.direction === 'bearish' ? `🚪 Exit (${pattern.shortName})` : `🎯 Entry (${pattern.shortName})`,
      });
      dynamicPriceLinesRef.current.push(entryLine);
    }

    if (pattern.stopLossPrice) {
      const slLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.stopLossPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: pattern.direction === 'bearish' ? '⚠️ Cut Loss Darurat' : '🛡️ Stop Loss',
      });
      dynamicPriceLinesRef.current.push(slLine);
    }

    if (pattern.takeProfitPrice) {
      const isBearish = pattern.direction === 'bearish';
      const tpLine = candlestickSeriesRef.current.createPriceLine({
        price: pattern.takeProfitPrice,
        color: isBearish ? '#f59e0b' : '#10b981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: isBearish ? '📉 Target Penurunan (Support)' : '🚀 Target Take Profit',
      });
      dynamicPriceLinesRef.current.push(tpLine);
    }

    setShowPatternModal(false);
  };

  const handleFitContent = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  const currentPattern = patternAnalysis?.currentPattern;

  return (
    <div className={`w-full relative rounded-2xl overflow-hidden glass border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1321] transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 p-4 shadow-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 flex flex-col justify-between' : ''
    }`}>
      {/* ── TOP TOOLBAR & LIVE FLOATING OHLCV LEGEND ─────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2.5 bg-slate-50/90 dark:bg-white/[0.02]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Pattern Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>📈</span>
              <span>TradingView Pro — {ticker}</span>
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
                <span className="font-bold">({currentPattern.direction === 'bullish' ? '▲ Bullish' : currentPattern.direction === 'bearish' ? '▼ Bearish' : '⚖️ Netral'})</span>
              </span>
            )}
          </div>

          {/* Timeframe & Range Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi-Timeframe Selector (1D, 1W, 1M) */}
            <div className="flex items-center bg-slate-200/90 dark:bg-slate-800/90 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700/60 shadow-inner">
              {[
                { id: '1D', label: '1D' },
                { id: '1W', label: '1W' },
                { id: '1M', label: '1M' },
              ].map(tf => (
                <button
                  key={tf.id}
                  onClick={() => handleTimeframeChange(tf.id)}
                  className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all ${
                    selectedTimeframe === tf.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`Agregasi Lilin ${tf.label}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Range Selector (1B, 3B, 6B, 1T, 3T, 5T) */}
            <div className="flex items-center bg-slate-200/90 dark:bg-slate-800/90 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700/60 shadow-inner">
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
                  className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all ${
                    selectedRange === r.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Fit zoom button */}
            <button
              onClick={handleFitContent}
              className="px-2 py-1 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-all border border-slate-300 dark:border-slate-700"
              title="Reset Zoom / Pas ke Layar"
            >
              🔄 Fit
            </button>

            {/* Candlestick Pattern Detail Modal Trigger */}
            <button
              onClick={() => setShowPatternModal(true)}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-400/60 text-[11px] font-black rounded-lg transition-all flex items-center gap-1"
            >
              <span>🕯️</span> Pola
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-2 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-400/50 text-[11px] font-black rounded-lg transition-all"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
            >
              {isFullscreen ? '✕ Keluar' : '⛶ Zoom'}
            </button>
          </div>
        </div>

        {/* ── LIVE INTERACTIVE OHLCV FLOATING LEGEND ──────────────────────── */}
        <div className="flex items-center gap-3 text-xs font-mono overflow-x-auto whitespace-nowrap pt-1 text-slate-600 dark:text-slate-400">
          {hoverData ? (
            <>
              <span className="font-bold text-slate-800 dark:text-slate-200">{hoverData.time}</span>
              <span>O: <strong className="text-slate-900 dark:text-white">{formatPrice(hoverData.open)}</strong></span>
              <span>H: <strong className="text-slate-900 dark:text-white">{formatPrice(hoverData.high)}</strong></span>
              <span>L: <strong className="text-slate-900 dark:text-white">{formatPrice(hoverData.low)}</strong></span>
              <span>C: <strong className={hoverData.changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{formatPrice(hoverData.close)}</strong></span>
              <span className={`font-bold ${hoverData.changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {hoverData.changePct >= 0 ? '+' : ''}{hoverData.changePct.toFixed(2)}%
              </span>
              <span>Vol: <strong className="text-slate-800 dark:text-slate-200">{formatVolumeCompact(hoverData.volume)}</strong></span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400">Arahkan kursor atau sentuh lilin untuk melihat data OHLCV & indikator.</span>
          )}
        </div>

        {/* ── INTERACTIVE INDICATOR TOGGLE PILLS ──────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-1 pb-0.5 text-[10px]">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mr-1">Indikator:</span>

          <button
            onClick={() => toggleIndicator('ma20')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.ma20
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#3b82f6]"></span> MA20
          </button>

          <button
            onClick={() => toggleIndicator('ma50')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.ma50
                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#a855f7]"></span> MA50
          </button>

          <button
            onClick={() => toggleIndicator('ma200')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.ma200
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
            title="Moving Average 200 Hari (Tren Jangka Panjang Institusi)"
          >
            <span className="w-2 h-0.5 bg-[#f59e0b]"></span> MA200 (Tren)
          </button>

          <button
            onClick={() => toggleIndicator('bollinger')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.bollinger
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
            title="Bollinger Bands (20, 2)"
          >
            <span className="w-2 h-0.5 bg-[#06b6d4]"></span> Bollinger Bands
          </button>

          <button
            onClick={() => toggleIndicator('rsi')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.rsi
                ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
            title="Relative Strength Index (14) dengan Zona 70 Overbought & 30 Oversold"
          >
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span> RSI (14)
          </button>

          <button
            onClick={() => toggleIndicator('macd')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 border ${
              indicators.macd
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent opacity-60'
            }`}
            title="MACD (12, 26, 9) Histogram & Signal Line"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> MACD
          </button>
        </div>
      </div>

      {/* ── TECHNICAL ANALYTICS CHIPS ────────────────────────────────────── */}
      {analytics && !loading && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="flex gap-2 overflow-x-auto text-[11px] pb-0.5 snap-x">
            <div className="rounded-lg bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 min-w-[150px] shrink-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Arah Tren (Slope 20H)</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                {analytics.trend?.direction === 'up' ? '🟢 Bullish Uptrend' : analytics.trend?.direction === 'down' ? '🔴 Bearish Downtrend' : '🟡 Sideways'}
                <span className="text-[10px] text-slate-400">({analytics.trend?.confidence || 0}%)</span>
              </span>
            </div>

            <div className="rounded-lg bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 min-w-[140px] shrink-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Support 20H</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                Rp {formatPrice(analytics.support)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 min-w-[140px] shrink-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Resistance 20H</span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                Rp {formatPrice(analytics.resistance)}
              </span>
            </div>

            <div className="rounded-lg bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 min-w-[140px] shrink-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Rentang Breakout 60H</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatPrice(analytics.bounds?.rangeLow)} – {formatPrice(analytics.bounds?.rangeHigh)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CHART CONTAINER ─────────────────────────────────────────── */}
      <div className="relative w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Memuat Grafik TradingView...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-rose-500 space-y-2">
            <span className="text-3xl block">⚠️</span>
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className={`w-full ${isFullscreen ? 'h-[580px]' : 'h-[420px]'}`}
        />
      </div>

      {/* ── MODAL: RINCIAN POLA CANDLESTICK ──────────────────────────────── */}
      {showPatternModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>🕯️</span> Deteksi Pola Candlestick ({ticker})
              </h4>
              <button
                onClick={() => setShowPatternModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {currentPattern ? (
              <div className="space-y-4">
                {/* Pattern Overview */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{currentPattern.emoji}</span>
                      <div>
                        <h5 className="font-black text-slate-900 dark:text-white text-sm">{currentPattern.name}</h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Terdeteksi pada: {currentPattern.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                      currentPattern.direction === 'bullish'
                        ? 'bg-emerald-500 text-white'
                        : currentPattern.direction === 'bearish'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {currentPattern.directionLabel}
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Tingkat Keandalan:</span>
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

                {/* Market Psychology */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <span>🧠</span>
                    <span>Psikologi & Aksi Pasar:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentPattern.psychology}
                  </p>
                </div>

                {/* Trading Recommendations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      📋 Rekomendasi Rencana Trading
                    </h5>
                    {(currentPattern.entryPrice || currentPattern.takeProfitPrice) && (
                      <button
                        onClick={() => handleDrawPatternLevels(currentPattern)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
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

                {/* History of Detected Patterns */}
                {patternAnalysis?.historyPatterns?.length > 1 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      🕒 Riwayat Pola Sebelumnya (Klik untuk gambar level)
                    </h5>
                    <div className="space-y-1.5">
                      {patternAnalysis.historyPatterns.slice(1, 8).map((hist, idx) => (
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

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPatternModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
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
