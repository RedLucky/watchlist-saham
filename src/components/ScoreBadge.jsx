'use client';

export default function ScoreBadge({ score, size = 'md' }) {
  const getScoreStyle = (score) => {
    if (score >= 85) return { bg: 'bg-score-strong', text: 'text-white font-extrabold', glow: 'glow-green', label: 'Kuat' };
    if (score >= 70) return { bg: 'bg-score-good', text: 'text-white font-extrabold', glow: 'glow-blue', label: 'Bagus' };
    if (score >= 60) return { bg: 'bg-score-watch', text: 'text-white font-extrabold', glow: 'glow-yellow', label: 'Pantau' };
    return { bg: 'bg-score-ignore', text: 'text-white font-extrabold', glow: '', label: 'Abaikan' };
  };

  const style = getScoreStyle(score);
  const sizeClasses = size === 'lg'
    ? 'w-14 h-14 text-lg font-black'
    : size === 'sm'
    ? 'w-8 h-8 text-xs font-black'
    : 'w-11 h-11 text-sm font-black';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sizeClasses} ${style.bg} ${style.glow} ${style.text} rounded-xl flex items-center justify-center shadow-sm`}>
        {score}
      </div>
      {size !== 'sm' && (
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          score >= 85 ? 'text-emerald-700 dark:text-emerald-400' :
          score >= 70 ? 'text-blue-700 dark:text-blue-400' :
          score >= 60 ? 'text-amber-800 dark:text-amber-400' :
          'text-slate-700 dark:text-slate-400'
        }`}>
          {style.label}
        </span>
      )}
    </div>
  );
}
