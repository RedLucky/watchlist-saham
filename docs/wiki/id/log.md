# Log Kronologis Wiki

Seluruh riwayat perubahan, penambahan materi (*ingest*), dan pemutakhiran basis pengetahuan dicatat di sini secara kronologis.

---

## [2026-09-16] feat | Bloomberg Terminal Fase 5: Rotasi Sektoral RRG, Sentimen Berita NSENT, dan Berkas Riset AI BI
- Membangun `src/lib/sectorRrgEngine.js` (Bloomberg `RRG` / `SECT`): matriks rotasi 4-kuadran (Leading, Weakening, Lagging, Improving) menghitung RS-Ratio dan RS-Momentum terhadap IHSG acuan.
- Membangun `src/lib/newsSentimentEngine.js` (Bloomberg `NSENT`): indeks kuantitatif sentimen berita (-100 s/d +100), pembobotan risiko defensif kata kunci, dan deteksi otomatis katalis korporasi.
- Mengintegrasikan berkas riset ekuitas AI (Bloomberg `BI`) dan sentimen NSENT ke dalam respons `GET /api/stocks/[ticker]`.
- Mengintegrasikan matriks rotasi sektor RRG ke dalam `GET /api/sectors` dan menambahkan tombol interaktif pada `SectorBar.jsx`.
- Membangun komponen UI: `SectorRrgPanel.jsx` dan `BloombergIntelligencePanel.jsx` yang disematkan di Stock Explorer.
- Menambahkan pengujian unit: `tests/sectorRrg.test.js` dan `tests/newsSentiment.test.js` (193/193 total pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah: `docs/wiki/id/trading-system/rotasi-sektoral-rrg.md`, `sentimen-berita-katalis.md`, dan `docs/wiki/id/financial-engine/berkas-riset-ai-bi.md`.

## [2026-09-16] feat | Bloomberg Terminal Fase 4: Peta KSEI OWN/HDS, Konsentrasi Broker BRKR, dan Volume Profile GP
- Membangun `src/lib/kseiShiftEngine.js` (Bloomberg `OWN` & `HDS`): pergeseran kepemilikan institusi bulanan (MoM Shift), divergensi kepemilikan ritel vs institusi, serta rincian sub-kategori pemegang domestik (Dana Pensiun, Reksa Dana, Asuransi, Bank, Sekuritas).
- Membangun `src/lib/brokerConcentrationEngine.js` (Bloomberg `BRKR`): rasio konsentrasi broker institusi (CR1, CR3, CR5) dan Bandarmologi Flow Index (BFI).
- Membangun `src/lib/volumeProfileEngine.js` (Bloomberg `GP`): pemetaan horizontal volume bins, Point of Control (POC), 70% Value Area (VAH & VAL), dan status lelang harga pasar.
- Mengintegrasikan hasil kalkulasi KSEI shift, konsentrasi broker, dan volume profile ke respons `GET /api/stocks/[ticker]`.
- Membangun komponen antarmuka visual: `SmartMoneyLiquidityPanel.jsx` yang disematkan di `StockExplorer.jsx`.
- Menambahkan pengujian unit komprehensif pada `tests/kseiShift.test.js`, `tests/brokerConcentration.test.js`, dan `tests/volumeProfile.test.js` (186/186 pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah pada `docs/wiki/id/trading-system/pergeseran-smart-money-ksei.md`, `volume-profile-value-area.md`, dan `konsentrasi-broker-bandarmologi.md`.

## [2026-09-16] feat | Bloomberg Terminal Fase 3: Batas Regulasi ARA/ARB, Tangga Fraksi, Manajemen Risiko PORT/MARS, dan Mesin ALRT
- Membangun `src/lib/idxExecutionLimits.js` (Bloomberg `ARA` / `ARB`): batas persentase simetris BEI (35%, 25%, 20%, 10%), perhitungan presisi jarak fraksi (`countTicksBetween`), dan tangga eksekusi 7 tingkat.
- Membangun `src/lib/portfolioRiskEngine.js` (Bloomberg `PORT` & `MARS`): Weighted Portfolio Beta ($\beta_{\text{port}}$), Value at Risk 1-hari (VaR 95%), deteksi konsentrasi emiten/sektor, serta 4 skenario uji ketahanan makro (IHSG crash, BI rate hike, komoditas, pelemahan rupiah).
- Membangun `src/lib/smartAlertEngine.js` (Bloomberg `ALRT`): evaluasi sinyal otomatis berbasis aturan (kedekatan ARA/ARB $\le 2$ fraksi, diskon valuasi PBND $\le -1.5\text{SD}$, jebakan dividen, lonjakan volume) serta generator embed Discord.
- Mengintegrasikan modul ARA/ARB dan ALRT pada `GET /api/stocks/[ticker]`, dan PORT/MARS pada `GET /api/portfolio`.
- Membangun komponen visual: `AutoRejectionLadderPanel.jsx` di Stock Explorer dan Kokpit Risiko & Uji Ketahanan Makro di `PortfolioPanel.jsx`.
- Menambahkan pengujian unit komprehensif pada `tests/idxExecutionLimits.test.js`, `tests/portfolioRisk.test.js`, dan `tests/smartAlert.test.js` (176/176 pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah pada `docs/wiki/id/trading-system/tangga-auto-rejection.md`, `manajemen-risiko-portofolio.md`, dan `peringatan-pintar-alrt.md`.

## [2026-09-16] feat | Bloomberg Terminal Fase 2: Analisis Jebakan Dividen DTRP, Run-Rate DVD, dan Kalender Aksi Korporasi CA
- Membangun `src/lib/dividendTrapEngine.js` (Bloomberg `DTRP` & `DVD`): menganalisis jebakan dividen (*dividend trap*), kecukupan FCF, batasan DPR, risiko utang, serta konsistensi dividen aristokrat BEI; menghitung *run-rate* dividen pasif 12 bulan per lot (harian, bulanan, tahunan).
- Membangun `src/lib/corporateActionEngine.js` (Bloomberg `CA`): menyusun kalender dan hitung mundur dividen tunai, RUPS (RUPST/RUPSLB), serta jendela resmi musim rilis laporan keuangan berkala BEI/OJK.
- Mengintegrasikan hasil kalkulasi DTRP, DVD run-rate, dan kalender CA ke dalam payload respons `GET /api/stocks/[ticker]`.
- Membangun komponen antarmuka interaktif: `DividendTrapPanel.jsx` dan `CorporateActionsPanel.jsx` yang disematkan di bawah simulator skenario pada `StockExplorer.jsx`.
- Menambahkan pengujian unit komprehensif pada `tests/dividendTrap.test.js` dan `tests/corporateAction.test.js` (160/160 pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah pada `docs/wiki/id/financial-engine/jebakan-dividen-dtrp.md` dan `kalender-aksi-korporasi.md`.

## [2026-09-16] feat | Bloomberg Terminal Fase 1: Pita Valuasi PBND, WACC/EVA, dan Simulator SCEN
- Membangun `src/lib/valuationBands.js` (Bloomberg `PBND`): menghitung Mean historis, Standar Deviasi, pita +/-1 SD, +/-2 SD untuk PER & PBV, target harga fraksi BEI, serta zona valuasi statistik.
- Membangun `src/lib/waccEngine.js` (Bloomberg `WACC`): menghitung biaya modal rata-rata tertimbang, biaya ekuitas CAPM ($R_f=6.5\%$), biaya utang setelah pajak, ROIC, dan Economic Spread (klasifikasi Value Creator vs Destroyer).
- Mengintegrasikan hasil kalkulasi PBND dan WACC ke dalam payload respons `GET /api/stocks/[ticker]`.
- Membangun komponen antarmuka interaktif: `ValuationBandsPanel.jsx` (tombol alih PER/PBV), `EconomicValuePanel.jsx` (struktur modal & EVA), dan `ScenarioForecaster.jsx` (slider simulasi What-If Bloomberg `SCEN`).
- Menyematkan ketiga komponen tersebut di bawah Grafik Interaktif pada `StockExplorer.jsx`.
- Menambahkan pengujian unit komprehensif pada `tests/valuationBands.test.js` dan `tests/waccEngine.test.js` (152/152 pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah pada `docs/wiki/id/financial-engine/pita-valuasi-pbnd.md` dan `wacc-nilai-ekonomi.md`.

## [2026-09-16] fix | Penguatan Mesin Riset AI Stock Explorer & Optimasi Antrean Worker
- Memangkas interval polling worker dari 60 detik menjadi 3 detik (`POLL_INTERVAL = 3000`) pada `src/scripts/ai-worker.js`, mempercepat respon pengambilan tugas dari ~75 detik menjadi ~20 detik.
- Menambahkan mekanisme pemulihan otomatis (*stale task recovery*) untuk tugas yang macet di status `PROCESSING` (> 10 menit) baik di worker maupun endpoint `POST /api/ai/research`, menghilangkan risiko saham terkunci permanen.
- Menyempurnakan fungsi `extractSection` dengan regex fleksibel tanpa memedulikan variasi penulisan heading markdown (`## 2.`, `## 2:`, `### 2.`).
- Mengganti batasan kuartal kalender dengan masa validitas 30 hari (`CACHE_VALIDITY_DAYS = 30`) serta menambahkan parameter `{ force: true }` untuk analisis instan saat ada rilis laporan keuangan atau fluktuasi harga drastis.
- Menambahkan pengecualian baca publik `GET /api/ai/research` pada Edge proxy (`src/proxy.js`) sehingga pengunjung tanpa login dapat membaca berkas riset AI.
- Meningkatkan fungsi `renderAiMarkdown` pada `StockExplorer.jsx` dengan render tabel markdown responsif (`| Kolom |`), list berangka, dan tombol aksi "Perbarui Riset" langsung di dalam modal.
- Menambahkan rangkaian pengujian unit komprehensif pada `tests/aiResearchEngine.test.js` (total 142/142 pengujian lulus 100%).

## [2026-09-16] feat | Mesin Valuasi Relatif (RV) Bloomberg & Benchmarking Peers Sub-Sektor
- Implementasi seleksi otomatis emiten pembanding pada `GET /api/stocks/[ticker]` berdasarkan kesesuaian `subSector` (atau `sector`) dengan urutan nilai transaksi harian (*turnover*).
- Pembangunan komponen `RelativeValuationPeers.jsx` untuk komparasi metrik berdampingan (PER, PBV, ROE, NPM, DER, Dividend Yield, MoS Graham, skor komposit).
- Penambahan penanda visual *Best-in-Class*, benchmarking terhadap median sektor, serta ringkasan komparasi berbasis bahasa alami.
- Integrasi jembatan 1-klik menuju lembar kerja komparasi multi-saham (`Buka Komparasi Lengkap`).
- Publikasi dokumentasi ilmiah pada `docs/wiki/id/financial-engine/valuasi-relatif-peers.md` dan cermin bahasa Inggris.
- Penambahan test suite pengujian unit pada `tests/relativeValuation.test.js` (total 136/136 pengujian lulus 100%).

## [2026-09-16] feat | Generasi Portofolio Pensiun Berbasis AI & Knapsack Lot Optimizer
- Pembangunan solver Bounded Integer Knapsack (`src/lib/lotOptimizer.js`) menjamin zero-overbudget dan penyerapan modal 98–99.9% ke satuan lot BEI.
- Pembuatan endpoint `POST /api/pension/ai-generate` mengintegrasikan model `llama.cpp` lokal dengan peran CFP spesialis pensiun dan filter multi-faktor.
- Pengecualian rute `/api/pension/preset` dan `/api/pension/ai-generate` pada proksi Edge (`src/proxy.js`) agar dapat diakses publik tanpa hambatan otentikasi.
- Kalibrasi alokasi token Qwen (`maxTokens: 850`, pelarangan tag `<think>`) untuk respon JSON ringkas dan lengkap dalam rentang waktu ~40-70 detik pada CPU.
- Peningkatan antarmuka `PensionCalculator.jsx` dengan tombol aksi gradien `✨ Optimasi AI`, animasi memuat interaktif, dan kartu tesis AI.
- Publikasi modul basis pengetahuan: `docs/wiki/id/financial-engine/portofolio-pensiun.md` dan `docs/wiki/en/financial-engine/pension-portfolio.md`.
- Penambahan pengujian unit komprehensif pada `tests/pensionAi.test.js` (total 132 pengujian lulus 100%).

## [2026-09-16] feat | Mesin Riset AI Lokal, Bot Interaktif Discord & Pemutakhiran Wiki
- Integrasi mesin inferensi lokal `llama.cpp` (`docker-compose.ai.yml`, Qwen 4B GGUF) dengan tuning thread CPU Intel Generasi 14 (6 thread P-Cores, flash attention).
- Pembangunan antrean pekerja asinkron (`src/scripts/ai-worker.js`) memanfaatkan `AiResearchQueue`, `AiStockResearch`, dan metrik performa di `AiAuditLog`.
- Implementasi agregasi berita pasar modal terkini (`src/lib/ai/search.js`: Bing News RSS + cadangan Google News RSS) dengan filter umur 90 hari.
- Peluncuran Bot Interaktif Discord dua arah (`src/scripts/discord-bot.js`) dengan ekstraksi ticker alami (NLP), cache pintar 30 hari, dan visualisasi rich embed.
- Publikasi dokumentasi basis pengetahuan: `docs/wiki/id/architecture/mesin-ai.md` dan `docs/wiki/id/trading-system/bot-discord.md`.

## [2026-09-08] feat | Fresh MACD Golden/Dead Cross & Proteksi RSI Extreme Overbought
- Peningkatan fungsi `calculateMACD` di `src/lib/indicators.js` untuk mendeteksi `prevHistogram`, `isGoldenCross`, dan `isDeadCross`.
- Integrasi Fresh MACD Golden Cross (bonus setup +10) dan Dead Cross (penalti setup -15) pada `src/lib/scoring/technical.js`.
- Penerapan Proteksi Jenuh Beli Ekstrim ($\text{RSI} \ge 75$) pada `src/lib/signals/styleSignal.js` dan `src/lib/scoring/technical.js` guna menggagalkan setup beli (`setup: 'none'`) dan menangkal risiko jebakan beli di puncak harga (*FOMO buying*).
- Penambahan pengujian unit komprehensif pada `tests/indicators.test.js` dan `tests/scoring.test.js` (82 pengujian lulus).

## [2026-09-07] feat | Resolusi P/L Time Stop & Pengukuran Win Rate 100%
- Mengeliminasi status ambigu `CLOSED` di `src/lib/recommendationTracker.js` (Solusi 1).
- Penutupan posisi karena batas waktu (*Time Stop*) kini mengevaluasi hasil P/L riil: $\text{exitPrice} \ge \text{entryPrice}$ menjadi `WIN (Time)`, sedangkan $\text{exitPrice} < \text{entryPrice}$ menjadi `LOSS (Time)`.
- Pembaruan lencana status di `src/components/HistoryPanel.jsx` untuk membedakan `WIN (TP)` vs `WIN (Time)` dan `LOSS (SL)` vs `LOSS (Time)`.
- Penyelarasan notifikasi Discord untuk memberi peringatan penutupan posisi via batas waktu (*Time Stop*).
- Migrasi data historis riil dari status lawas `CLOSED` ke klasifikasi `WIN` / `LOSS` yang sesuai.

## [2026-09-04] feat | Presisi Teknikal, ATR Stop Loss, dan Peningkatan Indikator
- Penerapan Stop Loss adaptif berbasis volatilitas menggunakan $1.5 \times \text{ATR}_{14}$ & batasan Supertrend di `src/lib/tradeSetup.js`.
- Penyelarasan Target Price (Take Profit) terjangkar resisten swing high 20 hari di `src/lib/tradeSetup.js`.
- Integrasi deteksi Bollinger Squeeze (`bandwidth <= 0.12`) dengan bonus skoring setup breakout di `src/lib/scoring/technical.js`.
- Kalibrasi ambang batas perputaran harian dinamis multi-tier (Opsi B: Rp 250 Jt untuk Scalping/Swing, Rp 1 Miliar untuk Defensive/Dividen, Rp 150 Jt untuk Growth, Rp 50 Jt untuk Custom).
- Perluasan cakupan unit test pada `tests/tradeSetup.test.js` dan `tests/scoring.test.js` hingga 76 tes berhasil lulus.

## [2026-09-03] init | Inisialisasi LLM Wiki Knowledge Base
- Pembuatan struktur direktori modular Wiki (`docs/wiki/`) dalam dwi-bahasa (EN & ID).
- Dokumentasi arsitektur sistem (Next.js 16, Prisma, Postgres, Plus Jakarta Sans, RTK token killer).
- Dokumentasi model kuantitatif (valuasi Graham, Altman Z, Piotroski F, RSI Wilder, Supertrend DEMA).
- Dokumentasi siklus hidup order transaksi dan antre beli (*limit order matching*).
- Integrasi aturan wajib pemanggilan wiki ke dalam `AGENTS.md`.
