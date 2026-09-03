'use client';

const MODES = [
  { name: 'auto', label: 'Otomatis', emoji: '🤖', description: 'Sistem mendeteksi mode terbaik secara otomatis berdasarkan kondisi pasar saat ini.' },
  { name: 'balanced', label: 'Seimbang', emoji: '⚖️', description: 'Strategi campuran yang menyeimbangkan analisis fundamental dan sinyal teknikal. Cocok untuk kebanyakan kondisi pasar.' },
  { name: 'growth', label: 'Pertumbuhan', emoji: '🚀', description: 'Fokus pada saham dengan momentum dan tren kuat. Terbaik saat pasar sedang bullish dan volume tinggi.' },
  { name: 'conservative', label: 'Konservatif', emoji: '🛡️', description: 'Mengutamakan saham yang lebih aman dengan kinerja stabil, fundamental kuat, dan dividen bagus. Risiko lebih rendah.' },
  { name: 'defensive', label: 'Defensif', emoji: '🔒', description: 'Hanya saham kualitas tertinggi yang lolos. Untuk pasar bearish saat menjaga modal adalah prioritas utama.' },
  { name: 'custom', label: 'Custom', emoji: '🎛️', description: 'Anda mengontrol bobot skor sepenuhnya. Atur rasio kesukaan Anda!' },
];

export default function ModeSelector({ currentMode, autoDetectedMode, onModeChange, detection }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⚙️</span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Mode Strategi Algoritma
          </h2>
        </div>
        {detection && (
          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border ${
            detection === 'auto'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
          }`}>
            {detection === 'auto' ? '🤖 Deteksi Otomatis' : '👤 Pilihan Pengguna'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => {
          const isActive = currentMode === mode.name;
          const isAutoActive = currentMode === 'auto' && mode.name === 'auto';

          return (
            <button
              key={mode.name}
              onClick={() => onModeChange(mode.name)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-500/40 font-black scale-[1.02]'
                  : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <span>{mode.emoji}</span>
              <span>{mode.label}</span>
              {mode.name === 'auto' && autoDetectedMode && isAutoActive && (
                <span className="text-[10px] text-cyan-100 font-extrabold bg-black/20 px-1.5 py-0.5 rounded">
                  → {autoDetectedMode}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode description */}
      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800/40">
        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {MODES.find(m => m.name === currentMode)?.description || MODES[0].description}
        </p>
      </div>
    </div>
  );
}
