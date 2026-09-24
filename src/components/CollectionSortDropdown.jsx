'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SORT_OPTIONS, sortCollectionItems } from '@/lib/collectionSorter';

/**
 * CollectionSortDropdown Component
 * 
 * Provides an institutional sorting menu and educational strategy guide modal
 * for reordering stock collections / watchlists.
 */
export default function CollectionSortDropdown({
  items = [],
  onApplySort = null,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Strategy Selection
  const handleSelectStrategy = (option) => {
    setIsOpen(false);
    setShowModal(false);
    setActiveStrategy(option.id);

    if (onApplySort && typeof onApplySort === 'function') {
      const sorted = sortCollectionItems(items, option.id);
      onApplySort(sorted, option);
    }

    setToastMessage(`Urutan diperbarui: ${option.label}`);
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
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* ── 1. TRIGGER BUTTON ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || items.length <= 1}
          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          title="Urutkan Koleksi Otomatis"
        >
          <span>⚡</span>
          <span>Urutkan</span>
          <span className="text-[10px] opacity-60">▾</span>
        </button>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="p-1 text-xs rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Panduan & Detail Logika Urutan"
        >
          ℹ️
        </button>
      </div>

      {/* ── 2. RICH DROPDOWN POPOVER ────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 md:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>⚡</span> Urutkan Koleksi Saham
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowModal(true);
              }}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>ℹ️ Panduan Formula</span>
            </button>
          </div>

          {/* List of 7 Sort Options */}
          <div className="p-1.5 space-y-1 max-h-[380px] overflow-y-auto">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeStrategy === opt.id;
              const badgeStyle = getBadgeStyle(opt.badgeColor);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectStrategy(opt)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{opt.icon}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {opt.label}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider ${badgeStyle}`}>
                        {opt.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 text-center">
            Urutan baru otomatis tersimpan permanen di database.
          </div>
        </div>
      )}

      {/* ── 3. STRATEGY GUIDE MODAL ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Panduan & Logika 7 Strategi Urutan Koleksi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih strategi yang paling sesuai dengan pendekatan trading atau investasi Anda hari ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Cards Grid */}
            <div className="space-y-3">
              {SORT_OPTIONS.map((opt) => {
                const badgeStyle = getBadgeStyle(opt.badgeColor);

                return (
                  <div
                    key={opt.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5 hover:border-indigo-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{opt.icon}</span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {opt.label}
                        </h4>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider ${badgeStyle}`}>
                          {opt.badge}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectStrategy(opt)}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0 shadow-2xs"
                      >
                        Terapkan
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {opt.description}
                    </p>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">📐 Formula:</span>
                      <span>{opt.formula}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">💡 Skenario:</span>
                      <span>{opt.scenario}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. BRIEF TOAST NOTIFICATION ─────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
