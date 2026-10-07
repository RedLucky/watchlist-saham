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
      <div className="card p-4 sm:p-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-up-soft text-up text-xs font-bold border border-up">
          <span>↑ Growth Story Investing Framework</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">Saham Dengan Growth Story</h2>
        <p className="text-xs sm:text-sm text-up max-w-2xl">
          Lakukan analisis secara cermat dan kritis agar tidak terjebak oleh hype. Jembatani narasi cerita bisnis dengan data fundamental teruji.
        </p>
      </div>

      {/* SECTION 1: Interactive Decision Flowchart */}
      <div className="p-6 rounded-md bg-surface border border-line shadow-sm space-y-6">
        <div className="border-b border-line pb-4">
          <h3 className="text-lg font-black text-ink flex items-center gap-2">
            <span>◍ Interactive Growth Story Decision Tree</span>
          </h3>
          <p className="text-xs text-muted ">Ikuti alur panduan keputusan Alpha Legends untuk mengevaluasi saham growth</p>
        </div>

        {/* Interactive Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-md bg-sunken border border-line space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink ">Langkah 1</span>
            <h4 className="text-xs font-black text-ink ">Apakah Ada Growth Story?</h4>
            <p className="text-[11px] text-muted ">Scuttlebutt: Laporan tahunan, public expose, berita ekspansi bisnis.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep1HasStory(true)}
                className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step1HasStory === true ? 'bg-up text-on-accent' : 'bg-sunken text-ink '
 }`}
              >
                Ya
              </button>
              <button
                onClick={() => setStep1HasStory(false)}
                className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step1HasStory === false ? 'bg-down text-on-accent' : 'bg-sunken text-ink '
 }`}
              >
                Tidak
              </button>
            </div>
            {step1HasStory === false && (
              <div className="p-2 rounded-sm bg-down-soft text-down text-[10px] font-bold">
                ⊘ Hasil: Tidak Masuk Kategori
              </div>
            )}
          </div>

          {/* Step 2 */}
          {step1HasStory === true && (
            <div className="p-4 rounded-md bg-sunken border border-line space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink ">Langkah 2</span>
              <h4 className="text-xs font-black text-ink ">Apakah Kondisi Keuangan Bagus?</h4>
              <p className="text-[11px] text-muted ">Cek Solvabilitas (Utang), Likuiditas, Profit Margin, ROE, Growth Rate.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep2FinancialGood(true)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step2FinancialGood === true ? 'bg-up text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Ya
                </button>
                <button
                  onClick={() => setStep2FinancialGood(false)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step2FinancialGood === false ? 'bg-warn text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Tidak
                </button>
              </div>
            </div>
          )}

          {/* Step 3 (If financial not good) */}
          {step1HasStory === true && step2FinancialGood === false && (
            <div className="p-4 rounded-md bg-sunken border border-line space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-warn ">Langkah 2b</span>
              <h4 className="text-xs font-black text-ink ">Bisa Membaik Dalam Waktu Dekat?</h4>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep3CanImprove(true)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step3CanImprove === true ? 'bg-up text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Ya
                </button>
                <button
                  onClick={() => setStep3CanImprove(false)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step3CanImprove === false ? 'bg-down text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Tidak
                </button>
              </div>
              {step3CanImprove === false && (
                <div className="p-2 rounded-sm bg-down-soft text-down text-[10px] font-bold">
                  » Hasil: Lewati Saja
                </div>
              )}
            </div>
          )}

          {/* Step 4 (Fatal Risk Check) */}
          {step1HasStory === true && (step2FinancialGood === true || step3CanImprove === true) && (
            <div className="p-4 rounded-md bg-sunken border border-line space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink ">Langkah 3</span>
              <h4 className="text-xs font-black text-ink ">Ada Potensi Risiko Fatal?</h4>
              <p className="text-[11px] text-muted ">Gunakan Altman Z-Score & Altman F-Score untuk proteksi kebangkrutan.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep4FatalRisk(true)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step4FatalRisk === true ? 'bg-down text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Ya (Ada)
                </button>
                <button
                  onClick={() => setStep4FatalRisk(false)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step4FatalRisk === false ? 'bg-up text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Tidak (Aman)
                </button>
              </div>
              {step4FatalRisk === true && (
                <div className="p-2 rounded-sm bg-down-soft text-down text-[10px] font-bold">
                  ▲ Hasil: HINDARI SAHAINI
                </div>
              )}
            </div>
          )}

          {/* Step 5 (Valuation Check) */}
          {step1HasStory === true && (step2FinancialGood === true || step3CanImprove === true) && step4FatalRisk === false && (
            <div className="p-4 rounded-md bg-sunken border border-line space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink ">Langkah 4</span>
              <h4 className="text-xs font-black text-ink ">Apakah Harganya Masih Murah?</h4>
              <p className="text-[11px] text-muted ">Valuasi Konservatif & Piotroski F-Score High.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep5PriceCheap(true)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step5PriceCheap === true ? 'bg-up text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Ya (Murah)
                </button>
                <button
                  onClick={() => setStep5PriceCheap(false)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold transition-all ${
 step5PriceCheap === false ? 'bg-warn text-on-accent' : 'bg-sunken text-ink '
 }`}
                >
                  Tidak (Mahal)
                </button>
              </div>
              {step5PriceCheap === true && (
                <div className="p-3 rounded-sm bg-up-soft text-up text-xs font-black">
                  ★★★★★ KANDIDAT KUAT (Beli / Akumulasi)
                </div>
              )}
              {step5PriceCheap === false && (
                <div className="p-3 rounded-sm bg-warn-soft text-warn text-xs font-black">
                  … TUNGGU HARGA MURAH (Lakukan Valuasi Konservatif)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Periodic Check-up (3-6 Bulan) */}
      <div className="p-6 rounded-md bg-surface border border-line shadow-sm space-y-6">
        <div className="border-b border-line pb-4">
          <h3 className="text-lg font-black text-ink ">↻ Cerita Bisa Berubah, Pantau Secara Berkala</h3>
          <p className="text-xs text-muted ">Pertanyaan wajib setiap 3–6 bulan untuk menentukan aksi portofolio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-md bg-up-soft border border-up space-y-2">
            <span className="text-xs font-black text-up ">Kategori A</span>
            <h4 className="text-sm font-extrabold text-ink ">Ceritanya Semakin Menarik</h4>
            <p className="text-xs text-muted ">Laba bersih naik & katalis baru makin kuat.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-sm bg-up text-on-accent text-xs font-bold inline-block">
                + TAMBAH PORSI SAHAMNYA
              </span>
            </div>
          </div>

          <div className="p-4 rounded-md bg-down-soft border border-down space-y-2">
            <span className="text-xs font-black text-down ">Kategori B</span>
            <h4 className="text-sm font-extrabold text-ink ">Ceritanya Memburuk</h4>
            <p className="text-xs text-muted ">Laba bersih meleset & narasi ekspansi gagal.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-sm bg-down text-on-accent text-xs font-bold inline-block">
                − KURANGI PORSI SAHAMNYA
              </span>
            </div>
          </div>

          <div className="p-4 rounded-md bg-sunken border border-line space-y-2">
            <span className="text-xs font-black text-ink ">Kategori C</span>
            <h4 className="text-sm font-extrabold text-ink ">Ceritanya Tidak Berubah</h4>
            <p className="text-xs text-muted ">Kinerja stagnan sesuai ekspektasi.</p>
            <div className="pt-2">
              <span className="px-3 py-1.5 rounded-sm bg-accent text-on-accent text-xs font-bold inline-block">
                › BIARKAN SAJA / PINDAH SAHAM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Hyman Minsky Cycle Warning */}
      <div className="p-6 rounded-md bg-ink text-on-accent shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-warn">▲ Pastikan Harapanmu Realistis: Hyman Minsky Cycle</h3>
          <span className="text-xs bg-warn-soft text-warn font-bold px-3 py-1 rounded-full border border-warn">
            Spekulasi Pasar
          </span>
        </div>
        <p className="text-xs text-muted">
          Gejala jatuhnya pasar karena aksi spekulasi berlebihan. Siklus spekulasi Hyman Minsky:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-2">
          <div className="p-3 rounded-sm bg-sunken border border-line space-y-1">
            <span className="text-[10px] font-bold text-muted">Fase 1</span>
            <div className="text-xs font-black text-ink">Displacement</div>
            <p className="text-[9px] text-muted">Fenomena baru dimulai</p>
          </div>
          <div className="p-3 rounded-sm bg-sunken border border-line space-y-1">
            <span className="text-[10px] font-bold text-muted">Fase 2</span>
            <div className="text-xs font-black text-up">Boom</div>
            <p className="text-[9px] text-muted">Mendapatkan momentum</p>
          </div>
          <div className="p-3 rounded-sm bg-sunken border border-line space-y-1">
            <span className="text-[10px] font-bold text-muted">Fase 3</span>
            <div className="text-xs font-black text-warn">Euphoria</div>
            <p className="text-[9px] text-muted">Mencapai level ekstrim</p>
          </div>
          <div className="p-3 rounded-sm bg-sunken border border-line space-y-1">
            <span className="text-[10px] font-bold text-muted">Fase 4</span>
            <div className="text-xs font-black text-warn">Profit Taking</div>
            <p className="text-[9px] text-muted">Smart money mendeteksi bahaya</p>
          </div>
          <div className="p-3 rounded-sm bg-sunken border border-line space-y-1">
            <span className="text-[10px] font-bold text-muted">Fase 5</span>
            <div className="text-xs font-black text-down">Panic (Minsky)</div>
            <p className="text-[9px] text-muted">Harga turun sangat cepat</p>
          </div>
        </div>
      </div>

      {/* SECTION 4: Screener Saham Growth Story */}
      <div className="p-6 rounded-md bg-surface border border-line shadow-sm space-y-4">
        <h3 className="text-base font-black text-ink ">↑ Hasil Screener Saham Growth Story</h3>

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-md border border-line ">
          <table className="w-full text-left text-xs">
            <thead className="bg-sunken text-ink font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-xs border-b border-line ">
              <tr>
                <th className="p-3 bg-sunken ">Saham</th>
                <th className="p-3 bg-sunken ">Harga</th>
                <th className="p-3 bg-sunken ">Rev Growth</th>
                <th className="p-3 bg-sunken ">CAGR Laba</th>
                <th className="p-3 bg-sunken ">ROE</th>
                <th className="p-3 bg-sunken ">Altman Z-Score</th>
                <th className="p-3 bg-sunken ">Piotroski F-Score</th>
                <th className="p-3 text-right bg-sunken ">Rekomendasi Alur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {growthStocks.map((stock, i) => {
                const revGrowth = Number(stock.revenueGrowth ?? 0);
                const profitGrowth = Number(stock.cagr ?? stock.profitGrowth ?? 0);
                const roe = Number(stock.roe ?? 0);
                const zScore = Number(stock.altmanZScore ?? 0);
                const fScore = Number(stock.piotroskiFScore ?? 0);
                return (
                  <tr key={i} className="hover:bg-sunken transition-colors">
                    <td className="p-3">
                      <div className="font-extrabold text-ink ">{stock.symbol}</div>
                      <div className="text-[10px] text-muted line-clamp-1">{stock.name || stock.symbol}</div>
                    </td>
                    <td className="p-3 font-semibold">Rp {(stock.price || 0).toLocaleString('id-ID')}</td>
                    <td className={`p-3 font-bold ${revGrowth >= 0 ? 'text-up ' : 'text-down '}`}>
                      {revGrowth >= 0 ? `+${revGrowth.toFixed(1)}%` : `${revGrowth.toFixed(1)}%`}
                    </td>
                    <td className={`p-3 font-bold ${profitGrowth >= 0 ? 'text-up ' : 'text-down '}`}>
                      {profitGrowth >= 0 ? `+${profitGrowth.toFixed(1)}%` : `${profitGrowth.toFixed(1)}%`}
                    </td>
                    <td className="p-3 font-bold text-ink ">
                      {roe.toFixed(1)}%
                    </td>
                    <td className="p-3 font-semibold text-ink ">
                      {zScore > 0 ? zScore.toFixed(2) : '-'}
                    </td>
                    <td className="p-3 font-semibold text-ink ">
                      {fScore > 0 ? `${Math.round(fScore)}/9` : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-up-soft text-up ">
                        {stock.growthStoryCategory || 'Kandidat Kuat ★★★★★'}
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
