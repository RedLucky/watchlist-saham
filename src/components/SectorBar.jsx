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

  const getTrendColor = (trend, index) => {
    if (index < 2) {
      return 'border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent text-amber-900 dark:text-amber-200 shadow-xs';
    }
    switch (trend) {
      case 'strong': return 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-800 dark:text-emerald-300';
      case 'positive': return 'border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-500/5 text-blue-800 dark:text-blue-300';
      default: return 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
    }
  };

  const getReturnColor = (ret) => {
    if (ret >= 2) return 'text-emerald-700 dark:text-emerald-400 font-black';
    if (ret >= 0) return 'text-blue-700 dark:text-blue-400 font-black';
    return 'text-rose-700 dark:text-rose-400 font-black';
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🧭</span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Rotasi & Kekuatan Sektor BEI
          </h2>
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          Performa 5 Hari Terakhir
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
        {sectors.map((sector, index) => (
          <div
            key={sector.name}
            className={`sector-chip snap-start flex-shrink-0 px-3.5 py-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-default ${getTrendColor(sector.trend, index)}`}
          >
            <div className="flex items-center gap-1.5">
              {index < 2 ? (
                <span className="text-xs">🔥</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60"></span>
              )}
              <span className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                {sectorNameID[sector.name] || sector.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px]">
              <span className={`font-mono ${getReturnColor(sector.return5d)}`}>
                {sector.return5d > 0 ? '+' : ''}{sector.return5d}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                Vol {(sector.volumeGrowth).toFixed(1)}x
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
