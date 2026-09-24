'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SORT_OPTIONS, sortCollectionItems } from '@/lib/collectionSorter';

/**
 * CollectionSortDropdown Component
 * 
 * Provides an institutional sorting menu and educational strategy guide modal
 * for reordering stock collections / watchlists.
 * 
 * Layout Isolation:
 * - Dropdown popover is strictly bound to sidebar width (`left-0 right-0 w-full`)
 *   to guarantee 0% overflow or collision with Stock Explorer search & charts.
 * - Strategy Guide Modal is portaled directly to `document.body` to avoid
 *   any parent CSS sticky / overflow clipping.
 */
export default function CollectionSortDropdown({
  items = [],
  onApplySort = null,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeStrategyId, setActiveStrategyId] = useState('');
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef(null);

  // Client-side hydration check for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!option) return;
    setIsOpen(false);
    setShowModal(false);
    setActiveStrategyId(option.id);

    if (onApplySort && typeof onApplySort === 'function') {
      const sorted = sortCollectionItems(items, option.id);
      onApplySort(sorted, option);
    }
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

  const activeStrategy = SORT_OPTIONS.find(o => o.id === activeStrategyId);

  return (
    <div className={`relative w-full ${className}`} ref={menuRef}>
      {/* ── 1. TRIGGER TOOLBAR (FITS 100% SIDEBAR WIDTH) ──────────────────────── */}
      <div className="flex items-center gap-1.5 w-full">
        {/* Main Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || items.length <= 1}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-indigo-50/70 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-between gap-1 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          title="Pilih strategi pengurutan otomatis untuk koleksi saham ini"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-amber-500 text-sm">⚡</span>
            <span className="truncate">
              {activeStrategy ? activeStrategy.label : 'Urutkan Koleksi'}
            </span>
          </div>
          <span className={`text-[10px] text-slate-400 group-hover:text-indigo-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Info & Modal Guide Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setShowModal(true);
          }}
          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
          title="Pelajari detail formula matematis & skenario penggunaan 7 strategi urutan"
        >
          <span>ℹ️</span>
          <span className="text-[11px] font-bold">Panduan</span>
        </button>
      </div>

      {/* ── 2. RICH DROPDOWN MENU (CONSTRAINED TO SIDEBAR WIDTH: LEFT-0 RIGHT-0) ─ */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>⚡</span> Urutkan {items.length} Saham
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowModal(true);
              }}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ℹ️ Rumus</span>
            </button>
          </div>

          {/* List of 7 Sort Options */}
          <div className="p-1 space-y-0.5 max-h-[340px] overflow-y-auto">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeStrategyId === opt.id;
              const badgeStyle = getBadgeStyle(opt.badgeColor);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectStrategy(opt)}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-400/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                        {opt.label}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                        {opt.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                      {opt.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 text-center">
            Urutan baru tersimpan otomatis di database.
          </div>
        </div>
      )}

      {/* ── 3. STRATEGY GUIDE MODAL (PORTALED SAFELY TO BODY) ───────────────── */}
      {showModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-150"
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
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isCurrent
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-slate-600'
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
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <span>⚡</span>
                        <span>Terapkan</span>
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
                      <span className="text-emerald-500 font-bold shrink-0">💡 Skenario:</span>
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
    </div>
  );
}
