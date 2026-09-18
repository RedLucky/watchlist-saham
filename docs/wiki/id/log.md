# Log Kronologis Wiki

Seluruh riwayat perubahan, penambahan materi (*ingest*), dan pemutakhiran basis pengetahuan dicatat di sini secara kronologis.

---

## [2026-09-18] feat | Peningkatan Win Rate, Perombakan Eksekusi & Mesin Rekomendasi Bot Discord
- Diagnosis Penurunan Win Rate Sistem: Mengidentifikasi akar masalah di balik performa kumulatif bot sistem (-10.76% vs portofolio pantauan manual +38.95%), meliputi penutupan Time Stop prematur saat koreksi wajar (< 1.5%), target TP swing yang terlalu tinggi untuk gaya scalping, dan penumpukan rekomendasi duplikat pada saham yang sedang turun.
- Active Position Lockout (Anti-Duplikasi): Memperbarui `src/scripts/discord-notifier.js` untuk memeriksa status aktif emiten (`OPEN` atau `WAITING_BUY`) sebelum menerbitkan sinyal baru. Mencegah akumulasi kerugian ganda pada emiten yang sedang terkoreksi.
- Batas Maksimum Target Profit (TP Cap) Sesuai Gaya Trading: Menambahkan batas realistis di `src/lib/tradeSetup.js` (`SCALP_MAX_TARGET_PCT = 5.0%`, `DAILY_MAX_TARGET_PCT = 8.0%`, `SWING_MAX_TARGET_PCT = 18.0%`). Mencegah target scalping berdurasi 2 hari dipatok ke resistensi swing 20 hari (+15% s.d. +25%).
- Buffer Grace Period Time Stop: Memperbarui `src/lib/recommendationTracker.js` dengan toleransi `TIME_STOP_GRACE_DAYS = 3` dan `TIME_STOP_TOLERANCE_LOSS_PCT = 1.5%`. Posisi yang melewati batas hari namun hanya floating loss ringan (< 1.5%) diberi perpanjangan 3 hari alih-alih langsung di-cut loss prematur.
- Circuit Breaker Rezim Pasar IHSG: Menambahkan proteksi otomatis pada `src/scripts/discord-notifier.js`. Saat IHSG berada dalam rezim *defensive* / bearish, sinyal Growth dinonaktifkan dan kuota rekomendasi dibatasi maksimal 2 saham, serta menghapus relaksasi ambang skor Pass 2.
- Pengujian & Verifikasi: Menambahkan unit test pada `tests/tradeSetup.test.js` untuk menguji batas target profit. Seluruh 219 unit test lulus 100% dan build Turbopack sukses bersih. Terdokumentasi pada `docs/wiki/id/trading-system/siklus-hidup-order.md` dan arsip utama bahasa Inggris.

## [2026-09-17] fix | Perbaikan Kebocoran Serialisasi Circular SyntheticEvent & Diferensiasi Error Jaringan
- Mengatasi Kebocoran Objek React SyntheticEvent pada `handleAnalyzeAi`:
  - Memperbaiki deklarasi tombol `onClick={handleAnalyzeAi}` yang secara tidak sengaja meneruskan objek `SyntheticBaseEvent` React ke dalam parameter `force`. Hal ini menyebabkan pemanggilan `JSON.stringify({ ticker, force })` melempar `TypeError: Converting circular structure to JSON` (akibat referensi sirkular DOM `event.target`/`window`).
  - Mensterilkan variabel `isForce` di dalam `handleAnalyzeAi` agar secara ketat hanya menerima boolean: `typeof force === 'boolean' ? force : false`.
  - Mengubah pemanggilan tombol JSX menjadi *arrow function*: `onClick={() => handleAnalyzeAi(false)}`.
  - Menyaring deteksi error jaringan pada `catch (err)`: Menghilangkan pemeriksaan umum `err.name === 'TypeError'` dan menggantinya dengan verifikasi pesan error jaringan eksplisit (`failed to fetch`, `network`, `load failed`) guna mencegah kesalahan runtime JS diidentifikasi keliru sebagai error jaringan.
- Pengujian Lulus 100%: Seluruh 217 pengujian unit lulus tanpa celah dan build Turbopack Next.js berhasil bersih.

