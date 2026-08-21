'use client';

import { useState, useEffect, useCallback } from 'react';
import MarketBadge from './MarketBadge';
import ModeSelector from './ModeSelector';
import StyleSelector from './StyleSelector';
import SectorBar from './SectorBar';
import StockTable from './StockTable';
import HistoryPanel from './HistoryPanel';
import Sidebar from './Navigation/Sidebar';
import MobileNav from './Navigation/MobileNav';
import CustomSliders from './CustomSliders';
import PortfolioPanel from './PortfolioPanel';
import BacktestPanel from './BacktestPanel';
import MarketMovers from './MarketMovers';
import StockScreener from './StockScreener';
import AlphaLegendScreeners from './AlphaLegend/AlphaLegendScreeners';
import PensionCalculator from './PensionCalculator';
import KseiUploadPanel from './KseiUploadPanel';
import AuthModal from './AuthModal';
import { ThemeToggle } from './ThemeToggle';

export default function Dashboard() {
 const [user, setUser] = useState(null);
 const [checkingAuth, setCheckingAuth] = useState(true);

 const [activeTab, setActiveTab] = useState('watchlist');
 const [mode, setMode] = useState('auto');
 const [style, setStyle] = useState('swing');
 const [customWeights, setCustomWeights] = useState(null);
 const [stocks, setStocks] = useState([]);
 const [sectors, setSectors] = useState([]);
 const [market, setMarket] = useState(null);
 const [modeInfo, setModeInfo] = useState(null);
 const [styleInfo, setStyleInfo] = useState(null);
 const [loading, setLoading] = useState(true);
 const [moversLoading, setMoversLoading] = useState(true);
 const [error, setError] = useState(null);
 const [lastUpdated, setLastUpdated] = useState(null);
 const [syncInfo, setSyncInfo] = useState(null);
 const [marketMovers, setMarketMovers] = useState(null);

 // Check auth status on mount
 const checkAuth = useCallback(async () => {
 try {
 setCheckingAuth(true);
 const res = await fetch('/api/auth/me');
 if (res.ok) {
 const data = await res.json();
 setUser(data.user || null);
 }
 } catch (e) {
 setUser(null);
 } finally {
 setCheckingAuth(false);
 }
 }, []);

 useEffect(() => {
 void checkAuth();
 }, [checkAuth]);

 const handleLogout = async () => {
 try {
 await fetch('/api/auth/logout', { method: 'POST' });
 setUser(null);
 } catch (e) {
 console.error(e);
 }
 };

 const fetchData = useCallback(async () => {
 try {
 setLoading(true);
 setError(null);

 const customWeightsQuery = mode === 'custom' && customWeights
        ? `&cw=${encodeURIComponent(JSON.stringify(customWeights))}`
        : '';

 const [stocksRes, sectorsRes, marketRes, moversRes] = await Promise.all([
 fetch(`/api/stocks?mode=${mode}&style=${style}${customWeightsQuery}&_t=${Date.now()}`),
 fetch('/api/sectors'),
 fetch('/api/market'),
 fetch('/api/market-movers'),
 ]);

 if (!stocksRes.ok || !sectorsRes.ok || !marketRes.ok) {
 throw new Error('Gagal mengambil data');
 }

 const stocksData = await stocksRes.json();
 const sectorsData = await sectorsRes.json();
 const marketData = await marketRes.json();

 setStocks(stocksData.stocks);
 setModeInfo(stocksData.mode);
 setStyleInfo(stocksData.style);
 setSectors(sectorsData.sectors);
 setMarket(marketData);
 setLastUpdated(new Date().toLocaleString('id-ID'));

 if (moversRes.ok) {
 const moversData = await moversRes.json();
 setMarketMovers(moversData);
 }
 setMoversLoading(false);

 const syncRes = await fetch('/api/sync');
 if (syncRes.ok) {
 setSyncInfo(await syncRes.json());
 }
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 }, [mode, style, customWeights]);

 useEffect(() => {
 if (!user) return;

 const firstFetchTimer = setTimeout(() => {
 void fetchData();
 }, 0);
 
 const interval = setInterval(() => {
 console.log('Auto-refreshing dashboard data...');
 void fetchData();
 }, 30000);

 return () => {
 clearTimeout(firstFetchTimer);
 clearInterval(interval);
 };
 }, [user, fetchData]);

 const handleManualSync = async () => {
 try {
 await fetch('/api/sync', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ type: 'price' })
 });
 alert('Sinkronisasi harga dimulai di latar belakang.');
 void fetchData();
 } catch (e) {
 alert('Gagal memulai sinkronisasi.');
 }
 };

 // Auth Loading State
 if (checkingAuth) {
 return (
 <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] flex flex-col items-center justify-center space-y-4">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 animate-spin flex items-center justify-center">
 <div className="w-8 h-8 bg-slate-50 dark:bg-[#0a0f1a] rounded-xl"></div>
 </div>
 <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Memeriksa Sesi Pengguna...</p>
 </div>
 );
 }

 // MANDATORY AUTH GATE: If user is not logged in, force AuthModal (no close button)
 if (!user) {
 return (
 <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] flex items-center justify-center p-4">
 <AuthModal
 isOpen={true}
 onClose={null}
 onAuthSuccess={(loggedInUser) => {
 setUser(loggedInUser);
 }}
 />
 </div>
 );
 }

 return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1a] flex">
      {/* Desktop Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        syncInfo={syncInfo}
        handleManualSync={handleManualSync}
        user={user}
        handleLogout={handleLogout}
        fetchData={fetchData}
        loading={loading}
      />
      
      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full lg:w-[calc(100%-16rem)] relative pb-20 lg:pb-0">
        
        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold">
              ⚠️ Gagal memuat data: {error}. Silakan coba segarkan halaman.
            </div>
          )}

          {/* TAB 1: WATCHLIST & ANALISIS SAHAM */}
  {activeTab === 'watchlist' && (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Market Condition Badge & Summary */}
      <MarketBadge market={market} />

      {/* Style Selector (Scalping, Daily, Swing) & Strategy Mode */}
      <div className="space-y-4">
        {/* Style Selector Container */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gaya Trading</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Pilih strategi horison waktu transaksi untuk penyesuaian bobot indikator</p>
          </div>
          <div className="w-full sm:w-72 flex-shrink-0">
            <StyleSelector currentStyle={style} onStyleChange={setStyle} />
          </div>
        </div>

        <ModeSelector currentMode={mode} onModeChange={setMode} />
        
        {mode === 'custom' && (
          <CustomSliders 
            onWeightsChange={setCustomWeights} 
            initialStyle={style} 
          />
        )}
      </div>

 {/* Sector Bar */}
 <SectorBar sectors={sectors} />

 {/* Main Stock Ranking Table */}
 <StockTable stocks={stocks} loading={loading} />

 </div>
 )}

 {/* TAB 2: MARKET MOVERS */}
 {activeTab === 'movers' && (
 <div className="animate-in fade-in duration-300">
 <MarketMovers data={marketMovers} loading={moversLoading} />
 </div>
 )}

 {/* TAB 3: STOCK SCREENER */}
 {activeTab === 'screener' && (
 <div className="animate-in fade-in duration-300">
 <StockScreener />
 </div>
 )}

 {/* TAB 3.5: SCREENING ALPHA LEGENDS */}
 {activeTab === 'alpha-legend' && (
 <div className="animate-in fade-in duration-300">
 <AlphaLegendScreeners />
 </div>
 )}

 {/* TAB 4: PORTOFOLIO SAYA */}
 {activeTab === 'portfolio' && (
 <div className="animate-in fade-in duration-300">
 <PortfolioPanel stocks={stocks} />
 </div>
 )}

 {/* TAB 5: RIWAYAT & WIN RATE */}
 {activeTab === 'backtest' && (
   <div className="animate-in fade-in duration-300 space-y-6">
     <HistoryPanel />
     <BacktestPanel />
   </div>
 )}

 {/* TAB 6: KALKULATOR PENSIUN */}
 {activeTab === 'pension' && (
 <div className="animate-in fade-in duration-300">
 <PensionCalculator />
 </div>
 )}

 {/* TAB 7: UPLOAD DATA KSEI */}
 {activeTab === 'ksei-upload' && (
 <div className="animate-in fade-in duration-300">
 <KseiUploadPanel />
 </div>
 )}
 </main>

 {/* Footer */}
 <footer className="border-t border-slate-200 dark:border-slate-800/30 py-6 mt-12 bg-slate-50 dark:bg-[#0a0f1a]/50">
 <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
 <p>⚡ IDX Watchlist — Platform Analisis Saham Pintar berbasis Algoritma Scoring Fundamental & Teknikal.</p>
 <p>⚠️ Data diperbarui secara berkala dari BEI/Yahoo Finance. Bukan merupakan ajakan untuk membeli atau menjual saham.</p>
 </div>
 </footer>
        {/* Mobile Bottom Navigation */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
