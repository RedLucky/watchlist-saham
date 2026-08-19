'use client';

const STYLES = [
  { name: 'scalping', label: 'Scalping', emoji: '⚡', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-500/30' },
  { name: 'daily', label: 'Daily', emoji: '📊', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30' },
  { name: 'swing', label: 'Swing', emoji: '📈', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30' },
];

export default function StyleSelector({ currentStyle, onStyleChange }) {
  return (
    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
      {STYLES.map((style) => {
        const isActive = currentStyle === style.name;
        return (
          <button
            key={style.name}
            onClick={() => onStyleChange(style.name)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isActive
                ? `${style.bg} ${style.color} ${style.border} border shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <span>{style.emoji}</span>
            <span>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
}
