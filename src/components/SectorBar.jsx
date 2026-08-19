'use client';

// IDX-IC sector labels (Indonesian)
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

export default function SectorBar({ sectors }) {
 if (!sectors || sectors.length === 0) return null;

 const getTrendColor = (trend) => {
 switch (trend) {
 case 'strong': return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400';
 case 'positive': return 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400';
 default: return 'from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400';
 }
 };

 const getReturnColor = (ret) => {
 if (ret >= 2) return 'text-emerald-400';
 if (ret >= 0) return 'text-blue-400';
 return 'text-red-400';
 };

 return (
 <div className="glass rounded-2xl p-5">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kekuatan Sektor</h2>
 <span className="text-xs text-slate-500 dark:text-slate-400">Performa 5 hari</span>
 </div>

 <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
 {sectors.map((sector, index) => (
 <div
 key={sector.name}
 className={`sector-chip flex-shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-br border ${getTrendColor(sector.trend)}`}
 >
 <div className="flex items-center gap-2">
 {index < 2 && (
 <span className="text-xs">🔥</span>
 )}
 <span className="text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
 {sectorNameID[sector.name] || sector.name}
 </span>
 </div>
 <div className="flex items-center gap-2 mt-1">
 <span className={`text-xs font-semibold ${getReturnColor(sector.return5d)}`}>
 {sector.return5d > 0 ? '+' : ''}{sector.return5d}%
 </span>
 <span className="text-[10px] text-slate-500 dark:text-slate-400">
 Vol {(sector.volumeGrowth).toFixed(1)}x
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