## [2026-09-17] fix | Parser Markdown Komprehensif & Sanitasi Cuplikan Berkas Riset AI pada UI
- Perbaikan Format Markdown Rusak di UI: Menulis ulang `renderAiMarkdown` pada `src/components/StockExplorer.jsx` dengan kepatuhan standar CommonMark penuh:
  - Mengonversi simbol `#` mentah menjadi tipografi judul H1–H5 terstruktur lengkap dengan ikon babak tematik dinamis.
  - Mengonversi simbol `---`, `***`, `___` mentah menjadi garis pemisah visual `<hr />`.
  - Memperbaiki kotak panggilan (`SKOR AI:`, `KESIMPULAN:`, `ALASAN SINGKAT:`), kini otomatis diterjemahkan menjadi kartu ringkasan visual meskipun diawali format tebal `**`.
  - Memperbaiki rendering tabel grid yang pecah dengan mem-parsing baris tabel markdown (`| kolom1 | kolom2 |`) menjadi elemen tabel HTML asli (`<table>`, `<thead>`, baris zebra, dan geser horizontal).
  - Memperbaiki tokenisasi penekanan teks miring/tebal dengan batas spasi, sehingga persamaan aritmatika finansial (contoh: `Harga = 500 * 22,5`) tidak lagi salah terdeteksi sebagai tanda bintang miring (*italic*).
  - Menambahkan dukungan untuk kode inline (`` `kode` ``), rumus matematika inline (`$rumus$`), coret (*strikethrough*), dan tautan eksternal (`[label](url)`).
- Sanitasi Kartu Pratinjau Bloomberg Intelligence: Mengimplementasikan `formatPreviewSnippet` pada `src/components/BloombergIntelligencePanel.jsx` untuk membersihkan tag judul babak (`## ...`), garis pemisah, dan karakter markdown mentah pada kartu ringkasan 2 baris.
- Pengujian Lulus 100%: Seluruh 217 pengujian unit lulus tanpa celah dan build produksi Next.js berhasil bersih.
- Pemutakhiran Dokumentasi: Dicatat pada `docs/wiki/id/financial-engine/berkas-riset-ai-bi.md` dan arsip utama bahasa Inggris.

## [2026-09-17] feat | Filtrasi Berita Anti-Clickbait, Pemeringkatan Sinyal Finansial & Ekstraksi Ringkasan Artikel
- Implementasi `isClickbaitTitle` pada `src/lib/ai/search.js`: Secara otomatis membersihkan judul-judul clickbait, rekomendasi harian spekulatif, dan listicle broker ("rekomendasi saham", "menu saham", "target harga", "potensi cuan", "saatnya beli?") dengan tetap melindungi pengumuman aksi korporasi riil (laba bersih, dividen, capex, akuisisi, nominal miliar/triliun).
- Implementasi `calculateSignalScore` pada `src/lib/ai/search.js`: Menghitung skor kualitas sinyal 0-100 yang memprioritaskan artikel dengan deskripsi cuplikan kaya (>40 karakter) dari Bing RSS, angka metrik terukur (Rp, %, miliar, triliun), media bisnis kredibel (Kontan, Bisnis.com, CNBC Indonesia, Katadata, Investor Daily, Bloomberg Technoz, IDNFinancials), dan mendepresiasi listicle kompilasi pasar dengan banyak kode saham.
- Arsitektur Kueri Boolean Terarah: Mengalihkan kueri penelusuran ke ekspresi boolean berdensitas tinggi `"${cleanName}" (laba OR pendapatan OR kinerja OR dividen OR capex OR ekspansi)` yang menghasilkan 3x lipat artikel relevan dengan ringkasan lengkap.
- Penegasan Mandat Prompt Anti-Clickbait: Menyuntikkan `[ANTI-CLICKBAIT FILTER]` pada Bagian 4 dan `[ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]` pada Bagian 6 di `src/lib/ai/prompter.js`, memastikan AI mengabaikan rumor harian dan bersandar murni pada data keuangan kuartalan dan aksi korporasi nyata.
- Penambahan Pengujian Unit: Menambahkan suite pengujian komprehensif pada `tests/aiSectorPrompter.test.js` (total 217/217 pengujian lulus 100%).
- Pemutakhiran Dokumentasi: Dicatat pada `docs/wiki/id/financial-engine/berkas-riset-ai-bi.md` dan arsip utama bahasa Inggris.

