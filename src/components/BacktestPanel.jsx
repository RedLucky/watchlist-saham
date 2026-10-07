'use client';

import { useState } from 'react';
import { readThemeTokens } from '@/lib/chartTheme';

export default function BacktestPanel() {
 const [ticker, setTicker] = useState('BBCA');
 const [style, setStyle] = useState('swing');
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState(null);
 const [error, setError] = useState(null);

 const runBacktest = async () => {
 if (!ticker) return;
 try {
 setLoading(true);
 setError(null);
 const res = await fetch(`/api/backtest?ticker=${ticker.toUpperCase()}&style=${style}`);
 if (!res.ok) {
 const errorData = await res.json();
 throw new Error(errorData.error || 'Gagal menjalankan backtest');
 }
 const data = await res.json();
 setResult(data);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const formatCurrency = (val) => {
 const n = Number(val);
 if (!Number.isFinite(n)) return '-';
 return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
 };

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="glass p-5 rounded-md border border-line ">
 <h3 className="font-bold text-ink mb-4">Mesin Waktu Backtesting (1 Tahun Terakhir)</h3>
 
 <div className="flex flex-wrap gap-4 items-end">
 <div className="space-y-1.5">
 <label className="text-xs text-muted uppercase tracking-wider">Simbol Saham</label>
 <input 
 type="text"
 value={ticker}
 onChange={(e) => setTicker(e.target.value.toUpperCase())}
 placeholder="Misal: BBCA"
 className="bg-sunken border border-line rounded-sm px-4 py-2 text-sm text-ink w-40 focus:outline-none focus:border-accent transition-colors uppercase"
 />
 </div>
 
 <div className="space-y-1.5">
 <label htmlFor="backtest-style" className="label-mono">Gaya Trading</label>
 <select
 id="backtest-style"
 value={style}
 onChange={(e) => setStyle(e.target.value)}
 className="select"
>
 <option value="scalping">Scalping</option>
 <option value="daily">Daily</option>
 <option value="swing">Swing</option>
 </select>
 </div>

 <button 
 onClick={runBacktest}
 disabled={loading || !ticker}
 className="bg-accent hover:bg-accent disabled:opacity-50 text-on-accent font-bold text-sm px-6 py-2 rounded-sm transition-colors h-10 shadow-lg "
 >
 {loading ? 'Mensimulasikan...' : 'Mulai Backtest'}
 </button>
 </div>
 
 {error && <p className="text-down text-sm mt-4">▲ {error}</p>}
 </div>

 {result && (
 <div className="space-y-6 animate-slide-down">
 {/* Summary */}
 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
 <div className="p-4 rounded-sm glass-light border border-line ">
 <span className="text-[10px] text-muted uppercase">Win Rate</span>
 <div className="text-xl sm:text-2xl font-bold text-ink mt-1">{result.summary.winRate.toFixed(1)}%</div>
 <div className="text-xs text-muted mt-1">Dari {result.summary.totalTrades} Trade</div>
 </div>
 <div className="p-4 rounded-sm glass-light border border-line ">
 <span className="text-[10px] text-muted uppercase">Rasio Menang : Kalah</span>
 <div className="text-2xl font-bold text-ink mt-1">
 <span className="text-up">{result.summary.wins}</span> 
 <span className="text-muted text-lg mx-2">/</span> 
 <span className="text-down">{result.summary.losses}</span>
 </div>
 </div>
 <div className="p-4 rounded-sm glass-light border border-line ">
 <span className="text-[10px] text-muted uppercase">Return Pertumbuhan Modal</span>
 <div className={`text-2xl font-bold mt-1 ${result.summary.netReturn >= 0 ? 'text-up' : 'text-down'}`}>
 {result.summary.netReturn >= 0 ? '+' : ''}{result.summary.netReturn.toFixed(2)}%
 </div>
 </div>
 <div className="p-4 rounded-sm glass-light border border-line ">
 <span className="text-[10px] text-muted uppercase">Total Modal (Dari 10Jt)</span>
 <div className="text-2xl font-bold text-ink mt-1">
 {formatCurrency(result.summary.finalCapital)}
 </div>
 </div>
 <div className="p-4 rounded-sm glass-light border border-line ">
 <span className="text-[10px] text-muted uppercase">Rata-rata Hold</span>
 <div className="text-2xl font-bold text-ink mt-1">
 {Number(result.summary.avgHoldDays || 0).toFixed(1)} hari
 </div>
 </div>
 </div>

 <div className="p-4 rounded-sm glass-light border border-line ">
 <div className="text-[10px] text-muted uppercase mb-1">Konfigurasi Backtest</div>
 <div className="text-sm text-muted flex flex-wrap gap-x-5 gap-y-1">
 <span>MA: {result.config?.maShort}/{result.config?.maLong}</span>
 <span>RSI: {result.config?.rsiPeriod}</span>
 <span>TP/SL: {result.config?.tpPercent}% / {result.config?.slPercent}%</span>
 <span>Biaya per sisi: {Number(result.config?.feePerSidePercent || 0).toFixed(2)}%</span>
 </div>
 </div>

  {/* Equity Curve & Growth Chart */}
  {result.trades.length > 0 && (() => {
    const INITIAL_CAPITAL = 10_000_000;
    let currentCap = INITIAL_CAPITAL;
    let peakCap = INITIAL_CAPITAL;
    let maxDrawdown = 0;

    const points = [{ step: 0, date: 'Mulai', capital: INITIAL_CAPITAL, drawdown: 0 }];
    
    result.trades.forEach((t, i) => {
      currentCap = currentCap * (1 + t.pnlPercent / 100);
      if (currentCap > peakCap) peakCap = currentCap;
      const dd = ((peakCap - currentCap) / peakCap) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      points.push({
        step: i + 1,
        date: t.exitDate || t.entryDate,
        capital: Math.round(currentCap),
        drawdown: Number(dd.toFixed(1))
      });
    });

    const capitals = points.map(p => p.capital);
    const minCap = Math.min(...capitals, INITIAL_CAPITAL * 0.95);
    const maxCap = Math.max(...capitals, INITIAL_CAPITAL * 1.05);
    const range = (maxCap - minCap) || 1;

    const svgWidth = 800;
    const svgHeight = 160;
    const padding = 20;

    const coords = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1 || 1)) * (svgWidth - padding * 2);
      const y = svgHeight - padding - ((p.capital - minCap) / range) * (svgHeight - padding * 2);
      return { x, y, ...p };
    });

    const pathData = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    // SVG needs plain colours, so the theme tokens are read (see src/lib/chartTheme.js).

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const tokens = readThemeTokens(isDark);

    const isProfitable = currentCap >= INITIAL_CAPITAL;

    const strokeColor = isProfitable ? tokens.up : tokens.down;
    const areaPath = `${pathData} L ${coords[coords.length - 1].x.toFixed(1)} ${svgHeight - padding} L ${coords[0].x.toFixed(1)} ${svgHeight - padding} Z`;

    const initialY = svgHeight - padding - ((INITIAL_CAPITAL - minCap) / range) * (svgHeight - padding * 2);

    return (
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-ink flex items-center gap-2">
              <span>↗</span> Kurva Pertumbuhan Ekuitas (Equity Curve)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Simulasi compounding modal dari awal Rp 10.000.000 sepanjang {result.trades.length} transaksi
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-muted ">
              Max Drawdown: <span className="text-down font-bold">-{maxDrawdown.toFixed(1)}%</span>
            </span>
            <span className={isProfitable ? 'text-up' : 'text-down'}>
              Net: {isProfitable ? '+' : ''}{((currentCap - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[500px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-40 overflow-visible">
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Baseline initial capital */}
              <line 
                x1={padding} 
                y1={initialY} 
                x2={svgWidth - padding} 
                y2={initialY} 
                stroke={tokens.muted} 
                strokeDasharray="4 4" 
                strokeWidth="1" 
                opacity="0.4" 
              />
              <text x={padding + 5} y={initialY - 5} fill={tokens.muted} fontSize="9" opacity="0.7">
                Modal Awal (Rp 10 Jt)
              </text>

              {/* Area under curve */}
              <path d={areaPath} fill="url(#equityGrad)" />

              {/* Line path */}
              <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data points */}
              {coords.map((c, i) => (
                <circle 
                  key={i} 
                  cx={c.x} 
                  cy={c.y} 
                  r={i === 0 || i === coords.length - 1 ? 4 : 2.5} 
                  fill={strokeColor} 
                  className="transition-all hover:r-5 cursor-pointer"
                >
                  <title>{`${c.date}: Rp ${c.capital.toLocaleString('id-ID')} (DD: -${c.drawdown}%)`}</title>
                </circle>
              ))}
            </svg>
          </div>
        </div>

        {/* ── UNDERWATER DRAWDOWN PROFILE ── */}
        <div className="pt-3 border-t border-line space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-muted flex items-center gap-1">
              <span>≈</span> Underwater Drawdown (%)
            </span>
            <span className="text-down font-mono">
              Palung Terdalam: -{maxDrawdown.toFixed(1)}%
            </span>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px]">
              {(() => {
                const ddMaxScale = Math.max(10, Math.ceil(maxDrawdown * 1.15));
                const ddHeight = 60;
                const ddPadding = 12;
                const ddCoords = points.map((p, idx) => {
                  const x = padding + (idx / (points.length - 1 || 1)) * (svgWidth - padding * 2);
                  const y = ddPadding + (p.drawdown / ddMaxScale) * (ddHeight - ddPadding * 2);
                  return { x, y, ...p };
                });
                const ddPath = ddCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
                const ddArea = `${ddPath} L ${ddCoords[ddCoords.length - 1].x.toFixed(1)} ${ddPadding} L ${ddCoords[0].x.toFixed(1)} ${ddPadding} Z`;

                return (
                  <svg viewBox={`0 0 ${svgWidth} ${ddHeight}`} className="w-full h-16 overflow-visible">
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={tokens.down} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={tokens.down} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {/* Zero line */}
                    <line x1={padding} y1={ddPadding} x2={svgWidth - padding} y2={ddPadding} stroke={tokens.muted} strokeWidth="1" opacity="0.3" />
                    <text x={padding + 5} y={ddPadding - 3} fill={tokens.muted} fontSize="8" opacity="0.6">0% (Peak Ekuitas)</text>
                    
                    {/* Area & line */}
                    <path d={ddArea} fill="url(#ddGrad)" />
                    <path d={ddPath} fill="none" stroke={tokens.down} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Drawdown markers */}
                    {ddCoords.filter(c => c.drawdown > 0).map((c, i) => (
                      <circle key={i} cx={c.x} cy={c.y} r={2} fill={tokens.down}>
                        <title>{`${c.date}: Drawdown -${c.drawdown}%`}</title>
                      </circle>
                    ))}
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  })()}

 {/* Trade History */}
 <div className="glass rounded-md overflow-hidden border border-line ">
 <div className="px-5 py-4 border-b border-line bg-sunken flex justify-between items-center">
 <h3 className="font-bold text-ink ">Riwayat Transaksi Simulasi</h3>
 <span className="text-xs text-muted ">Gaya: {result.style}</span>
 </div>
 <div className="max-h-96 overflow-y-auto overflow-x-auto">
 {result.trades.length > 0 ? (
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 bg-sunken ">
 <tr className="border-b border-line text-xs text-muted uppercase tracking-wider">
 <th className="p-4 font-medium">Masuk (Beli)</th>
 <th className="p-4 font-medium">Keluar (Jual)</th>
 <th className="p-4 font-medium text-right">Harga Beli</th>
 <th className="p-4 font-medium text-right">Harga Jual</th>
 <th className="p-4 font-medium">Exit</th>
 <th className="p-4 font-medium text-right">PnL</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-line">
 {result.trades.map((trade, idx) => (
 <tr key={idx} className="hover:bg-sunken transition-colors">
 <td className="p-4 text-sm text-muted ">{trade.entryDate}</td>
 <td className="p-4 text-sm text-muted ">{trade.exitDate}</td>
 <td className="p-4 text-sm text-right font-medium">Rp {trade.entryPrice.toLocaleString('id-ID')}</td>
 <td className="p-4 text-sm text-right font-medium">Rp {trade.exitPrice.toLocaleString('id-ID')}</td>
 <td className="p-4 text-xs text-muted ">{trade.reason || '-'}</td>
 <td className="p-4 text-right">
 <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
 trade.type === 'WIN' 
 ? 'bg-up-soft text-up border border-up' 
 : trade.type === 'LOSS'
 ? 'bg-down-soft text-down border border-down'
 : 'bg-sunken text-muted border border-line'
 }`}>
 {trade.type === 'WIN' ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <div className="p-10 text-center text-muted ">
 Sistem tidak menemukan Setup Entry yang valid untuk saham dan gaya trading ini sepanjang tahun terakhir.
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
