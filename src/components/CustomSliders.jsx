import { useState, useEffect } from 'react';

export default function CustomSliders({ initialWeights, onApply }) {
 const [weights, setWeights] = useState(initialWeights || {
 fundamental: 20,
 technical: 20,
 smartMoney: 20,
 trending: 20,
 valuation: 10,
 liquidity: 5,
 dividend: 5,
 });

 const total = Object.values(weights).reduce((a, b) => a + b, 0);

 const handleChange = (key, value) => {
 setWeights(prev => ({
 ...prev,
 [key]: parseInt(value) || 0
 }));
 };

 const labels = {
 fundamental: { name: 'Fundamental', color: 'text-blue-400' },
 technical: { name: 'Teknikal', color: 'text-emerald-400' },
 smartMoney: { name: 'Smart Money', color: 'text-purple-400' },
 trending: { name: 'Tren & Frekuensi', color: 'text-amber-400' },
 valuation: { name: 'Valuasi', color: 'text-rose-400' },
 liquidity: { name: 'Likuiditas', color: 'text-cyan-400' },
 dividend: { name: 'Dividen', color: 'text-lime-400' },
 };

 return (
 <div className="glass-light border border-slate-300 dark:border-white/10 rounded-2xl p-5 mb-5 animate-slide-down">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-sm font-bold text-slate-900 dark:text-white">🎛️ Pengaturan Bobot Kustom</h3>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tentukan persentase scoring sesuai gaya analisis Anda.</p>
 </div>
 <div className={`px-3 py-1 rounded-lg font-bold text-sm ${total === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
 Total: {total}%
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
 {Object.entries(weights).map(([key, value]) => (
 <div key={key} className="space-y-1">
 <div className="flex justify-between items-center text-xs">
 <span className={`font-medium ${labels[key].color}`}>{labels[key].name}</span>
 <span className="text-slate-400 dark:text-slate-500">{value}%</span>
 </div>
 <input 
 type="range"
 min="0"
 max="100"
 value={value}
 onChange={(e) => handleChange(key, e.target.value)}
 className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
 />
 </div>
 ))}
 </div>

 <div className="mt-6 flex justify-end">
 <button 
 onClick={() => onApply(weights)}
 disabled={total !== 100}
 className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
 total === 100 
 ? 'bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
 : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/5'
 }`}
 >
 {total === 100 ? '✓ Terapkan Analisis' : 'Pastikan Total 100%'}
 </button>
 </div>
 </div>
 );
}