## [2026-09-17] feat | Perluasan Kata Kunci Semantik, Multi-Kueri Berita & Rubrik Institusional 35 Sektor
- Perluasan Taksonomi Kata Kunci: Memperbanyak dan memperlebar sinonim kata kunci industri di `src/lib/ai/sectorIntelligence.js` dalam Bahasa Indonesia dan Inggris serta klasifikasi subsektor untuk seluruh 35 sektor Alpha Legend.
- Perluasan Template Kueri Tematik: Meningkatkan jumlah kueri pencarian per sektor menjadi 3 template terarah (Dinamika Permintaan & Siklus Makro, Pangsa Pasar & Parit Kompetitor, serta Regulasi & Prospek 1-2 Tahun).
- Peningkatan Volume Pengambilan Berita: Meningkatkan kuota pengambilan di `src/lib/ai/search.js` menjadi 4 cuplikan berita per kueri (menghasilkan hingga 16 cuplikan berita komprehensif per emiten dengan fallback Google News).
- Pendalaman Rubrik Analisis: Menyusun mandat penalaran komprehensif untuk seluruh 35 sektor yang membedah unit bisnis inti, model relasional lag makro, indikator kinerja utama (KPI) Alpha Legend, daya saing kompetitor, dan katalis ke depan.
- Pengujian Lulus 100%: Seluruh 214 pengujian unit lulus tanpa celah dan build produksi Next.js berjalan mulus.


## [2026-09-17] feat | Kerangka Kerja Analisis Sektoral & Unit Bisnis Mendalam (Stock Explorer)
- Memperbarui `src/lib/ai/prompter.js`: mengimplementasikan `detectSectorFramework(sector, subSector, ticker)` yang menyuntikkan model relasional industri spesifik:
  - Otomotif & Komponen (`AUTO`, `SMSM`, `GJTL`): Model penuaan armada kendaraan (*aging fleet*) dari penjualan mobil historis (data GAIKINDO 2-5 tahun lalu), daya tahan portofolio ICE vs EV/Hybrid, serta rasio OEM vs Aftermarket ritel.
  - Perbankan & Finansial (`BBCA`, `BBRI`, `BMRI`): Rasio dana murah CASA, Cost of Funds (CoF), NIM, segmen kredit, rasio pencadangan NPL/LAR, dan rasio efisiensi BOPO/CIR.
  - Energi & Batubara/Migas (`ADRO`, `PTBA`): Kurva biaya kas (*cash cost curve*), rasio kupas (stripping ratio), umur cadangan, DMO, dan belanja modal hilirisasi/transisi hijau.
  - Mineral Kritis & Logam (`ANTM`, `INCO`): Rantai pasok baterai EV (smelter HPAL MHP vs RKEF NPI), kuota RKAB, dan hilirisasi bernilai tambah.
  - Agribisnis & Perkebunan CPO (`TAPG`, `DSNG`): Penyerapan mandat domestik Biodiesel B35/B40, profil usia tanaman sawit, yield TBS/FFB, dan rendemen OER.
  - Model industri spesifik untuk Telekomunikasi, Konstruksi, Properti, dan Konsumer Primer.
- Menstandarisasi format laporan riset menjadi 7 babak terstruktur: (1) Bedah Unit Bisnis & Rencana Strategis, (2) Kebutuhan Pasar, Siklus Industri & Market-Fit, (3) Keunggulan Bersaing (Moat) & Posisi vs Kompetitor, (4) Analisis Fundamental & Valuasi, (5) Arah Tren & Momentum Teknikal, (6) Analisis Sentimen Berita & Katalis Terkini, (7) Prospek 1-2 Tahun ke Depan & Rekomendasi Akhir (`SKOR AI: [0-100]`, `KESIMPULAN: [BELI/HOLD/JUAL]`, `ALASAN SINGKAT`).
- Meningkatkan `src/lib/ai/search.js`: menambahkan fungsi `buildSectorThematicQueries` untuk pencarian berita tematik paralel (rencana capex, dinamika sektor EV/Gaikindo/CASA, pangsa pasar kompetitor).
- Memperbarui `src/scripts/ai-worker.js`: menambahkan fungsi `extractSectionByTitle` dan pengiriman parameter sektor ke pencarian berita untuk ketahanan penyimpanan database pada tabel `AiStockResearch`.
- Memperbarui `src/components/StockExplorer.jsx`: mempercantik `renderAiMarkdown` dengan ikon judul babak tematik (🏢, 🔄, 🛡️, 📊, 📈, 📰, 🎯).
- Menambahkan rangkaian pengujian unit pada `tests/aiSectorPrompter.test.js` (211/211 seluruh pengujian lulus 100%).
- Memperbarui dokumentasi ilmiah pada `docs/wiki/id/financial-engine/berkas-riset-ai-bi.md`.

