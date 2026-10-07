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
        return 'bg-up-soft text-up  border-up';
      case 'blue':
        return 'bg-sunken text-ink  border-line';
      case 'indigo':
        return 'bg-sunken text-ink  border-line';
      case 'amber':
        return 'bg-warn-soft text-warn  border-warn';
      case 'purple':
        return 'bg-sunken text-ink  border-line';
      case 'rose':
        return 'bg-down-soft text-down  border-down';
      default:
        return 'bg-sunken text-muted  border-line';
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
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-bold rounded-sm bg-surface hover:bg-sunken text-ink hover:text-ink border border-line transition-all flex items-center justify-between gap-1 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          title="Pilih strategi pengurutan otomatis untuk koleksi saham ini"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-warn text-sm">»</span>
            <span className="truncate">
              {activeStrategy ? activeStrategy.label : 'Urutkan Koleksi'}
            </span>
          </div>
          <span className={`text-[10px] text-muted group-hover:text-ink transition-transform ${isOpen ? 'rotate-180' : ''}`}>
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
          className="px-2 py-1.5 bg-sunken hover:bg-sunken text-ink border border-line rounded-sm text-xs font-bold transition-all shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
          title="Pelajari detail formula matematis & skenario penggunaan 7 strategi urutan"
        >
          <span>ⓘ</span>
          <span className="text-[11px] font-bold">Panduan</span>
        </button>
      </div>

      {/* ── 2. RICH DROPDOWN MENU (CONSTRAINED TO SIDEBAR WIDTH: LEFT-0 RIGHT-0) ─ */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-md bg-surface border border-line shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-sunken border-b border-line ">
            <span className="text-xs font-black text-ink flex items-center gap-1.5">
              <span>»</span> Urutkan {items.length} Saham
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowModal(true);
              }}
              className="text-[11px] font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ⓘ Rumus</span>
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
                  className={`w-full text-left p-2 rounded-sm transition-all flex items-start gap-2 cursor-pointer ${
 isSelected
 ? 'bg-sunken border border-line ring-1 ring-accent'
 : 'hover:bg-sunken border border-transparent'
 }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-ink ' : 'text-ink '}`}>
                        {opt.label}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                        {opt.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted leading-tight line-clamp-2">
                      {opt.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3 py-1.5 bg-sunken border-t border-line text-[10px] text-muted text-center">
            Urutan baru tersimpan otomatis di database.
          </div>
        </div>
      )}

      {/* ── 3. STRATEGY GUIDE MODAL (PORTALED SAFELY TO BODY) ───────────────── */}
      {showModal && mounted && createPortal(
        <div
          className="modal-backdrop z-[9999] animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panduan strategi pengurutan koleksi"
            className="modal-panel sm:max-w-2xl p-4 sm:p-6 space-y-4 max-h-[88vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">»</span>
                <div>
                  <h3 className="font-black text-ink text-base md:text-lg">
                    Panduan & Logika 7 Strategi Urutan Koleksi
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Pilih strategi yang paling sesuai dengan pendekatan trading atau investasi Anda hari ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-sm bg-sunken text-muted hover:text-ink transition-colors cursor-pointer"
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
                    className={`p-3.5 rounded-md border transition-all space-y-2.5 ${
 isCurrent
 ? 'bg-sunken border-accent ring-2 ring-accent'
 : 'bg-sunken border border-line hover:border-line '
 }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{opt.icon}</span>
                        <h4 className="font-bold text-sm text-ink ">
                          {opt.label}
                        </h4>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider ${badgeStyle}`}>
                          {opt.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-ink bg-sunken px-1.5 py-0.2 rounded">
                            Sedang Aktif
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectStrategy(opt)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-sm bg-accent hover:bg-accent text-on-accent transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <span>»</span>
                        <span>Terapkan</span>
                      </button>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      {opt.description}
                    </p>

                    <div className="p-2.5 rounded-sm bg-surface border border-line text-[11px] font-mono text-ink ">
                      <span className="text-ink font-bold block mb-0.5">∠ Formula Matematis:</span>
                      <span>{opt.formula}</span>
                    </div>

                    <div className="text-[11px] text-muted flex items-start gap-1.5">
                      <span className="text-up font-bold shrink-0">✦ Skenario:</span>
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
