'use client';

export default function ScoreBar({ label, score, weight, color, tooltip, animate = true }) {
 const getBarColor = (score) => {
 if (score >= 85) return 'from-emerald-500 to-emerald-400';
 if (score >= 70) return 'from-blue-500 to-blue-400';
 if (score >= 60) return 'from-amber-500 to-amber-400';
 return 'from-slate-500 to-slate-400';
 };

 const barColor = color || getBarColor(score);

 return (
 <div className="group">
 <div className="flex items-center justify-between mb-1.5">
 <div className="flex items-center gap-2">
 <span className="text-sm text-slate-400 dark:text-slate-500">{label}</span>
 {weight && (
 <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
 {weight}%
 </span>
 )}
 </div>
 <span className={`text-sm font-semibold ${
 score >= 85 ? 'text-emerald-400' :
 score >= 70 ? 'text-blue-400' :
 score >= 60 ? 'text-amber-400' :
 'text-slate-400'
 }`}>
 {score}
 </span>
 </div>
 <div className="progress-bar-track">
 <div
 className={`progress-bar-fill bg-gradient-to-r ${barColor}`}
 style={{
 width: `${score}%`,
 transition: animate ? undefined : 'none'
 }}
 />
 </div>
 </div>
 );
}
