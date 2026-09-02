'use client';

import { useState } from 'react';
import ScoreBar from './ScoreBar';
import Tooltip from './Tooltip';
import StockChart from './StockChart';

export default function DetailPanel({ stock, mode, styleName }) {
  const [promptModal, setPromptModal] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!stock) return null;

  const subScoreEntries = Object.entries(stock.subScores);

  const formatPrice = (price) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatPercentFromPrice = (value) => {
    const base = Number(stock?.price);
    const target = Number(value);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(target)) return null;
    return Number((((target - base) / base) * 100).toFixed(1));
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Rendah': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Sedang': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Menengah': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Tinggi': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const targetPct = formatPercentFromPrice(stock.target);
  const stopLossPct = formatPercentFromPrice(stock.stopLoss);

  const handleOpenBuyPrompt = () => {
    setPromptValue('100');
    setPromptModal({
      title: `Beli Saham ${stock.ticker}`,
      message: `Berapa lembar saham ${stock.ticker} yang ingin dibeli? (1 lot = 100 lembar)`,
      placeholder: 'Contoh: 100',
      confirmLabel: '+ Tambah ke Portofolio',
      onSubmit: (val) => {
        const shares = parseInt(val, 10);
        if (shares > 0) {
          fetch('/api/portfolio/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticker: stock.ticker,
              name: stock.name,
              sector: stock.sector,
              price: stock.price,
              shares: shares
            })
          }).then(() => showToast(`${shares} lembar ${stock.ticker} berhasil ditambahkan ke portofolio!`, 'success'));
        }
        setPromptModal(null);
      }
    });
  };

  const handleOpenMonitorPrompt = () => {
    setPromptValue(stock.price ? stock.price.toString() : '');
    setPromptModal({
      title: `Pantau Saham ${stock.ticker}`,
      message: `Masukkan harga entry untuk ${stock.ticker} (default: harga saat ini Rp ${formatPrice(stock.price)}):`,
      placeholder: 'Harga Entry...',
      confirmLabel: 'Mulai Pantau',
      onSubmit: (val) => {
        const inputPrice = parseFloat((val || '').replace(/[^\d.-]/g, ''));
        if (isNaN(inputPrice) || inputPrice <= 0) {
          showToast('Harga entry tidak valid!', 'error');
          return;
        }

        const modifiedStock = {
          ...stock,
          price: inputPrice,
          entry: {
            low: inputPrice,
            high: inputPrice
          }
        };

        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock: modifiedStock,
            mode,
            style: styleName
          })
        })
          .then(r => r.json())
          .then(res => {
            if (res.error) showToast(res.error, 'error');
            else if (res.message) showToast(res.message, 'success');
            else showToast(`${stock.ticker} mulai dipantau di Win Rate Dashboard dengan harga entry Rp ${formatPrice(inputPrice)}!`, 'success');
          })
          .catch(() => showToast('Gagal menyimpan ke dashboard', 'error'));

        setPromptModal(null);
      }
    });
  };

 return (
 <div className="animate-slide-down overflow-hidden">
 <div className="px-4 sm:px-6 pb-6 pt-4 space-y-6">
 
 {/* Real Candlestick Chart */}
 <StockChart ticker={stock.ticker} />

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Rincian Skor */}
 <div className="lg:col-span-1">
 <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
 Rincian Skor
 </h4>
 <div className="space-y-3">
 {subScoreEntries.map(([key, data]) => (
 <Tooltip key={key} term={key} className="w-full">
 <ScoreBar
 label={data.label}
 score={data.score}
 weight={data.weight}
 />
 </Tooltip>
 ))}
 </div>
 {stock.sectorBoost > 0 && (
 <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
 <span className="text-xs text-emerald-400">
 🔥 +{stock.sectorBoost} bonus sektor (sektor performa terbaik)
 </span>
 </div>
 )}
 </div>

 {/* Strategi Trading */}
 <div className="lg:col-span-1">
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
 <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 Strategi Trading
 </h4>
 <div className="grid grid-cols-2 gap-2 sm:flex">
 <button 
 onClick={handleOpenBuyPrompt}
 className="text-[11px] uppercase font-bold px-2.5 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors whitespace-nowrap"
 title="Simulasi beli ke portofolio"
 >
 + Portofolio
 </button>
 <button 
 onClick={handleOpenMonitorPrompt}
 className="text-[11px] uppercase font-bold px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-colors whitespace-nowrap"
 title="Catat dan pantau sistem trading ini di Win Rate Dashboard"
 >
 🎯 Pantau
 </button>
 </div>
 </div>

 <div className="space-y-3">
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
 <div className="flex items-center justify-between mb-1">
 <Tooltip term="entry">
 <span className="text-xs text-slate-500 dark:text-slate-400">Area Beli</span>
 </Tooltip>
 <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
 Setup {stock.setup}
 </span>
 </div>
 <span className="text-lg font-semibold text-slate-900 dark:text-white">
 {formatPrice(stock.entry.low)} – {formatPrice(stock.entry.high)}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
 <Tooltip term="target">
 <span className="text-xs text-slate-500 dark:text-slate-400">Target Jual</span>
 </Tooltip>
 <div className="text-lg font-semibold text-emerald-400 mt-1">
 {formatPrice(stock.target)}
 </div>
 <div className="text-[10px] text-emerald-400/60">
 {targetPct === null ? '-' : `${targetPct > 0 ? '+' : ''}${targetPct}%`}
 </div>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
 <Tooltip term="stopLoss">
 <span className="text-xs text-slate-500 dark:text-slate-400">Cut Loss</span>
 </Tooltip>
 <div className="text-lg font-semibold text-red-600 dark:text-red-300 bg-red-500/10 px-2 py-0.5 rounded leading-none inline-block mb-1">
 {formatPrice(stock.stopLoss)}
 </div>
 <div className="text-[10px] text-red-400/60 block">
 {stopLossPct === null ? '-' : `${stopLossPct}%`}
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
 <div>
 <Tooltip term="riskReward">
 <span className="text-xs text-slate-500 dark:text-slate-400">Risk/Reward</span>
 </Tooltip>
 <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stock.riskReward}:1</div>
 </div>
 <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${getRiskColor(stock.riskLevel?.level)}`}>
 Risiko {stock.riskLevel?.level}
 </div>
 </div>

 {/* Technical Metrics Summary */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
 <div className="flex flex-col">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Indikator</span>
 <span className="text-xs text-slate-400 dark:text-slate-500">
 {stock.subScores.technical.metrics?.shortMAName || '-'} / {stock.subScores.technical.metrics?.longMAName || '-'}
 </span>
 </div>
 <div className="flex flex-col text-right">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">RSI ({stock.subScores.technical.metrics?.rsiPeriod || (stock.subScores.technical.metrics?.shortMAName === 'MA9' ? '7' : '14')})</span>
 <span className="text-xs text-slate-400 dark:text-slate-500">{stock.subScores.technical.metrics?.rsi}</span>
 </div>
 </div>

 {/* Supertrend & DEMA 20 Insights */}
 {stock.supertrendDema && (
 <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
 <span>⚡</span> Supertrend + DEMA (20)
 </span>
 <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
 stock.supertrendDema.signal === 'STRONG_BUY' || stock.supertrendDema.signal === 'BUY'
 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
 : stock.supertrendDema.signal === 'SELL'
 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
 : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
 }`}>
 {stock.supertrendDema.badge}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <span className="text-[10px] text-slate-500 dark:text-slate-400 block">DEMA (20)</span>
 <span className="font-bold text-slate-900 dark:text-white">Rp {formatPrice(stock.supertrendDema.dema20)}</span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Supertrend (10, 3)</span>
 <span className={`font-bold ${stock.supertrendDema.supertrendTrend === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
 Rp {formatPrice(stock.supertrendDema.supertrendValue)} {stock.supertrendDema.supertrendTrend === 'bullish' ? '🟢' : '🔴'}
 </span>
 </div>
 </div>
 <div className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-indigo-200/60 dark:border-indigo-500/10 pt-1.5 font-medium">
 {stock.supertrendDema.label}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Mengapa Saham Ini? */}
 <div className="lg:col-span-1">
 <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
 Mengapa Saham Ini?
 </h4>
 <div className="space-y-2.5">
 {stock.explanations.map((explanation, index) => (
 <div
 key={index}
 className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] animate-fade-in"
 style={{ animationDelay: `${index * 0.08}s` }}
 >
 <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
 <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">{explanation}</p>
 </div>
 ))}
 </div>

 {/* Score detail pills */}
 <div className="mt-4 flex flex-wrap gap-2">
 {subScoreEntries
 .filter(([, data]) => data.score >= 70)
 .map(([key, data]) => (
 <span
 key={key}
 className={`text-[11px] px-2 py-1 rounded-full border ${
 data.score >= 85
 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
 : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
 }`}
 >
 {data.label}: {data.score}
 </span>
 ))}
  </div>
  </div>

  {/* NEW: Shareholder Movement */}
  <div className="lg:col-span-3 mt-2 pt-6 border-t border-slate-200 dark:border-slate-800/30">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          📊 Pergerakan Pemegang Saham (Bandarmologi)
        </h4>
        {stock.kseiHistory && stock.kseiHistory.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...stock.kseiHistory].reverse().slice(0, 6).map((sh, idx) => {
              const deltaRetail = sh.deltaRetail || 0;
              const deltaForeign = sh.deltaForeign || 0;
              return (
                <div key={idx} className={`p-3 min-w-[140px] rounded-xl border transition-all ${
                  idx === 0 
                    ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-slate-600 shadow-sm'
                    : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                }`}>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">{sh.date}</div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Ritel: {sh.retailPercent?.toFixed(1) ?? '0.0'}%
                  </div>
                  <div className={`text-[10px] font-bold mt-1 ${
                    deltaRetail > 0 ? 'text-emerald-600 dark:text-emerald-400' : deltaRetail < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {deltaRetail > 0 ? `📈 Ritel +${Math.abs(deltaRetail).toLocaleString('id-ID')} lbr` :
                     deltaRetail < 0 ? `📉 Ritel -${Math.abs(deltaRetail).toLocaleString('id-ID')} lbr` :
                     '➖ Ritel 0 lbr'}
                  </div>
                  {deltaForeign !== 0 && (
                    <div className={`text-[9px] font-bold mt-0.5 ${
                      deltaForeign > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {deltaForeign > 0 ? `🌐 Asing: +${Math.abs(deltaForeign).toLocaleString('id-ID')}` :
                       `🌐 Asing: -${Math.abs(deltaForeign).toLocaleString('id-ID')}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : stock.shareholders && stock.shareholders.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stock.shareholders.map((sh, idx) => (
              <div key={idx} className="p-3 min-w-[120px] rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">{sh.month}</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {sh.count.toLocaleString('id-ID')}%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {sh.changePct > 0 ? '+' : ''}{sh.changePct}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Data histori kepemilikan KSEI belum tersedia untuk emiten ini.</div>
        )}
        </div>
      
      <div>
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          ⚡ Volume & Smart Money Analysis
        </h4>
        {stock.smartMoney && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Lonjakan Transaksi Harian</span>
              <span className={`text-sm font-bold ${
                stock.smartMoney.turnoverSpikeRatio > 1.5 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {(stock.smartMoney.turnoverSpikeRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status Bandarmologi</span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                stock.smartMoney.badge === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                stock.smartMoney.badge === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                stock.smartMoney.badge === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {stock.smartMoney.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  </div>
  </div>

      {/* ── MODAL: CUSTOM PROMPT DIALOG ─────────────────────────────────── */}
      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {promptModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {promptModal.message}
              </p>
            </div>

            <input
              type="text"
              autoFocus
              placeholder={promptModal.placeholder || 'Ketik di sini...'}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  promptModal.onSubmit(promptValue);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPromptModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => promptModal.onSubmit(promptValue)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                {promptModal.confirmLabel || 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

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
