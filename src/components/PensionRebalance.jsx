'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MSCI_INDONESIA_TICKERS, isMSCI } from '../lib/constants/msci';
import Tooltip from './Tooltip';
import ScoreBadge from './ScoreBadge';

export default function PensionRebalance({ records, onRefresh, stockPrices }) {
  const [analyzedStocks, setAnalyzedStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form states
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [dividendCash, setDividendCash] = useState(0);
  const [sellForm, setSellForm] = useState([{ ticker: '', lots: 0, price: 0 }]);
  const [buyForm, setBuyForm] = useState([{ ticker: '', lots: 0, price: 0 }]);
  
  // Calculate accumulated lots for each stock
  const portfolio = useMemo(() => {
    const map = {};
    let totalSBN = 0;
    let totalRDPU = 0;

    (records || []).forEach(r => {
      if (r.category === 'SAHAM' && r.ticker) {
        if (!map[r.ticker]) map[r.ticker] = { lots: 0, invested: 0 };
        map[r.ticker].lots += (r.lots || 0);
        map[r.ticker].invested += (r.amount || 0);
      } else if (r.category === 'SBN') {
        totalSBN += r.amount || 0;
      } else if (r.category === 'RDPU') {
        totalRDPU += r.amount || 0;
      }
    });

    return {
      stocks: Object.entries(map).map(([ticker, data]) => ({ ticker, ...data })).filter(s => s.lots > 0),
      totalSBN,
      totalRDPU
    };
  }, [records]);

  // Fetch fundamentals for accumulated stocks
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (portfolio.stocks.length === 0) return;
      setLoading(true);
      try {
        const tickers = portfolio.stocks.map(s => s.ticker).join(',');
        const res = await fetch(`/api/stocks?mode=custom&tickers=${tickers}`);
        if (res.ok) {
          const data = await res.json();
          const stockMap = {};
          data.stocks.forEach(s => stockMap[s.ticker] = s);
          
          const analyzed = portfolio.stocks.map(p => {
            const currentData = stockMap[p.ticker] || {};
            const isMsci = isMSCI(p.ticker);
            const roe = currentData.metrics?.roe || 0;
            const der = currentData.metrics?.der || 0;
            const divYield = currentData.metrics?.dividendYield || 0;
            const score = currentData.score || 0;
            
            // Rebalance Logic:
            // KEEP/REINVEST if score > 70 and MSCI.
            // SELL if score < 60 or (DER > 2 and ROE < 10)
            let action = 'HOLD';
            if (score < 60 || (der > 2.5 && roe < 8)) {
              action = 'SELL';
            } else if (score >= 75 && isMsci && divYield > 4) {
              action = 'REINVEST';
            }
            
            return {
              ...p,
              currentData,
              isMsci,
              action,
              score,
              divYield
            };
          });
          
          setAnalyzedStocks(analyzed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [portfolio.stocks]);

  const handleSellChange = (index, field, value) => {
    const newForm = [...sellForm];
    newForm[index][field] = field === 'ticker' ? value.toUpperCase() : Number(value);
    setSellForm(newForm);
  };

  const handleBuyChange = (index, field, value) => {
    const newForm = [...buyForm];
    newForm[index][field] = field === 'ticker' ? value.toUpperCase() : Number(value);
    setBuyForm(newForm);
  };

  const addSellRow = () => setSellForm([...sellForm, { ticker: '', lots: 0, price: 0 }]);
  const addBuyRow = () => setBuyForm([...buyForm, { ticker: '', lots: 0, price: 0 }]);
  
  const removeSellRow = (index) => setSellForm(sellForm.filter((_, i) => i !== index));
  const removeBuyRow = (index) => setBuyForm(buyForm.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const month = recordDate.slice(0, 7) + '-RB'; // e.g., 2026-08-RB for Rebalancing
    
    const recordsToSave = [];
    
    // Convert dividend cash to RDPU or just note it? 
    // We will assume dividend cash is part of the buying power and we just record the buys and sells.
    
    sellForm.forEach(s => {
      if (s.ticker && s.lots > 0) {
        recordsToSave.push({
          category: 'SAHAM',
          ticker: s.ticker,
          lots: -s.lots, // Negative lot to reduce portfolio
          price: s.price,
          amount: -(s.lots * s.price * 100), // Negative amount
          notes: `Rebalancing: Jual ${s.lots} Lot`
        });
      }
    });
    
    buyForm.forEach(b => {
      if (b.ticker && b.lots > 0) {
        recordsToSave.push({
          category: 'SAHAM',
          ticker: b.ticker,
          lots: b.lots,
          price: b.price,
          amount: b.lots * b.price * 100,
          notes: `Rebalancing/Reinvest: Beli ${b.lots} Lot`
        });
      }
    });
    
    if (recordsToSave.length === 0) {
      showToast("Tidak ada transaksi untuk disimpan.", "warning");
      return;
    }

    try {
      const res = await fetch('/api/pension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          sbnAvailable: true, // Preserve default
          records: recordsToSave
        })
      });

      if (res.ok) {
        showToast("✅ Berhasil mengeksekusi rebalancing!", "success");
        setShowForm(false);
        setSellForm([{ ticker: '', lots: 0, price: 0 }]);
        setBuyForm([{ ticker: '', lots: 0, price: 0 }]);
        setDividendCash(0);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Gagal menyimpan rebalancing: ${errData.error || 'Error server'}`, "error");
      }
    } catch (err) {
      showToast(`Terjadi kesalahan: ${err.message}`, "error");
    }
  };

  const totalSellValue = sellForm.reduce((sum, s) => sum + (s.lots * s.price * 100), 0);
  const totalBuyValue = buyForm.reduce((sum, b) => sum + (b.lots * b.price * 100), 0);
  const availableCash = dividendCash + totalSellValue;
  const remainingCash = availableCash - totalBuyValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/40 via-orange-900/20 to-slate-50 dark:to-[#0a0f1a] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚖️</span>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Evaluasi & Rebalancing Tahunan</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
            Tinjau ulang performa saham yang telah diakumulasi. Sistem akan membandingkannya dengan indeks <strong>MSCI Indonesia</strong> dan performa fundamental terkini untuk memberi rekomendasi <strong>Hold, Sell, atau Reinvest</strong>.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          {showForm ? '✖ Batal Rebalancing' : '🔄 Mulai Eksekusi Rebalance'}
        </button>
      </div>

      {/* Form Input Rebalancing */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center pb-3 border-b border-slate-300 dark:border-white/10">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                🔄 Form Rebalancing & Reinvestasi Dividen
              </h4>
              <p className="text-[11px] text-slate-700 dark:text-slate-400 mt-1">Gunakan cash dari dividen tahun ini atau jual saham underperform untuk membeli saham bluechip baru.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cash & Date Input */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">📅 Tanggal Eksekusi</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block">💵 Cash Dividen Diterima</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="number"
                    value={dividendCash}
                    onChange={(e) => setDividendCash(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 mt-4 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Total Cash Dividen:</span>
                  <span className="text-emerald-600 font-bold">Rp {dividendCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Hasil Jual Saham:</span>
                  <span className="text-amber-600 font-bold">+ Rp {totalSellValue.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium border-t border-slate-200 dark:border-white/10 pt-2">
                  <span className="text-slate-500">Total Buying Power:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">Rp {availableCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Pembelian Baru:</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">- Rp {totalBuyValue.toLocaleString('id-ID')}</span>
                </div>
                <div className={`flex justify-between text-sm font-black pt-2 ${remainingCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span>Sisa Cash:</span>
                  <span>Rp {remainingCash.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Sell Form */}
            <div className="space-y-3 p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-500/20">
              <h5 className="text-xs font-extrabold text-red-700 dark:text-red-400 flex justify-between items-center">
                <span>📉 Aksi Jual Saham</span>
                <button type="button" onClick={addSellRow} className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-[10px]">+ Tambah</button>
              </h5>
              {sellForm.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5 relative">
                  {idx > 0 && <button type="button" onClick={() => removeSellRow(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] font-bold">×</button>}
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ticker" value={row.ticker} onChange={(e) => handleSellChange(idx, 'ticker', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold uppercase" />
                    <input type="number" placeholder="Lot" value={row.lots || ''} onChange={(e) => handleSellChange(idx, 'lots', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold" />
                    <input type="number" placeholder="Harga" value={row.price || ''} onChange={(e) => handleSellChange(idx, 'price', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold" />
                  </div>
                  <div className="text-[10px] text-right font-bold text-amber-600">Total: Rp {(row.lots * row.price * 100).toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>

            {/* Buy Form */}
            <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
              <h5 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex justify-between items-center">
                <span>📈 Aksi Beli / Reinvestasi</span>
                <button type="button" onClick={addBuyRow} className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px]">+ Tambah</button>
              </h5>
              {buyForm.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5 relative">
                  {idx > 0 && <button type="button" onClick={() => removeBuyRow(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] font-bold">×</button>}
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ticker" value={row.ticker} onChange={(e) => handleBuyChange(idx, 'ticker', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold uppercase" />
                    <input type="number" placeholder="Lot" value={row.lots || ''} onChange={(e) => handleBuyChange(idx, 'lots', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold" />
                    <input type="number" placeholder="Harga" value={row.price || ''} onChange={(e) => handleBuyChange(idx, 'price', e.target.value)} className="w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold" />
                  </div>
                  <div className="text-[10px] text-right font-bold text-indigo-600 dark:text-indigo-400">Total: Rp {(row.lots * row.price * 100).toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-300 dark:border-white/10">
            <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs">Batal</button>
            <button type="submit" disabled={remainingCash < 0 || (totalBuyValue === 0 && totalSellValue === 0)} className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20">💾 Simpan Transaksi Rebalance</button>
          </div>
        </form>
      )}

      {/* Portfolio Evaluation List */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-300 dark:border-white/10">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">Evaluasi Portofolio Pensiun Terkini</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
            <div className="h-12 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
          </div>
        ) : analyzedStocks.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
            Belum ada saham yang diakumulasi. Catat eksekusi di tab Tracker terlebih dahulu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800/30">
              <thead className="bg-slate-100 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saham</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah Kepemilikan</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Index</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skor Kinerja</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                {analyzedStocks.map(stock => (
                  <tr key={stock.ticker} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                          {stock.ticker.substring(0,2)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{stock.ticker}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{stock.currentData?.name || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{stock.lots.toLocaleString('id-ID')} Lot</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Invested: Rp {stock.invested.toLocaleString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {stock.isMsci ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          🌐 MSCI Indonesia
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                          Non-MSCI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center flex flex-col items-center gap-1">
                      <ScoreBadge score={stock.score} />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Yield: {stock.divYield.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {stock.action === 'REINVEST' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 uppercase">
                            ✨ Reinvest
                          </span>
                          <span className="text-[9px] mt-1 text-slate-500 font-bold">Kinerja Solid + MSCI</span>
                        </div>
                      )}
                      {stock.action === 'HOLD' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-300 dark:border-white/20 uppercase">
                            ✊ Hold
                          </span>
                          <span className="text-[9px] mt-1 text-slate-500 font-bold">Kinerja Wajar</span>
                        </div>
                      )}
                      {stock.action === 'SELL' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-300 dark:border-red-800 uppercase">
                            📉 Sell / Ganti
                          </span>
                          <span className="text-[9px] mt-1 text-slate-500 font-bold">Underperform</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── TOAST NOTIFICATION ──────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : toast.type === 'warning'
              ? 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}>
            <span>{toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
