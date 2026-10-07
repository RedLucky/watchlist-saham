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
        showToast("✓ Berhasil mengeksekusi rebalancing!", "success");
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
      <div className="glass-panel p-6 rounded-md border border-warn flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⇄</span>
            <h3 className="text-lg font-extrabold text-ink ">Evaluasi & Rebalancing Tahunan</h3>
          </div>
          <p className="text-xs text-muted font-medium max-w-2xl">
            Tinjau ulang performa saham yang telah diakumulasi. Sistem akan membandingkannya dengan indeks <strong>MSCI Indonesia</strong> dan performa fundamental terkini untuk memberi rekomendasi <strong>Hold, Sell, atau Reinvest</strong>.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary w-full md:w-auto flex items-center justify-center gap-2"
        >
          {showForm ? '× Batal Rebalancing' : '↻ Mulai Eksekusi Rebalance'}
        </button>
      </div>

      {/* Form Input Rebalancing */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-md border border-warn bg-warn-soft space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center pb-3 border-b border-line ">
            <div>
              <h4 className="text-sm font-extrabold text-ink flex items-center gap-2">
                ↻ Form Rebalancing & Reinvestasi Dividen
              </h4>
              <p className="text-[11px] text-ink mt-1">Gunakan cash dari dividen tahun ini atau jual saham underperform untuk membeli saham bluechip baru.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cash & Date Input */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-ink block">▦ Tanggal Eksekusi</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-xs font-bold text-ink "
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-up block">¤ Cash Dividen Diterima</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">Rp</span>
                  <input
                    type="number"
                    value={dividendCash}
                    onChange={(e) => setDividendCash(Number(e.target.value))}
                    className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-xs font-bold text-ink "
                  />
                </div>
              </div>
              
              <div className="p-4 rounded-sm bg-sunken border border-line mt-4 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted">Total Cash Dividen:</span>
                  <span className="text-up font-bold">Rp {dividendCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted">Hasil Jual Saham:</span>
                  <span className="text-warn font-bold">+ Rp {totalSellValue.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium border-t border-line pt-2">
                  <span className="text-muted">Total Buying Power:</span>
                  <span className="text-ink font-extrabold">Rp {availableCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted">Pembelian Baru:</span>
                  <span className="text-down font-bold">- Rp {totalBuyValue.toLocaleString('id-ID')}</span>
                </div>
                <div className={`flex justify-between text-sm font-black pt-2 ${remainingCash >= 0 ? 'text-up ' : 'text-down '}`}>
                  <span>Sisa Cash:</span>
                  <span>Rp {remainingCash.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Sell Form */}
            <div className="space-y-3 p-4 rounded-sm bg-down-soft border border-down">
              <h5 className="text-xs font-extrabold text-down flex justify-between items-center">
                <span>↘ Aksi Jual Saham</span>
                <button type="button" onClick={addSellRow} className="px-2 py-1 rounded bg-down-soft hover:bg-down-soft text-[10px]">+ Tambah</button>
              </h5>
              {sellForm.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-surface rounded-sm border border-line relative">
                  {idx > 0 && <button type="button" onClick={() => removeSellRow(idx)} className="absolute -top-2 -right-2 bg-down text-on-accent rounded-full w-5 h-5 text-[10px] font-bold">×</button>}
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ticker" value={row.ticker} onChange={(e) => handleSellChange(idx, 'ticker', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold uppercase" />
                    <input type="number" placeholder="Lot" value={row.lots || ''} onChange={(e) => handleSellChange(idx, 'lots', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold" />
                    <input type="number" placeholder="Harga" value={row.price || ''} onChange={(e) => handleSellChange(idx, 'price', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold" />
                  </div>
                  <div className="text-[10px] text-right font-bold text-warn">Total: Rp {(row.lots * row.price * 100).toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>

            {/* Buy Form */}
            <div className="space-y-3 p-4 rounded-sm bg-up-soft border border-up">
              <h5 className="text-xs font-extrabold text-up flex justify-between items-center">
                <span>↗ Aksi Beli / Reinvestasi</span>
                <button type="button" onClick={addBuyRow} className="px-2 py-1 rounded bg-up-soft hover:bg-up-soft text-[10px]">+ Tambah</button>
              </h5>
              {buyForm.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-surface rounded-sm border border-line relative">
                  {idx > 0 && <button type="button" onClick={() => removeBuyRow(idx)} className="absolute -top-2 -right-2 bg-down text-on-accent rounded-full w-5 h-5 text-[10px] font-bold">×</button>}
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ticker" value={row.ticker} onChange={(e) => handleBuyChange(idx, 'ticker', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold uppercase" />
                    <input type="number" placeholder="Lot" value={row.lots || ''} onChange={(e) => handleBuyChange(idx, 'lots', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold" />
                    <input type="number" placeholder="Harga" value={row.price || ''} onChange={(e) => handleBuyChange(idx, 'price', e.target.value)} className="w-1/3 bg-sunken border border-line rounded px-2 py-1 text-xs font-bold" />
                  </div>
                  <div className="text-[10px] text-right font-bold text-ink ">Total: Rp {(row.lots * row.price * 100).toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-line ">
            <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-sm bg-sunken hover:bg-sunken text-ink font-bold text-xs">Batal</button>
            <button type="submit" disabled={remainingCash < 0 || (totalBuyValue === 0 && totalSellValue === 0)} className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-sm bg-warn hover:bg-warn disabled:opacity-50 text-on-accent font-extrabold text-xs shadow-lg ">⇩ Simpan Transaksi Rebalance</button>
          </div>
        </form>
      )}

      {/* Portfolio Evaluation List */}
      <div className="glass-panel p-6 rounded-md border border-line ">
        <h3 className="text-sm font-extrabold text-ink mb-4">Evaluasi Portofolio Pensiun Terkini</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-sunken rounded-sm"></div>
            <div className="h-12 bg-sunken rounded-sm"></div>
          </div>
        ) : analyzedStocks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted ">
            Belum ada saham yang diakumulasi. Catat eksekusi di tab Tracker terlebih dahulu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line ">
              <thead className="bg-sunken ">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Saham</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted uppercase tracking-wider">Jumlah Kepemilikan</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase tracking-wider">Status Index</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase tracking-wider">Skor Kinerja</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted uppercase tracking-wider">Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line ">
                {analyzedStocks.map(stock => (
                  <tr key={stock.ticker} className="hover:bg-sunken transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm flex items-center justify-center font-extrabold text-sm border border-line text-ink ">
                          {stock.ticker.substring(0,2)}
                        </div>
                        <div>
                          <div className="font-extrabold text-ink text-sm">{stock.ticker}</div>
                          <div className="text-[10px] text-muted truncate max-w-[150px]">{stock.currentData?.name || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="font-extrabold text-ink text-sm">{stock.lots.toLocaleString('id-ID')} Lot</div>
                      <div className="text-[10px] text-muted font-bold">Invested: Rp {stock.invested.toLocaleString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {stock.isMsci ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sunken text-ink border border-line ">
                          ◎ MSCI Indonesia
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sunken text-muted border border-line ">
                          Non-MSCI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center flex flex-col items-center gap-1">
                      <ScoreBadge score={stock.score} />
                      <span className="text-[10px] font-bold text-up ">Yield: {stock.divYield.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {stock.action === 'REINVEST' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-sm text-[10px] font-black bg-up-soft text-up border border-up uppercase">
                            ✦ Reinvest
                          </span>
                          <span className="text-[9px] mt-1 text-muted font-bold">Kinerja Solid + MSCI</span>
                        </div>
                      )}
                      {stock.action === 'HOLD' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-sm text-[10px] font-black bg-sunken text-ink border border-line uppercase">
                            ✓ Hold
                          </span>
                          <span className="text-[9px] mt-1 text-muted font-bold">Kinerja Wajar</span>
                        </div>
                      )}
                      {stock.action === 'SELL' && (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-sm text-[10px] font-black bg-down-soft text-down border border-down uppercase">
                            ↘ Sell / Ganti
                          </span>
                          <span className="text-[9px] mt-1 text-muted font-bold">Underperform</span>
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
          <div className={`px-4 py-3 rounded-md shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
 toast.type === 'error'
 ? 'bg-down-soft border-down text-down '
 : toast.type === 'warning'
 ? 'bg-warn-soft border-warn text-warn '
 : 'bg-up-soft border-up text-up '
 }`}>
            <span>{toast.type === 'error' ? '×' : toast.type === 'warning' ? '▲' : '✓'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted hover:text-muted text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
