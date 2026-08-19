'use client';

import {
 createChart,
 CrosshairMode,
 CandlestickSeries,
 HistogramSeries,
 LineSeries,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

export default function StockChart({ ticker }) {
 const chartContainerRef = useRef();
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [analytics, setAnalytics] = useState(null);

 useEffect(() => {
 let chart;
 let removeResizeListener = null;

 const fetchChartData = async () => {
 try {
 const isMobile = window.matchMedia('(max-width: 768px)').matches;
 setLoading(true);
 setError(null);
 const res = await fetch(`/api/chart?ticker=${ticker}`);
 if (!res.ok) throw new Error('Failed to load chart data');
 const { data, ma20, ma50, analytics: chartAnalytics } = await res.json();
 
 if (data.length === 0) throw new Error('No data available');

 // Initialize chart component
 chart = createChart(chartContainerRef.current, {
 width: chartContainerRef.current.clientWidth,
 height: 350,
 layout: {
 background: { type: 'solid', color: 'transparent' },
 textColor: '#94a3b8',
 },
 grid: {
 vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
 horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
 },
 crosshair: {
 mode: CrosshairMode.Normal,
 },
 rightPriceScale: {
 borderColor: 'rgba(255, 255, 255, 0.1)',
 },
 timeScale: {
 borderColor: 'rgba(255, 255, 255, 0.1)',
 timeVisible: true,
 },
 // On mobile, keep page scroll smooth when finger is on the chart area.
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

 // Candlesticks
 const candlestickSeries = chart.addSeries(CandlestickSeries, {
 upColor: '#10b981',
 downColor: '#ef4444',
 borderVisible: false,
 wickUpColor: '#10b981',
 wickDownColor: '#ef4444',
 });
 candlestickSeries.setData(data);

 // Volume
 const volumeSeries = chart.addSeries(HistogramSeries, {
 color: '#26a69a',
 priceFormat: { type: 'volume' },
 priceScaleId: '', // set as an overlay by setting a blank priceScaleId
 scaleMargins: {
 top: 0.8, // highest point of the series will be at 80% away from the top
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
 if (chartAnalytics?.bounds?.lower) {
 candlestickSeries.createPriceLine({
 price: chartAnalytics.bounds.lower,
 color: '#22c55e',
 lineWidth: 1,
 lineStyle: 4,
 axisLabelVisible: false,
 title: 'Lower',
 });
 }
 if (chartAnalytics?.bounds?.upper) {
 candlestickSeries.createPriceLine({
 price: chartAnalytics.bounds.upper,
 color: '#f97316',
 lineWidth: 1,
 lineStyle: 4,
 axisLabelVisible: false,
 title: 'Upper',
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

 return (
 <div className="w-full relative rounded-xl overflow-hidden glass border border-slate-200 dark:border-white/5 bg-[#0d1321]">
 <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 space-y-2">
 <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
 📊 Grafik {ticker} (1 Tahun)
 </h3>
 <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap pb-1">
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Up</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Down</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5 bg-[#3b82f6]"></span> MA20</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5 bg-[#a855f7]"></span> MA50</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5 bg-[#10b981]"></span> Support</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5 bg-[#ef4444]"></span> Resistance</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5"style={{ backgroundColor: 'rgba(16,185,129,0.55)' }}></span> S-Zone</span>
 <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03]"><span className="w-2 h-0.5"style={{ backgroundColor: 'rgba(239,68,68,0.55)' }}></span> R-Zone</span>
 </div>
 </div>

 {analytics && !loading && (
 <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
 <div className="flex gap-2 overflow-x-auto text-[11px] pb-1 snap-x">
 <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[170px] shrink-0 snap-start">
 <span className="text-slate-500 dark:text-slate-400">Arah Trend</span>
 <div className={`font-bold ${
 analytics.trend?.direction === 'up'
 ? 'text-emerald-400'
 : analytics.trend?.direction === 'down'
 ? 'text-red-400'
 : 'text-amber-600 dark:text-amber-300'
 }`}>
 {analytics.trend?.label} ({analytics.trend?.confidence ?? 0}%)
 </div>
 </div>
 <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[210px] shrink-0 snap-start">
 <span className="text-slate-500 dark:text-slate-400">Support / Resistance</span>
 <div className="font-bold text-slate-900 dark:text-white">
 {formatPrice(analytics.support)} / {formatPrice(analytics.resistance)}
 </div>
 </div>
 <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[250px] shrink-0 snap-start">
 <span className="text-slate-500 dark:text-slate-400">Zona S / R</span>
 <div className="font-bold text-slate-900 dark:text-white">
 {formatPrice(analytics.supportZone?.low)}-{formatPrice(analytics.supportZone?.high)} / {formatPrice(analytics.resistanceZone?.low)}-{formatPrice(analytics.resistanceZone?.high)}
 </div>
 </div>
 <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[200px] shrink-0 snap-start">
 <span className="text-slate-500 dark:text-slate-400">Batas Volatilitas</span>
 <div className="font-bold text-slate-900 dark:text-white">
 {formatPrice(analytics.bounds?.lower)} - {formatPrice(analytics.bounds?.upper)}
 </div>
 </div>
 <div className="rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-2 min-w-[200px] shrink-0 snap-start">
 <span className="text-slate-500 dark:text-slate-400">Range 60 Hari</span>
 <div className="font-bold text-slate-900 dark:text-white">
 {formatPrice(analytics.bounds?.rangeLow)} - {formatPrice(analytics.bounds?.rangeHigh)}
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
 
 <div ref={chartContainerRef} className="w-full h-[350px] touch-pan-y"/>
 </div>
 );
}

function formatPrice(value) {
 if (!Number.isFinite(Number(value))) return '-';
 return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}