## [2026-09-16] feat | Konsultasi AI Pasar Modal: Penasihat Multi-Sesi, Proteksi Anti-Halusinasi, & Mutex Prioritas CPU
- Membangun `src/lib/ai/aiPriorityMutex.js`: gerbang konkurensi slot-tunggal (konkurensi 1) dengan pembagian prioritas (HIGH untuk konsultasi chat/screener vs LOW untuk worker antrean latar belakang) guna mengeliminasi perebutan core CPU pada Intel i5.
- Membangun `src/lib/ai/chatAdvisorEngine.js`: ekstraksi ticker deterministik dengan filter stopword percakapan Indonesia, komputasi matematika finansial di backend (persentase PnL riil, simulasi average down), prompt tertutup anti-halusinasi, serta protokol penalaran 3-tahap (`<think>`).
- Meningkatkan `src/lib/ai/client.js`: integrasi AI Priority Mutex, mode penalaran selektif (`enableThinking: true`), penalaan suhu (`temperature: 0.4`, `topP: 0.85`), dan pelebaran konteks hingga 8.192 token.
- Menambahkan model data di `prisma/schema.prisma`: tabel `ChatSession` dan `ChatMessage` dengan relasi kaskade.
- Membangun rute API pada `src/app/api/ai/chat/route.js`: operasi CRUD sesi lengkap, injeksi data pasar terverifikasi, lampiran data portofolio, dan pemisahan blok pemikiran.
- Membangun antarmuka interaktif pada `src/components/AiConsultationPanel.jsx`: tata letak 2 kolom, akordeon pemikiran lipat, pemformat tabel markdown, badge saham interaktif, dan kartu panduan awal.
- Mengintegrasikan ke `Sidebar.jsx` dan `Dashboard.jsx` di bawah `activeTab === 'ai-chat'`.
- Menambahkan rangkaian pengujian unit pada `tests/aiChatAdvisor.test.js` (203/203 total pengujian lulus 100%).
- Mempublikasikan dokumentasi ilmiah pada `docs/wiki/id/trading-system/konsultasi-keuangan-ai.md`.

## [2026-09-16] feat | Stock Screener Bertenaga AI: Penyaringan Bahasa Alami & Sintesis Strategi
- Membangun `src/lib/ai/screenerPrompt.js`: fungsi prompt engineering murni (`buildScreenerAiMessages`, `parseScreenerAiResponse`, dan `filterStocksByAiCriteria`) untuk ekstraksi kriteria keuangan terstruktur dari kueri bahasa alami.
- Membangun `src/app/api/screener/ai/route.js`: endpoint `POST /api/screener/ai` yang menjalankan inferensi LLM lokal dengan fallback heuristik defensif (`buildHeuristicFallbackCriteria`) untuk ketahanan terhadap timeout/koneksi offline.
- Membangun `src/components/AiScreenerBar.jsx`: bilah pencarian percakapan dengan preset strategi 1-klik (Deep Value, Momentum, ROE Bank Jumbo, Economic Moat, Syariah Growth) serta inspektur badge kriteria aktif.
- Memperbarui `src/components/StockScreener.jsx`: integrasi bilah pencarian AI, kunci pengurutan smart money BFI, dan perenderan badge dinamis hasil penyaringan AI.
- Menambahkan rangkaian pengujian unit pada `tests/aiScreener.test.js` (5 pengujian unit mencakup pembentukan prompt, ekstraksi JSON markdown, pemulihan JSON rusak, penyaringan kriteria, dan penanganan kasus kosong).
- Mempublikasikan dokumentasi kuantitatif: `docs/wiki/id/trading-system/stock-screener-ai.md`.

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
