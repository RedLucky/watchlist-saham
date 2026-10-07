'use client';

import React, { useState } from 'react';
import { getChangeTone } from '@/lib/uiTones';

/** The four RRG quadrants with their badge colour and explanation. */
const QUADRANTS = [
  { id: 'LEADING', title: 'Leading', subtitle: 'Memimpin', badge: 'badge-up', desc: 'RS > 100 & Momentum > 100. Sektor terkuat yang memimpin IHSG.' },
  { id: 'WEAKENING', title: 'Weakening', subtitle: 'Melemah', badge: 'badge-warn', desc: 'RS > 100 & Momentum < 100. Kekuatan relatif tinggi namun akselerasi melambat.' },
  { id: 'LAGGING', title: 'Lagging', subtitle: 'Tertinggal', badge: 'badge-down', desc: 'RS < 100 & Momentum < 100. Sektor terlemah di bawah indeks acuan.' },
  { id: 'IMPROVING', title: 'Improving', subtitle: 'Membaik', badge: 'badge-outline', desc: 'RS < 100 & Momentum > 100. Rebound awal dan perputaran arus modal masuk.' },
];

/**
 * Badge class for a quadrant id.
 * @param {string} quadrant
 * @returns {string}
 */
function quadrantBadge(quadrant) {
  return QUADRANTS.find((q) => q.id === quadrant)?.badge || 'badge-outline';
}

/**
 * Bloomberg-style Relative Rotation Graph summary: sectors grouped into Leading, Weakening,
 * Lagging and Improving quadrants, with a quadrant filter.
 *
 * @param {object} props
 * @param {Array<{ sector: string, quadrant: string, advice: string, rsRatio: number, rsMomentum: number, return5d: number }>} [props.rrg=[]]
 */
export default function SectorRrgPanel({ rrg = [] }) {
  const [selectedQuadrant, setSelectedQuadrant] = useState('ALL');

  if (!Array.isArray(rrg) || rrg.length === 0) return null;

  const filteredSectors = selectedQuadrant === 'ALL'
    ? rrg
    : rrg.filter((s) => s.quadrant === selectedQuadrant);

  return (
    <div className="space-y-4">
      {/* Header + quadrant filter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="section-title">Rotasi Sektor 4-Kuadran</h3>
            <span className="badge badge-outline">RRG</span>
          </div>
          <p className="section-subtitle mt-0.5">
            Siklus rotasi sektoral BEI berdasarkan Relative Strength (RS-Ratio) dan Relative Momentum vs IHSG.
          </p>
        </div>

        <div className="tabs" role="group" aria-label="Filter kuadran">
          <button type="button" onClick={() => setSelectedQuadrant('ALL')} aria-pressed={selectedQuadrant === 'ALL'} className="tab">
            Semua <span className="font-mono text-[10px] text-muted">{rrg.length}</span>
          </button>
          {QUADRANTS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedQuadrant(q.id)}
              aria-pressed={selectedQuadrant === q.id}
              className="tab"
            >
              {q.title}
              <span className="font-mono text-[10px] text-muted">{rrg.filter((s) => s.quadrant === q.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quadrant legend */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {QUADRANTS.map((q) => (
          <div key={q.id} className="p-3 rounded-sm bg-sunken border border-line">
            <dt className="flex items-center gap-1.5">
              <span className={`badge ${q.badge}`}>{q.title}</span>
              <span className="text-[11px] text-muted">{q.subtitle}</span>
            </dt>
            <dd className="mt-1 text-[11px] text-muted leading-relaxed">{q.desc}</dd>
          </div>
        ))}
      </dl>

      {/* Sector cards */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredSectors.map((s) => (
          <li key={s.sector} className="card p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink">{s.sector}</h4>
              <span className={`badge ${quadrantBadge(s.quadrant)}`}>{s.quadrant}</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">{s.advice}</p>
            <div className="mt-auto pt-2 border-t border-line flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="text-muted">RS <strong className="text-ink font-semibold">{s.rsRatio}</strong></span>
              <span className="text-muted">Mom <strong className="text-ink font-semibold">{s.rsMomentum}</strong></span>
              <span className={`font-semibold ${getChangeTone(s.return5d)}`}>
                5H {s.return5d >= 0 ? `+${s.return5d}` : s.return5d}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
