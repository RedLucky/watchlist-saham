'use client';

import React, { useState, useEffect } from 'react';
import ScoreBar from './ScoreBar';
import Tooltip from './Tooltip';
import StockChart from './StockChart';
import { roundToIDXTick, calculateMonitorMetrics } from '@/lib/tradeSetup';

export default function DetailPanel({ stock, mode, styleName }) {
  const [promptModal, setPromptModal] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [isAlreadyBought, setIsAlreadyBought] = useState(false);
  const [toast, setToast] = useState(null);

  // State Modal Pantau Saham
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorEntryPrice, setMonitorEntryPrice] = useState('');
  const [monitorTargetPrice, setMonitorTargetPrice] = useState('');
  const [monitorStopLoss, setMonitorStopLoss] = useState('');
  const [savingMonitor, setSavingMonitor] = useState(false);

  // Keyboard accessibility: dismiss modals on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showMonitorModal) setShowMonitorModal(false);
        if (promptModal) setPromptModal(null);
      }
    };
    if (showMonitorModal || promptModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showMonitorModal, promptModal]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!stock) return null;

  const subScoreEntries = Object.entries(stock.subScores || {});

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
      case 'Rendah': return 'text-up  bg-up-soft border-up font-bold';
      case 'Sedang': return 'text-ink  bg-sunken border-line font-bold';
      case 'Menengah': return 'text-warn  bg-warn-soft border-warn font-bold';
      case 'Tinggi': return 'text-down  bg-down-soft border-down font-bold';
      default: return 'text-ink  bg-sunken border-line font-bold';
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
      showBoughtCheckbox: false,
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
    const defaultEntry = stock.entry?.low || stock.price || 0;
    const defaultTarget = stock.target || (defaultEntry > 0 ? roundToIDXTick(defaultEntry * 1.05) : '');
    const defaultSL = stock.stopLoss || (defaultEntry > 0 ? roundToIDXTick(defaultEntry * 0.95) : '');

    setMonitorEntryPrice(defaultEntry ? defaultEntry.toString() : '');
    setMonitorTargetPrice(defaultTarget ? defaultTarget.toString() : '');
    setMonitorStopLoss(defaultSL ? defaultSL.toString() : '');
    setIsAlreadyBought(false);
    setShowMonitorModal(true);
  };

  const handleSaveMonitor = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const inputPrice = parseFloat(String(monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
    if (!inputPrice || isNaN(inputPrice) || inputPrice <= 0) {
      showToast('Harga entry harus lebih dari 0!', 'error');
      return;
    }

    const inputTarget = monitorTargetPrice ? parseFloat(monitorTargetPrice) : roundToIDXTick(inputPrice * 1.05);
    const inputSL = monitorStopLoss ? parseFloat(monitorStopLoss) : roundToIDXTick(inputPrice * 0.95);
    const risk = inputPrice - inputSL;
    const reward = inputTarget - inputPrice;
    const riskReward = (risk > 0 && reward > 0) ? Number((reward / risk).toFixed(2)) : 1.5;

    const modifiedStock = {
      ...stock,
      price: inputPrice,
      entry: {
        low: inputPrice,
        high: inputPrice
      },
      target: inputTarget,
      stopLoss: inputSL,
      riskReward,
    };

    setSavingMonitor(true);
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stock: modifiedStock,
        mode,
        style: styleName,
        isAlreadyBought: Boolean(isAlreadyBought)
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) showToast(res.error, 'error');
        else if (res.message === 'Already saved today') {
          showToast(`▲ Saham ${stock.ticker} (${styleName || 'swing'}) sudah dipantau hari ini`, 'warning');
        } else {
          const statusDesc = isAlreadyBought ? 'Posisi Aktif' : 'Antri Beli';
          showToast(`◎ ${stock.ticker} mulai dipantau (${statusDesc}) di Win Rate Dashboard dengan harga Rp ${formatPrice(inputPrice)}!`, 'success');
        }
        setShowMonitorModal(false);
      })
      .catch(() => showToast('Gagal menyimpan ke dashboard', 'error'))
      .finally(() => setSavingMonitor(false));
  };

 return (
 <div className="animate-slide-down overflow-hidden">
 <div className="px-4 sm:px-6 pb-6 pt-4 space-y-6">
 
 {/* Real Candlestick Chart */}
 <StockChart ticker={stock.ticker} />

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

 {/* Rincian Skor */}
 <div className="md:col-span-1 lg:col-span-1">
 <h4 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
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
 <div className="mt-3 p-2.5 rounded-sm bg-up-soft border border-up">
 <span className="text-xs text-up">
 ↑ +{stock.sectorBoost} bonus sektor (sektor performa terbaik)
 </span>
 </div>
 )}
 </div>

 {/* Strategi Trading */}
 <div className="lg:col-span-1">
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
 <h4 className="text-sm font-medium text-muted uppercase tracking-wider">
 Strategi Trading
 </h4>
 <div className="grid grid-cols-2 gap-2 sm:flex">
 <button 
 onClick={handleOpenBuyPrompt}
 className="text-[11px] uppercase font-bold px-2.5 py-1.5 bg-warn-soft text-warn hover:bg-warn-soft border border-warn rounded-md transition-colors whitespace-nowrap"
 title="Simulasi beli ke portofolio"
 >
 + Portofolio
 </button>
 <button 
 onClick={handleOpenMonitorPrompt}
 className="text-[11px] uppercase font-bold px-2.5 py-1.5 bg-up-soft text-up hover:bg-up-soft border border-up rounded-md transition-colors whitespace-nowrap"
 title="Catat dan pantau sistem trading ini di Win Rate Dashboard"
 >
 ◎ Pantau
 </button>
 </div>
 </div>

 <div className="space-y-3">
 <div className="p-3 rounded-sm bg-sunken border border-line ">
 <div className="flex items-center justify-between mb-1">
 <Tooltip term="entry">
 <span className="text-xs text-muted ">Area Beli</span>
 </Tooltip>
 <span className="text-xs px-2 py-0.5 rounded-full bg-sunken text-ink border border-line capitalize">
 Setup {stock.setup}
 </span>
 </div>
 <span className="text-lg font-semibold text-ink ">
 {formatPrice(stock.entry.low)} – {formatPrice(stock.entry.high)}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="p-3 rounded-sm bg-sunken border border-line ">
  <Tooltip term="target">
  <span className="text-xs text-muted font-bold">Target Jual</span>
  </Tooltip>
  <div className="text-lg font-black text-up mt-1 font-mono">
  {formatPrice(stock.target)}
  </div>
  <div className="text-[10px] text-up font-bold">
  {targetPct === null ? '-' : `${targetPct > 0 ? '+' : ''}${targetPct}%`}
  </div>
  </div>
  <div className="p-3 rounded-sm bg-sunken border border-line ">
  <Tooltip term="stopLoss">
  <span className="text-xs text-muted font-bold">Cut Loss</span>
  </Tooltip>
  <div className="text-lg font-black text-down bg-down-soft px-2 py-0.5 rounded leading-none inline-block mb-1 font-mono">
  {formatPrice(stock.stopLoss)}
  </div>
  <div className="text-[10px] text-down font-bold block">
  {stopLossPct === null ? '-' : `${stopLossPct}%`}
  </div>
  </div>
  </div>

 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-sm bg-sunken border border-line ">
 <div>
 <Tooltip term="riskReward">
 <span className="text-xs text-muted ">Risk/Reward</span>
 </Tooltip>
 <div className="text-lg font-bold text-ink mt-1">{stock.riskReward}:1</div>
 </div>
 <div className={`px-3 py-1.5 rounded-sm border text-sm font-medium ${getRiskColor(stock.riskLevel?.level)}`}>
 Risiko {stock.riskLevel?.level}
 </div>
 </div>

 {/* Technical Metrics Summary */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
 <div className="flex flex-col">
 <span className="text-[10px] text-muted uppercase">Indikator</span>
 <span className="text-xs text-muted ">
 {stock.subScores?.technical?.metrics?.shortMAName || '-'} / {stock.subScores?.technical?.metrics?.longMAName || '-'}
 </span>
 </div>
 <div className="flex flex-col text-right">
 <span className="text-[10px] text-muted uppercase">RSI ({stock.subScores?.technical?.metrics?.rsiPeriod || (stock.subScores?.technical?.metrics?.shortMAName === 'MA9' ? '7' : '14')})</span>
 <span className="text-xs text-muted ">{stock.subScores?.technical?.metrics?.rsi ?? '-'}</span>
 </div>
 </div>

 {/* Supertrend & DEMA 20 Insights */}
 {stock.supertrendDema && (
 <div className="p-3 rounded-sm bg-sunken border border-line space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-[10px] font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
 <span>»</span> Supertrend + DEMA (20)
 </span>
 <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
 stock.supertrendDema.signal === 'STRONG_BUY' || stock.supertrendDema.signal === 'BUY'
 ? 'bg-up-soft text-up border-up'
 : stock.supertrendDema.signal === 'SELL'
 ? 'bg-down-soft text-down border-down'
 : 'bg-warn-soft text-warn border-warn'
 }`}>
 {stock.supertrendDema.badge}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <span className="text-[10px] text-muted block">DEMA (20)</span>
 <span className="font-bold text-ink ">Rp {formatPrice(stock.supertrendDema.dema20)}</span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted block">Supertrend (10, 3)</span>
 <span className={`font-bold ${stock.supertrendDema.supertrendTrend === 'bullish' ? 'text-up ' : 'text-down '}`}>
 Rp {formatPrice(stock.supertrendDema.supertrendValue)} {stock.supertrendDema.supertrendTrend === 'bullish' ? '●' : '●'}
 </span>
 </div>
 </div>
 <div className="text-[11px] text-muted border-t border-line pt-1.5 font-medium">
 {stock.supertrendDema.label}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Mengapa Saham Ini? */}
 <div className="md:col-span-2 lg:col-span-1">
  <h4 className="text-sm font-bold text-ink uppercase tracking-wider mb-4">
  Mengapa Saham Ini?
  </h4>
  <div className="space-y-2.5">
  {stock.explanations.map((explanation, index) => (
  <div
  key={index}
  className="flex items-start gap-3 p-3 rounded-sm bg-sunken border border-line animate-fade-in"
  style={{ animationDelay: `${index * 0.08}s` }}
  >
  <span className="text-up font-bold mt-0.5 flex-shrink-0">✓</span>
  <p className="text-sm text-ink leading-relaxed font-medium">{explanation}</p>
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
 ? 'border-up bg-up-soft text-up'
 : 'border-line bg-sunken text-ink'
 }`}
 >
 {data.label}: {data.score}
 </span>
 ))}
  </div>
  </div>

  {/* NEW: Shareholder Movement */}
  <div className="lg:col-span-3 mt-2 pt-6 border-t border-line ">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          ▤ Pergerakan Pemegang Saham (Bandarmologi)
        </h4>
        {stock.kseiHistory && stock.kseiHistory.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...stock.kseiHistory].reverse().slice(0, 6).map((sh, idx) => {
              const deltaRetail = sh.deltaRetail || 0;
              const deltaForeign = sh.deltaForeign || 0;
              return (
                <div key={idx} className={`p-3 min-w-[140px] rounded-sm border transition-all ${
 idx === 0 
 ? 'bg-surface border-line shadow-sm'
 : 'bg-sunken border-line '
 }`}>
                  <div className="text-[10px] text-muted font-bold mb-1">{sh.date}</div>
                  <div className="text-xs font-black text-ink ">
                    Ritel: {sh.retailPercent?.toFixed(1) ?? '0.0'}%
                  </div>
                  <div className={`text-[10px] font-bold mt-1 ${
 deltaRetail > 0 ? 'text-up ' : deltaRetail < 0 ? 'text-down ' : 'text-muted '
 }`}>
                    {deltaRetail > 0 ? `↗ Ritel +${Math.abs(deltaRetail).toLocaleString('id-ID')} lbr` :
                     deltaRetail < 0 ? `↘ Ritel -${Math.abs(deltaRetail).toLocaleString('id-ID')} lbr` :
                     '− Ritel 0 lbr'}
                  </div>
                  {deltaForeign !== 0 && (
                    <div className={`text-[9px] font-bold mt-0.5 ${
 deltaForeign > 0 ? 'text-up ' : 'text-down '
 }`}>
                      {deltaForeign > 0 ? `◎ Asing: +${Math.abs(deltaForeign).toLocaleString('id-ID')}` :
                       `◎ Asing: -${Math.abs(deltaForeign).toLocaleString('id-ID')}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : stock.shareholders && stock.shareholders.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stock.shareholders.map((sh, idx) => (
              <div key={idx} className="p-3 min-w-[120px] rounded-sm border bg-surface border-line ">
                <div className="text-[10px] text-muted font-medium mb-1">{sh.month}</div>
                <div className="text-sm font-black text-ink ">
                  {sh.count.toLocaleString('id-ID')}%
                </div>
                <div className="text-[10px] text-muted mt-1">
                  {sh.changePct > 0 ? '+' : ''}{sh.changePct}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted">Data histori kepemilikan KSEI belum tersedia untuk emiten ini.</div>
        )}
        </div>
      
      <div>
        <h4 className="text-sm font-medium text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          » Volume & Smart Money Analysis
        </h4>
        {stock.smartMoney && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-sm bg-sunken border border-line ">
              <span className="text-xs text-muted ">Lonjakan Transaksi Harian</span>
              <span className={`text-sm font-bold ${
 stock.smartMoney.turnoverSpikeRatio > 1.5 ? 'text-warn' : 'text-ink '
 }`}>
                {(stock.smartMoney.turnoverSpikeRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-sm bg-sunken border border-line ">
              <span className="text-xs text-muted ">Status Bandarmologi</span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
 stock.smartMoney.badge === 'emerald' ? 'bg-up-soft text-up border border-up ' :
 stock.smartMoney.badge === 'rose' ? 'bg-down-soft text-down border border-down ' :
 stock.smartMoney.badge === 'amber' ? 'bg-warn-soft text-warn border border-warn ' :
 'bg-sunken text-muted border border-line '
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

      {/* ── MODAL: PANTAU SAHAM LENGKAP & REAKTIF DUA ARAH ────────── */}
      {showMonitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 animate-in fade-in cursor-pointer" role="dialog" aria-modal="true" aria-labelledby="monitor-modal-title" onClick={() => setShowMonitorModal(false)}>
          <div className="bg-surface border border-up rounded-md max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-up-soft text-up flex items-center justify-center text-xl shrink-0">
                  ◎
                </div>
                <div>
                  <h3 id="monitor-modal-title" className="text-base font-black text-ink ">
                    Pantau {stock.ticker}
                  </h3>
                  <p className="text-xs text-muted line-clamp-1">
                    {stock.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMonitorModal(false)}
                className="text-muted hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMonitor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Harga Entry / Beli (Rp) <span className="text-down">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={monitorEntryPrice}
                  onChange={(e) => setMonitorEntryPrice(e.target.value)}
                  placeholder="Misal: 10825"
                  className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Target Harga / TP (Rp)
                  </label>
                  <input
                    type="number"
                    value={monitorTargetPrice}
                    onChange={(e) => setMonitorTargetPrice(e.target.value)}
                    placeholder="Auto: +5%"
                    className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                  />
                  {/* Preset TP Cepat */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-muted font-medium">Preset TP:</span>
                    {[3, 5, 7, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const entry = parseFloat(String(monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
                          if (entry > 0) {
                            setMonitorTargetPrice(roundToIDXTick(entry * (1 + pct / 100)).toString());
                          }
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sunken hover:bg-up-soft text-ink hover:text-up transition-colors cursor-pointer"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Stop Loss / SL (Rp)
                  </label>
                  <input
                    type="number"
                    value={monitorStopLoss}
                    onChange={(e) => setMonitorStopLoss(e.target.value)}
                    placeholder="Auto: -5%"
                    className="w-full px-3.5 py-2 bg-sunken border border-line rounded-sm text-xs font-bold text-ink focus:ring-2 focus:ring-up"
                  />
                  {/* Preset SL Cepat */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-muted font-medium">Preset SL:</span>
                    {[2, 3, 5, 7].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const entry = parseFloat(String(monitorEntryPrice || '').replace(/[^\d.-]/g, ''));
                          if (entry > 0) {
                            setMonitorStopLoss(roundToIDXTick(entry * (1 - pct / 100)).toString());
                          }
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sunken hover:bg-down-soft text-ink hover:text-down transition-colors cursor-pointer"
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Kalkulasi Real-Time Potensi Untung & Risiko Rugi */}
              {(() => {
                const calc = calculateMonitorMetrics(monitorEntryPrice, monitorTargetPrice, monitorStopLoss);
                if (!calc.validEntry) {
                  return (
                    <div className="p-2.5 rounded-sm bg-sunken border border-line text-[11px] text-muted text-center">
                      ✦ Masukkan harga entry untuk melihat kalkulasi keuntungan & risiko kerugian secara real-time
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 p-3 rounded-sm bg-sunken border border-line text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted border-b border-line pb-1.5">
                      <span>Kalkulasi Rencana Pantauan:</span>
                      {calc.rrRatio != null && (
                        <span className="px-1.5 py-0.5 rounded bg-sunken text-ink border border-line font-bold">
                          Risk/Reward: 1 : {calc.rrRatio}x
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Potensi Untung */}
                      <div className={`p-2 rounded-sm border transition-all ${
 calc.hasProfit && calc.profitNominal > 0
 ? 'bg-up-soft border-up text-up '
 : calc.hasProfit && calc.profitNominal < 0
 ? 'bg-down-soft border-down text-down '
 : 'bg-surface border-line text-muted '
 }`}>
                        <div className="text-[10px] font-medium opacity-80 mb-0.5">Potensi Untung (TP)</div>
                        <div className="font-mono font-black text-xs flex flex-col">
                          <span>
                            {calc.hasProfit ? (calc.profitNominal >= 0 ? '+' : '') + `Rp ${calc.profitNominal.toLocaleString('id-ID')}` : '-'}
                          </span>
                          <span className="text-[10px] font-bold">
                            {calc.hasProfit ? `(${calc.profitNominal >= 0 ? '+' : ''}${calc.profitPercent.toFixed(2)}%)` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Risiko Kerugian */}
                      <div className={`p-2 rounded-sm border transition-all ${
 calc.hasLoss && calc.lossNominal > 0
 ? 'bg-down-soft border-down text-down '
 : calc.hasLoss && calc.lossNominal < 0
 ? 'bg-up-soft border-up text-up '
 : 'bg-surface border-line text-muted '
 }`}>
                        <div className="text-[10px] font-medium opacity-80 mb-0.5">Risiko Rugi (SL)</div>
                        <div className="font-mono font-black text-xs flex flex-col">
                          <span>
                            {calc.hasLoss ? `-Rp ${Math.abs(calc.lossNominal).toLocaleString('id-ID')}` : '-'}
                          </span>
                          <span className="text-[10px] font-bold">
                            {calc.hasLoss ? `(-${Math.abs(calc.lossPercent).toFixed(2)}%)` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Checkbox Sudah Beli */}
              <label className="flex items-start gap-2.5 p-3 rounded-sm border border-line bg-sunken cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAlreadyBought}
                  onChange={(e) => setIsAlreadyBought(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-up focus:ring-up border-line cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-ink ">
                    Sudah Beli di Harga Ini (Bukan Antri)
                  </div>
                  <p className="text-[10px] text-muted leading-tight">
                    {isAlreadyBought 
                      ? '✓ Posisi langsung aktif (OPEN) & mulai pantau Target TP/SL.' 
                      : '… Default: Antri Beli. Sistem akan menunggu harga pasar turun ke level beli sebelum memantau Win/Loss.'}
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-line ">
                <button
                  type="button"
                  onClick={() => setShowMonitorModal(false)}
                  className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMonitor}
                  className="px-5 py-2 bg-up hover:bg-up text-on-accent text-xs font-bold rounded-sm shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingMonitor ? 'Menyimpan...' : '◎ Mulai Pantau'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOM PROMPT DIALOG ─────────────────────────────────── */}
      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in cursor-pointer" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title" onClick={() => setPromptModal(null)}>
          <div className="bg-surface border border-line rounded-md max-w-sm w-full p-5 shadow-2xl space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 id="prompt-modal-title" className="text-base font-black text-ink ">
                {promptModal.title}
              </h3>
              <p className="text-xs text-muted mt-1">
                {promptModal.message}
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder={promptModal.placeholder || 'Ketik di sini...'}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    promptModal.onSubmit(promptValue, isAlreadyBought);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-sunken border border-line rounded-sm text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />

              {/* Checkbox Sudah Beli */}
              {promptModal.showBoughtCheckbox && (
                <label className="flex items-start gap-2.5 p-3 rounded-sm border border-line bg-sunken cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAlreadyBought}
                    onChange={(e) => setIsAlreadyBought(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-ink focus:ring-accent border-line cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-ink ">
                      Sudah Beli di Harga Ini (Bukan Antri)
                    </div>
                    <p className="text-[10px] text-muted leading-tight">
                      {isAlreadyBought 
                        ? '✓ Posisi langsung aktif (OPEN) & mulai pantau Target TP/SL.' 
                        : '… Default: Antri Beli. Sistem akan menunggu harga pasar turun ke level beli sebelum memantau Win/Loss.'}
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line ">
              <button
                type="button"
                onClick={() => setPromptModal(null)}
                className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => promptModal.onSubmit(promptValue, isAlreadyBought)}
                className="px-4 py-2 bg-accent hover:bg-accent text-on-accent text-xs font-bold rounded-sm shadow-md transition-all cursor-pointer"
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
          <div className={`px-4 py-3 rounded-md shadow-2xl border text-xs font-bold flex items-center gap-2.5 ${
 toast.type === 'error'
 ? 'bg-down-soft border-down text-down '
 : toast.type === 'warning'
 ? 'bg-warn-soft border-warn text-warn '
 : 'bg-up-soft border-up text-up '
 }`}>
            <span>{toast.type === 'error' ? '×' : toast.type === 'warning' ? '▲' : '✓'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted hover:text-ink text-xs">✕</button>
          </div>
        </div>
      )}
  </div>
  );
}
