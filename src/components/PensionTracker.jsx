'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { readThemeTokens, withAlpha, isDarkTheme } from '@/lib/chartTheme';
import { PageShell, PageHeader } from './ui/PageShell';

export default function PensionTracker({ records, onRefresh, currentCalculations, stockPrices, sbnAvailable }) {
  const growthCanvasRef = useRef(null);
  const streakCanvasRef = useRef(null);
  const formRef = useRef(null);

  // Modal & Toast States
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form Modal State
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingDate, setEditingDate] = useState(null); // 'YYYY-MM-DD' when editing
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [formSbnAvailable, setFormSbnAvailable] = useState(sbnAvailable ?? true);
  const [formSbnAmount, setFormSbnAmount] = useState(currentCalculations?.sbnAllocation || 0);
  const [formRdpuAmount, setFormRdpuAmount] = useState(currentCalculations?.finalRdpuTopup || 0);
  
  // Stocks form items
  const [formStocks, setFormStocks] = useState(
    currentCalculations?.calculatedStocks 
      ? currentCalculations.calculatedStocks.map(st => ({
          ticker: st.ticker,
          lots: st.lots ?? 0,
          price: st.price ?? 0,
          amount: st.cost ?? 0
        }))
      : []
  );

  // Update default form values whenever calculations/prices change (only if creating new and form closed)
  useEffect(() => {
    if (!showForm || formMode !== 'edit') {
      setFormSbnAvailable(sbnAvailable ?? true);
      setFormSbnAmount(currentCalculations?.sbnAllocation || 0);
      setFormRdpuAmount(currentCalculations?.finalRdpuTopup || 0);
      setFormStocks(
        currentCalculations?.calculatedStocks 
          ? currentCalculations.calculatedStocks.map(st => ({
              ticker: st.ticker,
              lots: st.lots ?? 0,
              price: st.price ?? 0,
              amount: st.cost ?? 0
            }))
          : []
      );
    }
  }, [currentCalculations, stockPrices, sbnAvailable, showForm, formMode]);

  // Group records by Month YYYY-MM, and inside each month group by Execution Date
  const monthsGrouped = useMemo(() => {
    const monthMap = {};

    (records || []).forEach((r) => {
      const monthKey = r.month || (r.date ? r.date.slice(0, 7) : new Date().toISOString().slice(0, 7));
      const dateKey = r.date ? r.date.slice(0, 10) : `${monthKey}-01`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          totalAmount: 0,
          totalStocks: 0,
          totalSbn: 0,
          totalRdpu: 0,
          sbnAvailable: r.sbnAvailable ?? true,
          dateMap: {},
          stockBreakdown: {} // { TICKER: totalLots }
        };
      }

      const mObj = monthMap[monthKey];
      const itemAmount = Number(r.amount) || 0;
      mObj.totalAmount += itemAmount;

      if (r.category === 'SAHAM') {
        mObj.totalStocks += itemAmount;
        if (r.ticker) {
          mObj.stockBreakdown[r.ticker] = (mObj.stockBreakdown[r.ticker] || 0) + (r.lots || 0);
        }
      } else if (r.category === 'SBN') {
        mObj.totalSbn += itemAmount;
        if (r.sbnAvailable === false) mObj.sbnAvailable = false;
      } else if (r.category === 'RDPU') {
        mObj.totalRdpu += itemAmount;
      }

      // Group by execution date inside month
      if (!mObj.dateMap[dateKey]) {
        mObj.dateMap[dateKey] = {
          dateStr: dateKey,
          formattedDate: formatDateIndo(dateKey),
          sbnAvailable: r.sbnAvailable ?? true,
          totalAmount: 0,
          items: []
        };
      }

      mObj.dateMap[dateKey].items.push(r);
      mObj.dateMap[dateKey].totalAmount += itemAmount;
      if (r.sbnAvailable === false) {
        mObj.dateMap[dateKey].sbnAvailable = false;
      }
    });

    return Object.values(monthMap)
      .map(m => ({
        ...m,
        executions: Object.values(m.dateMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr))
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [records]);

  function formatDateIndo(dateString) {
    try {
      const d = new Date(`${dateString}T00:00:00`);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // Handle Open Create Form
  const handleOpenAddForm = () => {
    setFormMode('create');
    setEditingDate(null);
    setRecordDate(new Date().toISOString().slice(0, 10));
    setFormSbnAvailable(sbnAvailable ?? true);
    setFormSbnAmount(currentCalculations?.sbnAllocation || 0);
    setFormRdpuAmount(currentCalculations?.finalRdpuTopup || 0);
    setFormStocks(
      currentCalculations?.calculatedStocks 
        ? currentCalculations.calculatedStocks.map(st => ({
            ticker: st.ticker,
            lots: st.lots ?? 0,
            price: st.price ?? 0,
            amount: st.cost ?? 0
          }))
        : []
    );
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  // Handle Open Edit Form with Auto-fill from selected execution
  const handleOpenEditForm = (execSession) => {
    setFormMode('edit');
    setEditingDate(execSession.dateStr);
    setRecordDate(execSession.dateStr);

    const sbnItem = execSession.items.find(i => i.category === 'SBN');
    const rdpuItem = execSession.items.find(i => i.category === 'RDPU');
    const stockItems = execSession.items.filter(i => i.category === 'SAHAM');

    setFormSbnAvailable(sbnItem ? (sbnItem.sbnAvailable ?? true) : execSession.sbnAvailable ?? true);
    setFormSbnAmount(sbnItem ? (sbnItem.amount || 0) : 0);
    setFormRdpuAmount(rdpuItem ? (rdpuItem.amount || 0) : 0);

    if (stockItems.length > 0) {
      setFormStocks(
        stockItems.map(st => ({
          ticker: st.ticker,
          lots: st.lots ?? 0,
          price: st.price ?? 0,
          amount: st.amount ?? ((st.lots ?? 0) * (st.price ?? 0) * 100)
        }))
      );
    } else if (currentCalculations?.calculatedStocks) {
      setFormStocks(
        currentCalculations.calculatedStocks.map(st => ({
          ticker: st.ticker,
          lots: 0,
          price: st.price ?? 0,
          amount: 0
        }))
      );
    }

    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  // Add a new empty stock row to the form
  const handleAddStockRow = () => {
    setFormStocks((prev) => [
      ...prev,
      { ticker: '', lots: 0, price: 0, amount: 0 }
    ]);
  };

  // Remove a specific stock row from the form
  const handleRemoveStockRow = (index) => {
    setFormStocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update stock form row when ticker, lot or price changes
  const handleStockFormChange = (index, field, value) => {
    setFormStocks((prev) => {
      const updated = [...prev];
      if (field === 'ticker') {
        const cleanTicker = String(value || '').toUpperCase().trim();
        updated[index] = { ...updated[index], ticker: cleanTicker };
      } else {
        const row = { ...updated[index], [field]: Math.max(0, Number(value) || 0) };
        row.amount = (row.lots || 0) * (row.price || 0) * 100;
        updated[index] = row;
      }
      return updated;
    });
  };

  // Submit Form (Save / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const month = recordDate.slice(0, 7); // "YYYY-MM"

    const recordsToSave = [];

    // 1. SBN Allocation
    recordsToSave.push({
      category: 'SBN',
      ticker: '',
      amount: formSbnAvailable ? (Number(formSbnAmount) || 0) : 0,
      notes: formSbnAvailable ? 'SBN Ritel' : 'SBN Off'
    });

    // 2. Stocks - save only rows with valid ticker, omit empty/deleted ones
    formStocks.forEach((st) => {
      const cleanTicker = String(st.ticker || '').trim().toUpperCase();
      if (cleanTicker) {
        const lots = Math.max(0, Number(st.lots) || 0);
        const price = Math.max(0, Number(st.price) || 0);
        const amount = lots * price * 100;
        recordsToSave.push({
          category: 'SAHAM',
          ticker: cleanTicker,
          lots,
          price,
          amount,
          notes: lots > 0 ? `Pembelian ${lots} Lot ${cleanTicker}` : `Alokasi 0 Lot ${cleanTicker}`
        });
      }
    });

    // 3. RDPU
    recordsToSave.push({
      category: 'RDPU',
      ticker: '',
      amount: Number(formRdpuAmount) || 0,
      notes: 'Top-up RDPU'
    });

    try {
      const res = await fetch('/api/pension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          date: recordDate,
          editingDate: formMode === 'edit' ? editingDate : null,
          sbnAvailable: formSbnAvailable,
          records: recordsToSave
        })
      });

      if (res.ok) {
        showToast(
          formMode === 'edit'
            ? `✓ Berhasil memperbarui catatan eksekusi tanggal ${formatDateIndo(recordDate)}!`
            : `✓ Berhasil menyimpan catatan eksekusi tanggal ${formatDateIndo(recordDate)}!`,
          'success'
        );
        setShowForm(false);
        setEditingDate(null);
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

  // Delete an entire month
  const handleDeleteMonth = (month) => {
    setConfirmDialog({
      isOpen: true,
      title: '⌫ Hapus Catatan Bulanan?',
      message: `Apakah Anda yakin ingin menghapus seluruh catatan eksekusi untuk bulan ${month}?`,
      confirmLabel: 'Ya, Hapus Bulan Ini',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/pension?month=${month}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Seluruh catatan bulan ${month} berhasil dihapus`, 'success');
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

  // Delete a specific execution date
  const handleDeleteDate = (dateStr) => {
    setConfirmDialog({
      isOpen: true,
      title: '⌫ Hapus Eksekusi Tanggal?',
      message: `Apakah Anda yakin ingin menghapus catatan eksekusi tanggal ${formatDateIndo(dateStr)}?`,
      confirmLabel: 'Ya, Hapus Tanggal Ini',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/pension?date=${dateStr}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Catatan tanggal ${formatDateIndo(dateStr)} berhasil dihapus`, 'success');
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
 const tokens = readThemeTokens(isDarkTheme());
   const canvas = growthCanvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 const width = canvas.width;
 const height = canvas.height;

 ctx.clearRect(0, 0, width, height);

 const chrono = [...monthsGrouped].reverse();
 if (chrono.length === 0) {
 ctx.fillStyle = tokens.muted;
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

 ctx.strokeStyle = tokens.line;
 ctx.lineWidth = 1;
 for (let i = 0; i <= 4; i++) {
 const y = height - padding - (graphHeight / 4) * i;
 ctx.beginPath();
 ctx.moveTo(padding, y);
 ctx.lineTo(width - padding, y);
 ctx.stroke();

 ctx.fillStyle = tokens.muted;
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
 gradient.addColorStop(0, withAlpha(tokens.up, 0.35));
 gradient.addColorStop(1, withAlpha(tokens.up, 0));
 ctx.fillStyle = gradient;
 ctx.fill();
 }

 ctx.beginPath();
 coords.forEach((c, i) => {
 if (i === 0) ctx.moveTo(c.x, c.y);
 else ctx.lineTo(c.x, c.y);
 });
 ctx.strokeStyle = tokens.up;
 ctx.lineWidth = 3;
 ctx.stroke();

 coords.forEach((c) => {
 ctx.beginPath();
 ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
 ctx.fillStyle = tokens.up;
 ctx.fill();
 ctx.strokeStyle = tokens.canvas;
 ctx.lineWidth = 2;
 ctx.stroke();

 ctx.fillStyle = tokens.muted;
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
 grad.addColorStop(0, tokens.ink);
 grad.addColorStop(1, withAlpha(tokens.muted, 0.6));

 ctx.fillStyle = grad;
 ctx.beginPath();
 ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
 ctx.fill();

 ctx.fillStyle = tokens.muted;
 ctx.font = '9px sans-serif';
 ctx.textAlign = 'center';
 ctx.fillText(m.month, x + barWidth / 2, height - padding + 14);
 });

 }, [monthsGrouped]);

  return (
    <PageShell>
      <PageHeader
        title="Tracker Pensiun"
        subtitle="Catat eksekusi investasi berkala dan pantau akumulasi aset investasi secara rapi per bulan"
        badge={<span className="badge badge-outline">per bulan</span>}
      />

      {/* Top Banner & Fast Actions */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="section-title">Konsistensi & Pertumbuhan Aset</h3>
          <p className="section-subtitle mt-1">
            Catat setiap pembelian dan setoran rutin agar progres menuju target dana terlihat.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingDate(null);
            } else {
              handleOpenAddForm();
            }
          }}
          className={`px-5 py-2.5 rounded-sm font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 ${
 showForm
 ? 'bg-warn-soft text-warn border border-warn hover:bg-warn-soft'
 : 'bg-accent text-on-accent font-extrabold'
 }`}
        >
          {showForm ? '× Tutup Form Input' : '+ Tambah Catatan Eksekusi'}
        </button>
      </div>

      {/* MODAL FORM INPUT CATATAN */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmitForm}
          className="glass-panel p-4 sm:p-6 rounded-md border border-up bg-up-soft space-y-5 animate-in fade-in duration-300 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-line ">
            <div>
              <h4 className="text-sm font-black text-ink flex items-center gap-2">
                <span>{formMode === 'edit' ? '✎' : '✎'}</span>
                {formMode === 'edit'
                  ? `Edit Catatan Eksekusi (${formatDateIndo(recordDate)})`
                  : 'Form Input Catatan Eksekusi Investasi'}
              </h4>
              <span className="text-[11px] text-muted font-medium">
                {formMode === 'edit'
                  ? 'Data telah diisi otomatis dari catatan yang dipilih. Anda dapat menyesuaikan angka lalu klik simpan.'
                  : 'Angka otomatis disesuaikan dari kalkulator. Anda dapat menambah eksekusi baru kapan saja.'}
              </span>
            </div>
            <span className="text-xs font-black text-up bg-up-soft px-3 py-1.5 rounded-sm border border-up self-start sm:self-auto font-mono">
              Total Eksekusi: Rp {((formSbnAvailable ? formSbnAmount : 0) + formRdpuAmount + formStocks.reduce((a, b) => a + (b.amount || 0), 0)).toLocaleString('id-ID')}
            </span>
          </div>

          {/* Date Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink block">
                ▦ Tanggal Eksekusi (Bisa Beda Tanggal di Bulan yang Sama)
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-up shadow-2xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink block">▥ Status SBN Ritel</label>
              <button
                type="button"
                onClick={() => setFormSbnAvailable(!formSbnAvailable)}
                className={`w-full py-2 px-3 rounded-sm text-xs font-extrabold transition-all border cursor-pointer shadow-2xs ${
 formSbnAvailable
 ? 'bg-up-soft text-up border-up'
 : 'bg-warn-soft text-warn border-warn'
 }`}
              >
                {formSbnAvailable ? '✓ SBN Ada Masa Penawaran' : '▲ SBN Off (Dialihkan ke RDPU)'}
              </button>
            </div>
          </div>

          {/* Category Allocations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SBN Input */}
            <div className={`p-4 rounded-sm border space-y-2 ${formSbnAvailable ? 'bg-surface border-line ' : 'bg-sunken border-line opacity-50'}`}>
              <span className="text-xs font-extrabold text-up block">1. Nominal SBN Ritel</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink font-bold">Rp</span>
                <input
                  type="number"
                  disabled={!formSbnAvailable}
                  value={formSbnAvailable ? formSbnAmount : 0}
                  onChange={(e) => setFormSbnAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-sunken border border-line rounded px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-up"
                />
              </div>
            </div>

            {/* RDPU Input */}
            <div className="p-4 rounded-sm bg-surface border border-line space-y-2">
              <span className="text-xs font-extrabold text-ink block">2. Nominal Top-up RDPU</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink font-bold">Rp</span>
                <input
                  type="number"
                  value={formRdpuAmount}
                  onChange={(e) => setFormRdpuAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-sunken border border-line rounded px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Stock Purchases Form */}
          <div className="p-4 rounded-sm bg-surface border border-line space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-extrabold text-ink block">
                  3. Pembelian Lot Saham
                </span>
                <span className="text-[10px] text-muted ">
                  Emiten bisa diganti, dihapus jika tidak diisi, atau ditambah emiten baru.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted font-bold">
                  Subtotal: Rp {formStocks.reduce((a, b) => a + (b.amount || 0), 0).toLocaleString('id-ID')}
                </span>
                <button
                  type="button"
                  onClick={handleAddStockRow}
                  className="px-2.5 py-1 rounded-sm bg-sunken hover:bg-sunken text-ink border border-line text-[11px] font-extrabold transition-all flex items-center gap-1"
                >
                  <span>+</span> Tambah Saham
                </button>
              </div>
            </div>
            
            {formStocks.length === 0 ? (
              <div className="p-4 rounded-sm bg-sunken border border-dashed border-line text-center text-xs text-muted space-y-1">
                <p>Tidak ada saham dalam daftar eksekusi ini.</p>
                <button
                  type="button"
                  onClick={handleAddStockRow}
                  className="text-xs text-ink font-bold underline"
                >
                  + Tambah Saham Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formStocks.map((st, idx) => (
                  <div key={idx} className="p-3 rounded-sm bg-sunken border border-line space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[10px] font-extrabold text-muted">#{idx + 1}</span>
                        <input
                          type="text"
                          value={st.ticker}
                          onChange={(e) => handleStockFormChange(idx, 'ticker', e.target.value)}
                          placeholder="Kode (BBCA)"
                          className="w-24 uppercase font-black text-xs bg-surface border border-line rounded px-2 py-1 text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-up font-extrabold">
                          Rp {(st.amount || 0).toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStockRow(idx)}
                          title="Hapus saham ini dari daftar"
                          className="p-1 rounded text-muted hover:text-down hover:bg-down-soft transition-colors"
                        >
                          ⌫
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted font-bold block">Jumlah Lot</span>
                        <input
                          type="number"
                          min="0"
                          value={st.lots}
                          onChange={(e) => handleStockFormChange(idx, 'lots', e.target.value)}
                          className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-extrabold text-up focus:outline-none focus:border-up"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted font-bold block">Harga/Lembar (Rp)</span>
                        <input
                          type="number"
                          min="0"
                          value={st.price}
                          onChange={(e) => handleStockFormChange(idx, 'price', e.target.value)}
                          className="w-full bg-surface border border-line rounded px-2 py-1 text-xs font-bold text-ink focus:outline-none focus:border-up"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingDate(null);
              }}
              className="px-4 py-2 rounded-sm bg-sunken hover:bg-sunken text-ink font-bold text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-sm bg-up hover:bg-up text-on-accent font-extrabold text-xs shadow-lg flex items-center gap-1.5"
            >
              <span>⇩</span>
              {formMode === 'edit' ? 'Update Catatan Eksekusi' : 'Simpan Catatan Eksekusi'}
            </button>
          </div>
        </form>
      )}

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Growth Chart */}
        <div className="glass-panel p-5 rounded-md border border-line space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-up"></span>
              Akumulasi Pertumbuhan Aset (Rp)
            </h4>
            <span className="text-[10px] text-up font-medium">Kumulatif</span>
          </div>
          <div className="w-full flex justify-center overflow-x-auto">
            <canvas ref={growthCanvasRef} width={900} height={220} className="w-full h-auto block"/>
          </div>
        </div>

        {/* Consistency Bar Chart */}
        <div className="glass-panel p-5 rounded-md border border-line space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Nominal Setoran Per Bulan
            </h4>
            <span className="text-[10px] text-ink font-medium">Streak ({monthsGrouped.length} Bulan)</span>
          </div>
          <div className="w-full flex justify-center overflow-x-auto">
            <canvas ref={streakCanvasRef} width={900} height={220} className="w-full h-auto block"/>
          </div>
        </div>
      </div>

      {/* Execution History Grouped Per Month */}
      <div className="glass-panel p-6 rounded-md border border-line space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <span>▤</span> Riwayat & Laporan Eksekusi (Dikelompokkan Per Bulan)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Seluruh transaksi per tanggal dikelompokkan dan ditotal secara otomatis per bulan kalender.
            </p>
          </div>
          <button
            onClick={handleOpenAddForm}
            className="px-3.5 py-1.5 rounded-sm bg-up-soft hover:bg-up-soft text-up border border-up font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Tambah Catatan Baru
          </button>
        </div>

        {monthsGrouped.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted border border-dashed border-line rounded-sm space-y-2">
            <div className="text-2xl">✎</div>
            <p>Belum ada riwayat eksekusi tersimpan.</p>
            <p className="text-[11px] text-muted">Klik tombol &quot;Tambah Catatan Eksekusi&quot; untuk mencatat setoran investasi pertama Anda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {monthsGrouped.map((mg) => (
              <div key={mg.month} className="p-5 rounded-md bg-sunken border border-line space-y-4 shadow-sm">
                {/* Month Summary Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-line pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-black text-ink px-3 py-1 rounded-sm bg-sunken border border-line">
                      ▦ {mg.month}
                    </span>
                    <span className="text-xs text-up font-extrabold bg-up-soft px-2.5 py-1 rounded-sm border border-up">
                      Total Bulan Ini: Rp {mg.totalAmount.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[11px] text-muted font-semibold">
                      ({mg.executions.length}x Eksekusi Tanggal)
                    </span>
                    {!mg.sbnAvailable && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-warn-soft text-warn border border-warn">
                        ▲ SBN Off
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteMonth(mg.month)}
                    className="text-[11px] font-bold text-down hover:text-down hover:bg-down-soft px-2.5 py-1 rounded-sm transition-colors border border-down"
                  >
                    ⌫ Hapus Seluruh Bulan
                  </button>
                </div>

                {/* Monthly Aggregate Breakdown Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-sm bg-surface border border-line flex justify-between items-center">
                    <span className="text-muted font-bold">▥ Total SBN</span>
                    <span className="font-extrabold text-ink ">Rp {mg.totalSbn.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-2.5 rounded-sm bg-surface border border-line flex justify-between items-center">
                    <span className="text-muted font-bold">▣ Total RDPU</span>
                    <span className="font-extrabold text-ink ">Rp {mg.totalRdpu.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-2.5 rounded-sm bg-surface border border-line flex justify-between items-center">
                    <span className="text-muted font-bold">↗ Total Saham</span>
                    <span className="font-extrabold text-up ">Rp {mg.totalStocks.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Stock Accumulation Summary in Month */}
                {Object.keys(mg.stockBreakdown).length > 0 && (
                  <div className="p-3 rounded-sm bg-sunken border border-line space-y-1.5">
                    <span className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">
                      Akumulasi Lot Saham Bulan {mg.month}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(mg.stockBreakdown).map(([tkr, lots]) => (
                        <span key={tkr} className="px-2.5 py-1 rounded-sm bg-sunken border border-line text-xs font-bold text-ink ">
                          {tkr}: <strong className="text-ink ">{lots} Lot</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* List of Execution Dates in this Month */}
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-extrabold text-ink block">
                    Detail Eksekusi Per Tanggal:
                  </span>

                  {mg.executions.map((ex) => (
                    <div
                      key={ex.dateStr}
                      className="p-3.5 rounded-sm bg-surface border border-line space-y-2.5 transition-all hover:border-line "
                    >
                      <div className="flex justify-between items-center border-b border-line pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-ink ">
                            ▦ {ex.formattedDate}
                          </span>
                          <span className="text-[11px] font-bold text-up bg-up-soft px-2 py-0.5 rounded border border-up">
                            Rp {ex.totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>

                        {/* Action buttons: Edit and Hapus */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(ex)}
                            className="px-2.5 py-1 rounded-sm text-xs font-bold bg-warn-soft hover:bg-warn-soft text-warn border border-warn transition-colors flex items-center gap-1"
                          >
                            <span>✎</span> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDate(ex.dateStr)}
                            className="px-2.5 py-1 rounded-sm text-xs font-bold bg-down-soft hover:bg-down-soft text-down border border-down transition-colors flex items-center gap-1"
                          >
                            <span>⌫</span> Hapus
                          </button>
                        </div>
                      </div>

                      {/* Items executed on this date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {ex.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-sm bg-sunken border border-line flex justify-between items-center"
                          >
                            <div>
                              <span className="font-extrabold text-ink text-xs">
                                {item.category} {item.ticker ? `(${item.ticker})` : ''}
                              </span>
                              <div className="text-[10px] text-muted ">
                                {item.lots !== null && item.lots !== undefined
                                  ? `${item.lots} Lot @ Rp ${(item.price || 0).toLocaleString('id-ID')}`
                                  : item.notes || '-'}
                              </div>
                            </div>
                            <span className="font-extrabold text-up text-xs">
                              Rp {(item.amount || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>
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
        <div className="modal-backdrop animate-in fade-in">
          <div className="bg-surface border border-line rounded-md max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-sm bg-down-soft text-down flex items-center justify-center text-xl shrink-0">
                ⌫
              </div>
              <div>
                <h3 className="text-base font-black text-ink ">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line ">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 bg-sunken hover:bg-sunken text-ink text-xs font-bold rounded-sm transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2 bg-down hover:bg-down text-on-accent text-xs font-bold rounded-sm shadow-md transition-all"
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
    </PageShell>
  );
}
