'use client';

/** Strategy modes for the scoring algorithm. */
const MODES = [
  { name: 'auto', label: 'Otomatis', icon: '◎', description: 'Sistem mendeteksi mode terbaik secara otomatis berdasarkan kondisi pasar saat ini.' },
  { name: 'balanced', label: 'Seimbang', icon: '⇌', description: 'Strategi campuran yang menyeimbangkan analisis fundamental dan sinyal teknikal. Cocok untuk kebanyakan kondisi pasar.' },
  { name: 'growth', label: 'Pertumbuhan', icon: '↗\uFE0E', description: 'Fokus pada saham dengan momentum dan tren kuat. Terbaik saat pasar sedang bullish dan volume tinggi.' },
  { name: 'conservative', label: 'Konservatif', icon: '▣', description: 'Mengutamakan saham yang lebih aman dengan kinerja stabil, fundamental kuat, dan dividen bagus. Risiko lebih rendah.' },
  { name: 'defensive', label: 'Defensif', icon: '◼\uFE0E', description: 'Hanya saham kualitas tertinggi yang lolos. Untuk pasar bearish saat menjaga modal adalah prioritas utama.' },
  { name: 'custom', label: 'Custom', icon: '≡', description: 'Anda mengontrol bobot skor sepenuhnya. Atur rasio kesukaan Anda!' },
];

/**
 * Card for choosing the scoring strategy mode, with a description of the selected mode.
 *
 * @param {object} props
 * @param {string} props.currentMode - Selected mode name.
 * @param {string} [props.autoDetectedMode] - Mode chosen by auto-detection (shown on "Otomatis").
 * @param {(name: string) => void} props.onModeChange - Called with the new mode.
 * @param {'auto'|'user'} [props.detection] - Whether the mode came from auto-detection or the user.
 */
export default function ModeSelector({ currentMode, autoDetectedMode, onModeChange, detection }) {
  const current = MODES.find((m) => m.name === currentMode) || MODES[0];

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="section-title">Mode Strategi Algoritma</h2>
        {detection && (
          <span className="badge badge-outline">
            {detection === 'auto' ? 'Deteksi otomatis' : 'Pilihan pengguna'}
          </span>
        )}
      </div>

      <div className="tabs flex-wrap" role="group" aria-label="Mode strategi">
        {MODES.map((mode) => (
          <button
            key={mode.name}
            type="button"
            onClick={() => onModeChange(mode.name)}
            aria-pressed={currentMode === mode.name}
            className="tab"
          >
            <span className="font-mono" aria-hidden="true">{mode.icon}</span>
            <span>{mode.label}</span>
            {mode.name === 'auto' && autoDetectedMode && currentMode === 'auto' && (
              <span className="font-mono text-[10px] text-muted">→ {autoDetectedMode}</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted leading-relaxed" aria-live="polite">
        {current.description}
      </p>
    </section>
  );
}
