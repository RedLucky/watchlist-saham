'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SORT_OPTIONS, sortCollectionItems } from '@/lib/collectionSorter';

/**
 * CollectionSortDropdown Component
 * 
 * Provides a clean, sidebar-constrained auto-sort toolbar and an institutional
 * strategy guide modal rendered safely at document.body level via React Portal
 * to eliminate all z-index stacking and overlap issues with Stock Explorer search.
 */
export default function CollectionSortDropdown({
  items = [],
  onApplySort = null,
  disabled = false,
  className = ''
}) {
  const [activeStrategyId, setActiveStrategyId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Client-side hydration check for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Strategy Selection
  const handleSelectStrategy = (option) => {
    if (!option) return;
    setActiveStrategyId(option.id);
    setShowModal(false);

    if (onApplySort && typeof onApplySort === 'function') {
      const sorted = sortCollectionItems(items, option.id);
      onApplySort(sorted, option);
    }

    setToastMessage(`Urutan diterapkan: ${option.label}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getBadgeStyle = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* ── 1. INLINE SIDEBAR TOOLBAR (FITS 100% WITHIN SIDEBAR, NEVER SPILLS OUT) ── */}
      <div className="flex items-center gap-1.5 w-full">
        {/* Dropdown Selector */}
        <div className="relative flex-1 min-w-0">
          <select
            value={activeStrategyId}
            disabled={disabled || items.length <= 1}
            onChange={(e) => {
              const opt = SORT_OPTIONS.find(o => o.id === e.target.value);
              if (opt) handleSelectStrategy(opt);
            }}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-7 cursor-pointer truncate shadow-2xs hover:border-indigo-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Pilih strategi pengurutan otomatis"
          >
            <option value="" disabled>
              ⚡ Urutkan Koleksi ({items.length} saham)...
            </option>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.icon} {opt.label} • {opt.badge}
              </option>
            ))}
          </select>

          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-slate-400">
            ▼
          </span>
        </div>

        {/* Info & Strategy Guide Modal Button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shrink-0 shadow-2xs flex items-center gap-1"
          title="Pelajari detail formula & skenario 7 strategi urutan"
        >
          <span>ℹ️</span>
          <span className="text-[11px] font-bold hidden sm:inline">Panduan</span>
        </button>
      </div>

      {/* ── 2. STRATEGY GUIDE MODAL (PORTALED TO BODY TO PREVENT ANY OVERLAP) ── */}
      {showModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg">
                    Panduan & Logika 7 Strategi Urutan Koleksi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih strategi yang paling sesuai dengan pendekatan trading atau investasi Anda hari ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Cards Grid */}
            <div className="space-y-3">
              {SORT_OPTIONS.map((opt) => {
                const badgeStyle = getBadgeStyle(opt.badgeColor);
                const isCurrent = activeStrategyId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isCurrent
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{opt.icon}</span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {opt.label}
                        </h4>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider ${badgeStyle}`}>
                          {opt.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                            Sedang Aktif
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectStrategy(opt)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-2xs"
                      >
                        Terapkan
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {opt.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">📐 Formula Matematis:</span>
                      <span>{opt.formula}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">💡 Skenario Penggunaan:</span>
                      <span>{opt.scenario}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 3. BRIEF TOAST NOTIFICATION (PORTALED TO BODY) ──────────────────── */}
      {toastMessage && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
