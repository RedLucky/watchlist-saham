'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function PensionTracker({ records, onRefresh, currentCalculations, stockPrices, sbnAvailable }) {
  const growthCanvasRef = useRef(null);
  const streakCanvasRef = useRef(null);

  // Modal & Toast States
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

 // Form Modal State
 const [showForm, setShowForm] = useState(false);
 const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
 const [formSbnAvailable, setFormSbnAvailable] = useState(sbnAvailable);
 const [formSbnAmount, setFormSbnAmount] = useState(currentCalculations.sbnAllocation);
 const [formRdpuAmount, setFormRdpuAmount] = useState(currentCalculations.finalRdpuTopup);
 
 // Stocks form items
 const [formStocks, setFormStocks] = useState(
 currentCalculations.calculatedStocks 
 ? currentCalculations.calculatedStocks.map(st => ({
 ticker: st.ticker,
 lots: st.lots,
 price: st.price,
 amount: st.cost
 }))
 : []
 );

 // Update default form values whenever calculations/prices change
 useEffect(() => {
 setFormSbnAvailable(sbnAvailable);
 setFormSbnAmount(currentCalculations.sbnAllocation);
 setFormRdpuAmount(currentCalculations.finalRdpuTopup);
 setFormStocks(
 currentCalculations.calculatedStocks 
 ? currentCalculations.calculatedStocks.map(st => ({
 ticker: st.ticker,
 lots: st.lots,
 price: st.price,
 amount: st.cost
 }))
 : []
 );
 }, [currentCalculations, stockPrices, sbnAvailable]);

 // Group records by month YYYY-MM
 const monthsGrouped = React.useMemo(() => {
 const map = {};
 records.forEach((r) => {
 if (!map[r.month]) {
 map[r.month] = {
 month: r.month,
 items: [],
 totalAmount: 0,
 sbnAvailable: r.sbnAvailable,
 date: r.date
 };
 }
 map[r.month].items.push(r);
 map[r.month].totalAmount += r.amount || 0;
 });

 return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
 }, [records]);

 // Update stock form row when lot or price changes
 const handleStockFormChange = (index, field, value) => {
 setFormStocks((prev) => {
 const updated = [...prev];
 const row = { ...updated[index], [field]: Math.max(0, Number(value) || 0) };
 // Recalculate amount if lot or price change
 if (field === 'lots' || field === 'price') {
 row.amount = row.lots * row.price * 100;
 }
 updated[index] = row;
 return updated;
 });
 };

 // Submit Form
 const handleSubmitForm = async (e) => {
 e.preventDefault();
 const month = recordDate.slice(0, 7); //"YYYY-MM"

 const recordsToSave = [];

 // SBN Allocation (if checked/available)
 if (formSbnAvailable) {
 recordsToSave.push({
 category: 'SBN',
 ticker: '',
 amount: formSbnAmount,
 notes: 'SBN Ritel'
 });
 }

 // Stocks
 formStocks.forEach((st) => {
 if (st.amount > 0 || st.ticker === 'ANTM') {
 recordsToSave.push({
 category: 'SAHAM',
 ticker: st.ticker,
 lots: st.lots,
 price: st.price,
 amount: st.amount,
 notes: `Pembelian ${st.lots} Lot ${st.ticker}`
 });
 }
 });

 // RDPU
 recordsToSave.push({
 category: 'RDPU',
 ticker: '',
 amount: formRdpuAmount,
 notes: 'Top-up RDPU'
 });

 try {
 const res = await fetch('/api/pension', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 month,
 sbnAvailable: formSbnAvailable,
 records: recordsToSave
 })
 });

      if (res.ok) {
        showToast(`✅ Berhasil menyimpan catatan eksekusi tanggal ${recordDate}!`, 'success');
        setShowForm(false);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Gagal menyimpan catatan eksekusi: ${errData.error || res.statusText || 'Error server'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(`Terjadi kesalahan saat menyimpan data: ${err.message}`, 'error');
    }
  };

  const handleDeleteMonth = (month) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Hapus Catatan Bulanan?',
      message: `Apakah Anda yakin ingin menghapus seluruh catatan eksekusi bulan ${month}?`,
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/pension?month=${month}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Catatan bulan ${month} berhasil dihapus`, 'success');
            if (onRefresh) onRefresh();
          } else {
            showToast('Gagal menghapus catatan', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Terjadi kesalahan saat menghapus', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

 // Draw Asset Growth Chart (Canvas API)
 useEffect(() => {
 const canvas = growthCanvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 const width = canvas.width;
 const height = canvas.height;

 ctx.clearRect(0, 0, width, height);

 const chrono = [...monthsGrouped].reverse();
 if (chrono.length === 0) {
 ctx.fillStyle = '#94a3b8';
 ctx.font = '12px sans-serif';
 ctx.textAlign = 'center';
 ctx.fillText('Belum ada data eksekusi bulanan. Klik"Catat Bulan Ini".', width / 2, height / 2);
 return;
 }

 let cumTotal = 0;
 const points = chrono.map((m) => {
 cumTotal += m.totalAmount;
 return { month: m.month, cumTotal, monthTotal: m.totalAmount };
 });

 const maxVal = Math.max(...points.map((p) => p.cumTotal), 1000000);
 const padding = 40;
 const graphWidth = width - padding * 2;
 const graphHeight = height - padding * 2;

 ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
 ctx.lineWidth = 1;
 for (let i = 0; i <= 4; i++) {
 const y = height - padding - (graphHeight / 4) * i;
 ctx.beginPath();
 ctx.moveTo(padding, y);
 ctx.lineTo(width - padding, y);
 ctx.stroke();

 ctx.fillStyle = '#64748b';
 ctx.font = '9px sans-serif';
 ctx.textAlign = 'right';
 const valLabel = ((maxVal / 4) * i / 1000000).toFixed(1) + 'M';
 ctx.fillText(valLabel, padding - 5, y + 3);
 }

 const coords = points.map((p, idx) => {
 const x = padding + (graphWidth / Math.max(1, points.length - 1)) * (points.length === 1 ? 0.5 : idx);
 const y = height - padding - (p.cumTotal / maxVal) * graphHeight;
 return { x, y, month: p.month, val: p.cumTotal };
 });

 if (coords.length > 0) {
 ctx.beginPath();
 ctx.moveTo(coords[0].x, height - padding);
 coords.forEach((c) => ctx.lineTo(c.x, c.y));
 ctx.lineTo(coords[coords.length - 1].x, height - padding);
 ctx.closePath();

 const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
 gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
 gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
 ctx.fillStyle = gradient;
 ctx.fill();
 }

 ctx.beginPath();
 coords.forEach((c, i) => {
 if (i === 0) ctx.moveTo(c.x, c.y);
 else ctx.lineTo(c.x, c.y);
 });
 ctx.strokeStyle = '#10b981';
 ctx.lineWidth = 3;
 ctx.stroke();

 coords.forEach((c) => {
 ctx.beginPath();
 ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
 ctx.fillStyle = '#10b981';
 ctx.fill();
 ctx.strokeStyle = '#ffffff';
 ctx.lineWidth = 2;
 ctx.stroke();

 ctx.fillStyle = '#94a3b8';
 ctx.font = '10px sans-serif';
 ctx.textAlign = 'center';
 ctx.fillText(c.month, c.x, height - padding + 15);
 });

 }, [monthsGrouped]);

 // Draw Consistency Streak (Bar Chart Canvas API)
 useEffect(() => {
 const canvas = streakCanvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 const width = canvas.width;
 const height = canvas.height;

 ctx.clearRect(0, 0, width, height);

 const chrono = [...monthsGrouped].reverse();
 if (chrono.length === 0) return;

 const padding = 30;
 const graphWidth = width - padding * 2;
 const graphHeight = height - padding * 2;
 const barWidth = Math.min(40, graphWidth / chrono.length - 10);

 const maxVal = Math.max(...chrono.map((m) => m.totalAmount), 1000000);

 chrono.forEach((m, idx) => {
 const x = padding + idx * (graphWidth / chrono.length) + (graphWidth / chrono.length - barWidth) / 2;
 const barH = (m.totalAmount / maxVal) * graphHeight;
 const y = height - padding - barH;

 const grad = ctx.createLinearGradient(0, y, 0, y + barH);
 grad.addColorStop(0, '#6366f1');
 grad.addColorStop(1, '#a855f7');

 ctx.fillStyle = grad;
 ctx.beginPath();
 ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
 ctx.fill();

 ctx.fillStyle = '#94a3b8';
 ctx.font = '9px sans-serif';
 ctx.textAlign = 'center';
 ctx.fillText(m.month, x + barWidth / 2, height - padding + 14);
 });

 }, [monthsGrouped]);

 const currentMonthStr = new Date().toISOString().slice(0, 7);
 const isCurrentMonthRecorded = monthsGrouped.some((m) => m.month === currentMonthStr);

 return (
 <div className="space-y-6">
 {/* Top Banner & Fast Actions */}
 <div className="glass-panel p-6 rounded-2xl border border-slate-300 dark:border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-50 dark:to-[#0a0f1a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-2xl">📈</span>
 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tracker Konsistensi & Growth Aset</h3>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 Catat eksekusi bulanan untuk memantau disiplin investasi pensiun dan pertumbuhan aset riil dari waktu ke waktu.
 </p>
 </div>

 <button
 onClick={() => setShowForm(!showForm)}
 className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 ${
 showForm
 ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
 : isCurrentMonthRecorded
 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold'
 : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold shadow-emerald-500/20'
 }`}
 >
 {showForm ? '✖ Tutup Form Input' : isCurrentMonthRecorded ? '✏️ Edit / Catat Bulan Ini' : '➕ Input Form Catat Bulan Ini'}
 </button>
 </div>

 {/* MODAL FORM INPUT CATATAN */}
 {showForm && (
 <form onSubmit={handleSubmitForm} className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 space-y-5 animate-in fade-in duration-300">
 <div className="flex justify-between items-center pb-3 border-b border-slate-300 dark:border-white/10">
 <div>
 <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
 📝 Form Input Eksekusi Investasi
 </h4>
 <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">Angka otomatis diisi dari alokasi kalkulator saat ini. Anda dapat me-adjust sebelum simpan.</span>
 </div>
 <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
 Total: Rp {((formSbnAvailable ? formSbnAmount : 0) + formRdpuAmount + formStocks.reduce((a, b) => a + b.amount, 0)).toLocaleString('id-ID')}
 </span>
 </div>

 {/* Date Picker */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">📅 Tanggal Eksekusi</label>
 <input
 type="date"
 value={recordDate}
 onChange={(e) => setRecordDate(e.target.value)}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">🏛️ Status SBN Ritel</label>
 <button
 type="button"
 onClick={() => setFormSbnAvailable(!formSbnAvailable)}
 className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold transition-all border ${
 formSbnAvailable
 ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
 : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
 }`}
 >
 {formSbnAvailable ? '✓ SBN Ada Masa Penawaran' : '⚠️ SBN Off (Dialihkan ke RDPU)'}
 </button>
 </div>
 </div>

 {/* Category Allocations */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
 {/* SBN Input */}
 <div className={`p-4 rounded-xl border space-y-2 ${formSbnAvailable ? 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10' : 'bg-slate-200/50 dark:bg-[#0a0f1a]/20 border-slate-300 dark:border-white/5 opacity-50'}`}>
 <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block">1. Nominal SBN Ritel</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">Rp</span>
 <input
 type="number"
 disabled={!formSbnAvailable}
 value={formSbnAvailable ? formSbnAmount : 0}
 onChange={(e) => setFormSbnAmount(Number(e.target.value))}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400"
 />
 </div>
 </div>

 {/* RDPU Input */}
 <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 space-y-2">
 <span className="text-xs font-extrabold text-purple-700 dark:text-purple-400 block">2. Nominal Top-up RDPU</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-slate-700 dark:text-slate-400 font-bold">Rp</span>
 <input
 type="number"
 value={formRdpuAmount}
 onChange={(e) => setFormRdpuAmount(Number(e.target.value))}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-2.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 focus:outline-none focus:border-purple-400"
 />
 </div>
 </div>

 </div>

 {/* Stock Purchases Form */}
 <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 space-y-3">
 <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 block">3. Pembelian Lot Saham</span>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {formStocks.map((st, idx) => (
 <div key={st.ticker} className="p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-extrabold text-slate-900 dark:text-white text-xs">{st.ticker}</span>
 <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold">Total: Rp {(st.amount || 0).toLocaleString('id-ID')}</span>
 </div>
 
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold block">Jumlah Lot</span>
 <input
 type="number"
 value={st.lots}
 onChange={(e) => handleStockFormChange(idx, 'lots', e.target.value)}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300"
 />
 </div>
 <div>
 <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold block">Harga/Lembar (Rp)</span>
 <input
 type="number"
 value={st.price}
 onChange={(e) => handleStockFormChange(idx, 'price', e.target.value)}
 className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs font-bold text-slate-900 dark:text-white"
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Form Action Buttons */}
 <div className="flex justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowForm(false)}
 className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs"
 >
 Batal
 </button>
 <button
 type="submit"
 className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20"
 >
 💾 Simpan Catatan Eksekusi
 </button>
 </div>
 </form>
 )}

 {/* Visual Charts Row */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Asset Growth Chart */}
 <div className="glass-panel p-5 rounded-2xl border border-slate-300 dark:border-white/10 space-y-3">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
 Akumulasi Pertumbuhan Aset (Rp)
 </h4>
 <span className="text-[10px] text-emerald-400 font-medium">Kumulatif</span>
 </div>
 <div className="w-full flex justify-center overflow-x-auto">
 <canvas ref={growthCanvasRef} width={450} height={200} className="w-full max-w-[450px] h-auto"/>
 </div>
 </div>

 {/* Consistency Bar Chart */}
 <div className="glass-panel p-5 rounded-2xl border border-slate-300 dark:border-white/10 space-y-3">
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
 Nominal Setoran Per Bulan
 </h4>
 <span className="text-[10px] text-indigo-400 font-medium">Streak ({monthsGrouped.length} Bulan)</span>
 </div>
 <div className="w-full flex justify-center overflow-x-auto">
 <canvas ref={streakCanvasRef} width={450} height={200} className="w-full max-w-[450px] h-auto"/>
 </div>
 </div>
 </div>

 {/* Execution History Table */}
 <div className="glass-panel p-6 rounded-2xl border border-slate-300 dark:border-white/10 space-y-4">
 <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
 <span>📜</span> Riwayat Eksekusi Menabung Bulanan
 </h4>

 {monthsGrouped.length === 0 ? (
 <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-white/10 rounded-xl">
 Belum ada riwayat eksekusi tersimpan. Klik tombol &quot;Input Form Catat Bulan Ini&quot; untuk mengisi form.
 </div>
 ) : (
 <div className="space-y-4">
 {monthsGrouped.map((mg) => (
 <div key={mg.month} className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 space-y-3">
 <div className="flex justify-between items-center border-b border-slate-300 dark:border-white/10 pb-2">
 <div className="flex items-center gap-3">
 <span className="text-sm font-black text-slate-900 dark:text-white px-2.5 py-1 rounded bg-indigo-500/20 border border-indigo-500/30">
 {mg.month}
 </span>
 <span className="text-xs text-emerald-400 font-bold">
 Total: Rp {mg.totalAmount.toLocaleString('id-ID')}
 </span>
 {!mg.sbnAvailable && (
 <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
 ⚠️ SBN Off (Dialihkan ke RDPU)
 </span>
 )}
 </div>

 <button
 onClick={() => handleDeleteMonth(mg.month)}
 className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
 >
 Hapus
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
 {mg.items.map((item, idx) => (
 <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0a0f1a]/30 border border-slate-200 dark:border-white/5 flex justify-between items-center">
 <div>
 <span className="font-bold text-slate-900 dark:text-white">
 {item.category} {item.ticker ? `(${item.ticker})` : ''}
 </span>
 <div className="text-[10px] text-slate-500 dark:text-slate-400">
 {item.lots ? `${item.lots} Lot @ Rp ${item.price?.toLocaleString('id-ID')}` : item.notes || '-'}
 </div>
 </div>
 <span className="font-semibold text-emerald-300">
 Rp {item.amount.toLocaleString('id-ID')}
 </span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ── MODAL: CUSTOM CONFIRMATION DIALOG ──────────────────────────── */}
 {confirmDialog && confirmDialog.isOpen && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
       <div className="flex items-start gap-3">
         <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
           🗑️
         </div>
         <div>
           <h3 className="text-base font-black text-slate-900 dark:text-white">
             {confirmDialog.title}
           </h3>
           <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
             {confirmDialog.message}
           </p>
         </div>
       </div>

       <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
         <button
           type="button"
           onClick={confirmDialog.onCancel}
           className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
         >
           Batal
         </button>
         <button
           type="button"
           onClick={confirmDialog.onConfirm}
           className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
         >
           {confirmDialog.confirmLabel || 'Ya, Lanjutkan'}
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
