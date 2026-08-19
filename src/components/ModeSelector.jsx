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
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mode Strategi</h2>
        </div>
        {detection && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            detection === 'auto'
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20'
          }`}>
            {detection === 'auto' ? '🤖 Deteksi Otomatis' : '👤 Dipilih Pengguna'}
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-500'
                  : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10'
              }`}
            >
              <span>{mode.emoji}</span>
              <span>{mode.label}</span>
              {mode.name === 'auto' && autoDetectedMode && isAutoActive && (
                <span className="text-[10px] text-indigo-100 opacity-90">
                  → {autoDetectedMode}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode description */}
      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800/40">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {MODES.find(m => m.name === currentMode)?.description || MODES[0].description}
        </p>
      </div>
    </div>
  );
}
