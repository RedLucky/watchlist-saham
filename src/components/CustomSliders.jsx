import { useState } from 'react';

/** Display names for each scoring weight. */
const LABELS = {
  fundamental: 'Fundamental',
  technical: 'Teknikal',
  smartMoney: 'Smart Money',
  trending: 'Tren & Frekuensi',
  valuation: 'Valuasi',
  liquidity: 'Likuiditas',
  dividend: 'Dividen',
};

const DEFAULT_WEIGHTS = {
  fundamental: 20,
  technical: 20,
  smartMoney: 20,
  trending: 20,
  valuation: 10,
  liquidity: 5,
  dividend: 5,
};

/**
 * Sliders for custom scoring weights. "Terapkan" is only enabled when the weights add up to 100%.
 *
 * @param {object} props
 * @param {Record<string, number>} [props.initialWeights] - Starting weights in percent.
 * @param {(weights: Record<string, number>) => void} props.onApply - Called with the final weights.
 */
export default function CustomSliders({ initialWeights, onApply }) {
  const [weights, setWeights] = useState(initialWeights || DEFAULT_WEIGHTS);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = total === 100;

  const handleChange = (key, value) => {
    setWeights((prev) => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="section-title">Pengaturan Bobot Kustom</h3>
          <p className="section-subtitle mt-0.5">Tentukan persentase scoring sesuai gaya analisis Anda.</p>
        </div>
        <span className={`badge ${isValid ? 'badge-up' : 'badge-down'} text-xs`} aria-live="polite">
          Total {total}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {Object.entries(weights).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between items-center text-xs mb-1">
              <label htmlFor={`weight-${key}`} className="font-medium text-ink">{LABELS[key] || key}</label>
              <span className="font-mono text-muted tabular-nums">{value}%</span>
            </div>
            <input
              id={`weight-${key}`}
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full h-1.5 bg-sunken rounded-sm appearance-none cursor-pointer accent-[var(--c-accent)]"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={() => onApply(weights)} disabled={!isValid} className="btn-primary">
          {isValid ? 'Terapkan Analisis' : 'Pastikan Total 100%'}
        </button>
      </div>
    </section>
  );
}
