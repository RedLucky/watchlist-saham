'use client';

import { useState } from 'react';
import SectorRrgPanel from './SectorRrgPanel';

/** IDX-IC sector labels in Indonesian. */
const sectorNameID = {
  Financials: 'Keuangan',
  Energy: 'Energi',
  'Basic Materials': 'Barang Baku',
  Industrials: 'Perindustrian',
  'Consumer Non-Cyclicals': 'Konsumen Primer',
  'Consumer Cyclicals': 'Konsumen Non-Primer',
  Healthcare: 'Kesehatan',
  'Properties & Real Estate': 'Properti & Real Estat',
  Technology: 'Teknologi',
  Infrastructures: 'Infrastruktur',
  'Transportation & Logistics': 'Transportasi & Logistik',
  General: 'Lainnya',
  INDEX: 'Indeks',
};

/**
 * Colour for a 5-day sector return: up when ≥ 0, down otherwise.
 * @param {number} ret - Return in percent.
 * @returns {string} Tailwind text class.
 */
function getReturnTone(ret) {
  return ret >= 0 ? 'text-up' : 'text-down';
}

/**
 * Horizontally scrollable strip of sector performance chips (5-day return, volume growth).
 * The two leading sectors are marked; the RRG panel can be expanded below.
 *
 * @param {object} props
 * @param {Array<{ name: string, trend: string, return5d: number, volumeGrowth: number }>} props.sectors
 * @param {Array} [props.rrg=[]] - Relative Rotation Graph data for SectorRrgPanel.
 */
export default function SectorBar({ sectors, rrg = [] }) {
  const [showRrg, setShowRrg] = useState(false);
  if (!sectors || sectors.length === 0) return null;

  return (
    <section className="card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="section-title">Rotasi & Kekuatan Sektor BEI</h2>
          <p className="section-subtitle">Performa 5 hari terakhir</p>
        </div>
        {rrg && rrg.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRrg(!showRrg)}
            aria-expanded={showRrg}
            className="btn-secondary"
          >
            <span className="font-mono" aria-hidden="true">{showRrg ? '−' : '+'}</span>
            {showRrg ? 'Tutup RRG' : 'Bloomberg RRG'}
          </button>
        )}
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sectors.map((sector, index) => {
          const isLeader = index < 2;
          return (
            <li
              key={sector.name}
              className={`snap-start shrink-0 px-3 py-2 rounded-sm border ${
                isLeader ? 'border-line-strong bg-surface' : 'border-line bg-sunken'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isLeader && (
                  <span className="label-mono text-[9px] text-ink" title="Sektor terkuat">#{index + 1}</span>
                )}
                <span className="text-xs font-semibold text-ink whitespace-nowrap">
                  {sectorNameID[sector.name] || sector.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono tabular-nums">
                <span className={`font-semibold ${getReturnTone(sector.return5d)}`}>
                  {sector.return5d > 0 ? '+' : ''}{sector.return5d}%
                </span>
                <span className="text-muted">Vol {Number(sector.volumeGrowth).toFixed(1)}x</span>
              </div>
            </li>
          );
        })}
      </ul>

      {showRrg && rrg && rrg.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <SectorRrgPanel rrg={rrg} />
        </div>
      )}
    </section>
  );
}
