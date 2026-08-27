'use client';

import React, { useState } from 'react';

export default function GrowthStoryTab({ stocks = [] }) {
  // Decision Flowchart interactive state
  const [step1HasStory, setStep1HasStory] = useState(null);
  const [step2FinancialGood, setStep2FinancialGood] = useState(null);
  const [step3CanImprove, setStep3CanImprove] = useState(null);
  const [step4FatalRisk, setStep4FatalRisk] = useState(null);
  const [step5PriceCheap, setStep5PriceCheap] = useState(null);

  // Checkup 3-6 months interactive state
  const [checkupQ1PriceAttractive, setCheckupQ1PriceAttractive] = useState(null);
  const [checkupQ2Catalyst, setCheckupQ2Catalyst] = useState(null);

  // Filter stocks matching Growth Story
  const growthStocks = stocks.filter(s => s.revenueGrowth >= 10 && s.roe >= 12);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
          <span>🌱 Growth Story Investing Framework</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">Saham Dengan Growth Story</h2>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
          Lakukan analisis secara cermat dan kritis agar tidak terjebak oleh hype. Jembatani narasi cerita bisnis dengan data fundamental teruji.
        </p>
      </div>

      {/* SECTION 1: Interactive Decision Flowchart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🌳 Interactive Growth Story Decision Tree</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ikuti alur panduan keputusan Alpha Legends untuk mengevaluasi saham growth</p>
        </div>

        {/* Interactive Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Langkah 1</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Apakah Ada Growth Story?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Scuttlebutt: Laporan tahunan, public expose, berita ekspansi bisnis.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep1HasStory(true)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step1HasStory === true ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Ya
              </button>
              <button
                onClick={() => setStep1HasStory(false)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step1HasStory === false ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Tidak
              </button>
            </div>
            {step1HasStory === false && (
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                🚫 Hasil: Tidak Masuk Kategori
              </div>
            )}
          </div>

          {/* Step 2 */}
          {step1HasStory === true && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Langkah 2</span>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Apakah Kondisi Keuangan Bagus?</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Cek Solvabilitas (Utang), Likuiditas, Profit Margin, ROE, Growth Rate.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep2FinancialGood(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step2FinancialGood === true ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Ya
                </button>
                <button
                  onClick={() => setStep2FinancialGood(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step2FinancialGood === false ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tidak
                </button>
              </div>
            </div>
          )}

          {/* Step 3 (If financial not good) */}
          {step1HasStory === true && step2FinancialGood === false && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Langkah 2b</span>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Bisa Membaik Dalam Waktu Dekat?</h4>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep3CanImprove(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step3CanImprove === true ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Ya
                </button>
                <button
                  onClick={() => setStep3CanImprove(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step3CanImprove === false ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tidak
                </button>
              </div>
              {step3CanImprove === false && (
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                  ⏩ Hasil: Lewati Saja
                </div>
              )}
            </div>
          )}

          {/* Step 4 (Fatal Risk Check) */}
          {step1HasStory === true && (step2FinancialGood === true || step3CanImprove === true) && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Langkah 3</span>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Ada Potensi Risiko Fatal?</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gunakan Altman Z-Score & Altman F-Score untuk proteksi kebangkrutan.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep4FatalRisk(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step4FatalRisk === true ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Ya (Ada)
                </button>
                <button
                  onClick={() => setStep4FatalRisk(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step4FatalRisk === false ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tidak (Aman)
                </button>
              </div>
              {step4FatalRisk === true && (
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                  ⚠️ Hasil: HINDARI SAHAINI
                </div>
              )}
            </div>
          )}

          {/* Step 5 (Valuation Check) */}
          {step1HasStory === true && (step2FinancialGood === true || step3CanImprove === true) && step4FatalRisk === false && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Langkah 4</span>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Apakah Harganya Masih Murah?</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Valuasi Konservatif & Piotroski F-Score High.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep5PriceCheap(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step5PriceCheap === true ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Ya (Murah)
                </button>
                <button
                  onClick={() => setStep5PriceCheap(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    step5PriceCheap === false ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tidak (Mahal)
                </button>
              </div>
              {step5PriceCheap === true && (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                  ⭐⭐⭐⭐⭐ KANDIDAT KUAT (Beli / Akumulasi)
                </div>
              )}
              {step5PriceCheap === false && (
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">
                  ⏳ TUNGGU HARGA MURAH (Lakukan Valuasi Konservatif)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Periodic Check-up (3-6 Bulan) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">🔄 Cerita Bisa Berubah, Pantau Secara Berkala</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pertanyaan wajib setiap 3–6 bulan untuk menentukan aksi portofolio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Kategori A</span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Ceritanya Semakin Menarik</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Laba bersih naik & katalis baru makin kuat.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-block">
                ➕ TAMBAH PORSI SAHAMNYA
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-2">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400">Kategori B</span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Ceritanya Memburuk</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Laba bersih meleset & narasi ekspansi gagal.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold inline-block">
                ➖ KURANGI PORSI SAHAMNYA
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 space-y-2">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">Kategori C</span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Ceritanya Tidak Berubah</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Kinerja stagnan sesuai ekspektasi.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold inline-block">
                👉 BIARKAN SAJA / PINDAH SAHAM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Hyman Minsky Cycle Warning */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-amber-400">⚠️ Pastikan Harapanmu Realistis: Hyman Minsky Cycle</h3>
          <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-500/30">
            Spekulasi Pasar
          </span>
        </div>
        <p className="text-xs text-white/80">
          Gejala jatuhnya pasar karena aksi spekulasi berlebihan. Siklus spekulasi Hyman Minsky:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Fase 1</span>
            <div className="text-xs font-black text-blue-400">Displacement</div>
            <p className="text-[9px] text-slate-400">Fenomena baru dimulai</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Fase 2</span>
            <div className="text-xs font-black text-emerald-400">Boom</div>
            <p className="text-[9px] text-slate-400">Mendapatkan momentum</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Fase 3</span>
            <div className="text-xs font-black text-amber-400">Euphoria</div>
            <p className="text-[9px] text-slate-400">Mencapai level ekstrim</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Fase 4</span>
            <div className="text-xs font-black text-orange-400">Profit Taking</div>
            <p className="text-[9px] text-slate-400">Smart money mendeteksi bahaya</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Fase 5</span>
            <div className="text-xs font-black text-rose-500">Panic (Minsky)</div>
            <p className="text-[9px] text-slate-400">Harga turun sangat cepat</p>
          </div>
        </div>
      </div>

      {/* SECTION 4: Screener Saham Growth Story */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white">🚀 Hasil Screener Saham Growth Story</h3>

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Saham</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Harga</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Rev Growth</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">CAGR Laba</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">ROE</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Altman Z-Score</th>
                <th className="p-3 bg-slate-100 dark:bg-slate-900">Piotroski F-Score</th>
                <th className="p-3 text-right bg-slate-100 dark:bg-slate-900">Rekomendasi Alur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {growthStocks.map((stock, i) => {
                const revGrowth = Number(stock.revenueGrowth ?? 0);
                const profitGrowth = Number(stock.cagr ?? stock.profitGrowth ?? 0);
                const roe = Number(stock.roe ?? 0);
                const zScore = Number(stock.altmanZScore ?? 0);
                const fScore = Number(stock.piotroskiFScore ?? 0);
                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 dark:text-white">{stock.symbol}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{stock.name || stock.symbol}</div>
                    </td>
                    <td className="p-3 font-semibold">Rp {(stock.price || 0).toLocaleString('id-ID')}</td>
                    <td className={`p-3 font-bold ${revGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {revGrowth >= 0 ? `+${revGrowth.toFixed(1)}%` : `${revGrowth.toFixed(1)}%`}
                    </td>
                    <td className={`p-3 font-bold ${profitGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {profitGrowth >= 0 ? `+${profitGrowth.toFixed(1)}%` : `${profitGrowth.toFixed(1)}%`}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {roe.toFixed(1)}%
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {zScore > 0 ? zScore.toFixed(2) : '-'}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {fScore > 0 ? `${Math.round(fScore)}/9` : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {stock.growthStoryCategory || 'Kandidat Kuat ⭐⭐⭐⭐⭐'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
