# Log Kronologis Wiki

Seluruh riwayat perubahan, penambahan materi (*ingest*), dan pemutakhiran basis pengetahuan dicatat di sini secara kronologis.

---

## [2026-10-07] feat | Fondasi Tema "Bursa 1985" (ADR 0001)
- Token warna semantik baru di `src/app/globals.css` untuk mode terang ("Kertas Bursa") dan gelap ("Terminal Fosfor"), diekspos sebagai warna Tailwind (`canvas`, `surface`, `sunken`, `line`, `ink`, `muted`, `accent`, `up`, `down`, `warn`, …).
- Font diganti ke IBM Plex Sans / Serif / Mono (`font-sans`, `font-serif`, `font-mono`); tema kini mengikuti perangkat secara default.
- Blok dasar `.card`, `.label-mono`, `.rule-double`, `.btn-primary`, `.btn-secondary`, `.focus-ring`; class lama `.glass`, skor, dan skeleton kini rata dan berbasis token; reduced-motion dihormati secara global.
- `ThemeToggle` diperbarui dengan label aksesibel. Test baru `tests/themeTokens.test.js` (kesamaan token + kontras WCAG AA).
- ADR baru: [0001. Design system "Bursa 1985"](./adr/0001-bursa-1985-design-system.md).

## [2026-10-07] style | Koleksi Saham: 5 Kartu per Baris
- Grid kartu koleksi kini menampilkan hingga 5 kartu per baris di layar lebar (`2xl:grid-cols-5`), turun menjadi 4 / 3 / 2 / 1 di layar lebih kecil.

## [2026-10-07] feat | Stock Explorer Dipecah menjadi Tab Koleksi, Pencarian & Komparasi
- Sidebar koleksi yang bisa diciutkan diganti tiga tab halaman: `Koleksi Saham` (default), `Pencarian Saham IDX`, `Komparasi`.
- Halaman Koleksi didesain ulang: chip koleksi, toolbar, statistik ringkasan (jumlah, rata-rata perubahan, target beli/jual tercapai), dan grid kartu responsif dengan bar progres target serta tombol aksi yang selalu terlihat.
- Klik kartu koleksi membuka saham di tab Pencarian (pemuatan detail sama seperti sebelumnya) dengan tombol "← Kembali ke Koleksi"; preload BBCA tidak lagi memindahkan tab.
- Header Pencarian dipercantik: input lebih besar dengan label, baris saran lebih informatif (ticker, nama, sektor, harga), tombol aksi di empty state.
- Helper murni baru `src/lib/collectionCardUtils.js` beserta unit test.
- Halaman baru: [Halaman Stock Explorer](./architecture/stock-explorer.md); memperbarui Ringkasan Sistem dan Collection Sorter Engine.

## [2026-10-07] fix | 401 Admin saat Upload KSEI: Pengecekan Role Admin dari Database
- Masalah: `POST /api/ksei/ingest` mengembalikan 401 untuk user yang role-nya di database sudah `ADMIN`, karena JWT yang ada tidak berisi `role`.
- `verifyAdminAccess` (`src/lib/auth.js`) kini `async` dan membaca role user dari database, bukan dari JWT; perubahan role langsung berlaku dan token lama tidak lagi bermasalah. Menolak akses (fail closed) bila DB error.
- Helper baru `isAdminUser`: pencocokan `ADMIN_EMAIL` kini tidak peka huruf besar/kecil (sama seperti registrasi).
- `src/proxy.js` meneruskan request `/api/ksei/ingest` yang membawa header admin key tanpa cookie sesi (`src/lib/adminKeyRequest.js`); route tetap memvalidasi key.
- Pemanggil diperbarui ke `await`: `/api/ksei/ingest`, `/api/sync`, `/api/admin/add-ticker`. Test diperluas di `tests/security.test.js`.
- Login/register kini juga menandatangani `role` ke JWT dan `/api/auth/me` mengembalikan `role`.
- Halaman baru: [Autentikasi & Akses Admin](./architecture/autentikasi.md).

## [2026-09-25] feat | Peningkatan TradingView Pro: MA200, Bollinger Bands, RSI, MACD, Multi-Timeframe & Legenda Crosshair
- Memutakhirkan komponen `src/components/StockChart.jsx` ke arsitektur TradingView Lightweight Charts Pro:
  - **Legenda HUD Mengambang Interaktif**: Langganan pergerakan kursor crosshair (`chart.subscribeCrosshairMove`) menyajikan informasi Open, High, Low, Close, % Perubahan, dan Volume secara real-time dengan kode warna responsif.
  - **Agregasi Multi-Timeframe (1D, 1W, 1M)**: Agregasi candle di memori klien (`aggregateCandles`) tanpa latensi jaringan maupun beban query berulang ke Yahoo Finance.
  - **Filter Tren Institusional (MA200)**: Menambahkan garis SMA 200 (`#eab308`) melengkapi MA20 dan MA50.
  - **Bollinger Bands (20, 2)**: Menambahkan pita atas (`#38bdf8`), garis tengah basis, dan pita bawah dengan garis putus-putus (*dashed*).
  - **Osilator Sub-Pane Khusus**:
    - **RSI (14)**: Ditampilkan pada skala harga terpisah (`priceScaleId: 'rsi'`) dengan margin skala (`top: 0.82, bottom: 0.02`) dan batas jenuh 70/30.
    - **MACD (12, 26, 9)**: Ditampilkan pada skala terpisah (`priceScaleId: 'macd'`) dengan garis MACD, garis sinyal, dan histogram momentum berwarna hijau/merah.
  - **Penanda Pola Candlestick**: Marker visual dalam grafik untuk pola Bullish Engulfing, Hammer, Shooting Star, dan Doji.
  - **Kendali Interaktif**: Tombol toggle indikator (pills), mode layar penuh (`⛶ Zoom`), penyesuaian skala otomatis (`🔄 Fit`), dan sinkronisasi tema gelap/terang secara real-time melalui `MutationObserver` pada DOM.
- Peningkatan Backend `/api/chart/route.js`:
  - Menambahkan kalkulasi matematis `calculateBollingerForChart(chartData, 20, 2)`, `calculateRSIForChart(chartData, 14)`, dan `calculateMACDForChart(chartData, 12, 26, 9)`.
  - Mengembalikan payload indikator lengkap baik pada jalur utama Yahoo Finance maupun fallback database lokal.
- Memperbarui `src/components/StockExplorer.jsx` dan `src/components/DetailPanel.jsx` untuk menampilkan fitur analisis teknikal TradingView Pro pada Stock Explorer dan Analisis Saham.

## [2026-09-25] fix | Resolusi Scraper Cron TDZ, Puppeteer TargetCloseError, useEffect & React Rules-of-Hooks
- Memperbaiki `ReferenceError: Cannot access 'isPriceSyncRunning' before initialization` pada `src/scripts/scraper-cron.js` yang disebabkan oleh Temporal Dead Zone (TDZ).
- Memindahkan deklarasi state (`isPriceSyncRunning`, `isDailyScraperRunning`) dan seluruh definisi fungsi eksekusi (`runPriceSync`, `runDiscordNotifier`, `runDailyScrapers`) ke atas sebelum pemanggilan inisialisasi boot.
- Memperbaiki `TargetCloseError: Protocol error (Target.setDiscoverTargets): Target closed` saat peluncuran Chromium Puppeteer di kontainer Docker Alpine (`src/scripts/sync-ksei.js` & `src/scripts/sync-ownership.js`):
  - Menghapus flag usang `--single-process` yang merusak mekanisme CDP target discovery pada Chromium modern.
  - Menambahkan argumen `--disable-extensions` dan fallback pendeteksian binary Chromium (`/usr/bin/chromium-browser` / `/usr/bin/chromium`).
  - Menambahkan `dumb-init` pada `Dockerfile.scraper` sebagai entrypoint PID 1 process reaper untuk mencegah pembentukan proses zombie Chromium.
  - Membungkus peluncuran dan siklus hidup browser dalam blok defensif `try/finally` untuk memastikan browser selalu ditutup dengan aman (`await browser.close()`).
- Memperbaiki `ReferenceError: useEffect is not defined` pada `src/components/DetailPanel.jsx` dengan mengimpor `useEffect` dari `'react'`.
- Menuntaskan seluruh 11 pelanggaran eksekusi hook kondisional (`react-hooks/rules-of-hooks`) pada panel-panel analitikal:
  - `src/components/FinancialMatrixPanel.jsx`: Memindahkan pemeriksaan fallback data ke bawah eksekusi hook `useMemo`.
  - `src/components/MonthlySeasonalityPanel.jsx`: Menghilangkan early return sebelum hook `useMemo` (`activeYears` dan `monthStats`) dan menggantinya dengan guard pasca-hook.
  - `src/components/RelativeValuationPeers.jsx`: Menata ulang hook `useMemo` (`allPeers`, `stats`, `insight`) agar selalu dieksekusi secara konsisten sebelum render fallback.
  - `src/components/ScenarioForecaster.jsx`: Memindahkan state slider `useState` dan hook kalkulasi `useMemo` ke atas sebelum guard `!stockDetail`.

## [2026-09-24] feat | Remediasi Audit Komprehensif Full-Stack & Matriks Finansial Bloomberg (FA)
- Stabilitas Runtime Client & Guardrail Vercel:
  - Memperbaiki `ReferenceError: stock is not defined` di dalam hook `useMemo` pada `src/components/ScenarioForecaster.jsx` dengan menggunakan destrukturisasi `f.eps` dan `f.per`.
  - Memberi pembungkus proteksi lingkungan pada `<Analytics />` dan `<SpeedInsights />` di `src/app/layout.js` agar hanya dijalankan saat berada di ekosistem Vercel (`process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV`), menuntaskan error strict MIME type (`/_vercel/speed-insights/script.js` 404/plain text) pada self-hosted Docker / `localhost:3010`.
- Penguatan API Portofolio & Validasi Lot BEI (`/api/portfolio/buy` & `/api/portfolio/sell`):
  - Memperbaiki parsing payload JSON dan destrukturisasi variabel pada rute beli/jual portofolio.
  - Menerapkan validasi modulo 100 lembar (1 Lot IDX) yang ketat (`shares % 100 === 0`) dengan pesan validasi ramah pengguna berbahasa Indonesia.
  - Menambahkan rangkaian uji unit `tests/portfolioLotValidation.test.js` mencakup validasi lot dan logika kalkulasi Realized PnL/Loss.
- Visualizer Underwater Drawdown Backtest (`src/components/BacktestPanel.jsx`):
  - Menambahkan grafik interaktif *underwater drawdown profile* di bawah kurva pertumbuhan ekuitas, memetakan persentase penurunan dari puncak tertinggi (*peak*) modal dengan gradien arsir merah dan titik lembah (*trough*).
- Integrasi Matriks Laporan Keuangan Bloomberg (`src/components/StockExplorer.jsx`):
  - Memulihkan dan menautkan `FinancialMatrixPanel` ke dalam tab kokpit analitikal Valuasi & Finansial (`cockpitTab === 'valuation'`).
  - Menyesuaikan *counter* metrik tab kokpit dan menampilkan matriks multi-tahun perbandingan laba rugi, neraca, arus kas, dan rasio valuasi.
- Aksesibilitas Dialog & Penutupan Modal (`src/components/DetailPanel.jsx`):
  - Menambahkan penangan tombol Escape serta penutupan klik backdrop dengan `e.stopPropagation()` pada modal pantau saham dan dialog prompt kustom.
- Modul Kalender Libur Bursa Efek Indonesia (`src/lib/idxHolidays.js` & `tests/idxHolidays.test.js`):
  - Membangun kalender libur resmi BEI terpusat periode 2024-2027 mencakup hari libur nasional dan cuti bersama.
  - Mengintegrasikan `isIDXHoliday` dan `isIDXTradingDay` ke dalam `src/lib/syncService.js` (untuk melewati polling harga saat bursa tutup) dan `src/lib/recommendationTracker.js` (`getTradingDaysElapsed` untuk ketepatan durasi trading dan settlement T+2).
- Infrastruktur Docker & Optimasi Database:
  - Meningkatkan batas memori PostgreSQL dari 256MB ke 512MB pada `docker-compose.yml` untuk mencegah OOM saat beban analitik tinggi.
  - Menetapkan batas koneksi database (`connection_limit=10` pada app, `connection_limit=5` pada scraper) untuk mencegah starvasi koneksi pada PostgreSQL.
  - Memulihkan kolom `lastDeepSync` dan menghapus indeks berlebih `@@index([ticker])` pada `prisma/schema.prisma` (`prisma validate` dan `prisma db push` berhasil diselaraskan).
  - Memperbaiki izin file Docker di `Dockerfile` dengan menambahkan `--chown=nextjs:nodejs` pada baris COPY Prisma di tahap `runner` guna mencegah kegagalan `EACCES` saat dijalankan oleh user non-root `nextjs`.
  - Mengoptimalkan `.dockerignore` dengan mengecualikan `tests`, `docs`, `Dockerfile*`, dan `docker-compose*.yml`.
- Keandalan API & Keamanan Serialisasi BigInt:
  - Menambahkan utilitas `serializeData` pada `src/app/api/screener/route.js` dan `src/app/api/portfolio/route.js` untuk menjamin keamanan serialisasi BigInt (`sharesOutstanding`, `volume`, `turnover`) tanpa memicu runtime `TypeError`.
- Keandalan Frontend & Guardrail Analitik:
  - Memperbaiki `src/app/layout.js` agar hanya menyuntikkan `<GoogleAnalytics>` apabila `NEXT_PUBLIC_GA_ID` terdefinisi, mencegah error jaringan konsol browser akibat ID placeholder `"G-XXXXXXXXXX"`.
  - Menambahkan kolom DPR (Dividend Payout Ratio) pada tabel riwayat dividen di `src/components/CorporateActionsPanel.jsx`.
- Kalkulasi PPh Final 10% Dividen Domestik & Transparansi UI:
  - Mengimplementasikan `calculateNetDividendYield` dengan `IDX_DIVIDEND_TAX_RATE = 0.10` pada `src/lib/scoring/dividend.js` beserta pengujian unit (`tests/dividend.test.js`).
  - Menampilkan Yield Dividen Bruto dan Yield Dividen Netto (setelah potongan PPh Final 10% sesuai PP 9/2021 & UU Cipta Kerja) pada `src/components/StockExplorer.jsx`.
- Transparansi Metodologi Heuristik & Tooltip:
  - Menambahkan tooltip penjelasan (`ⓘ`) pada kartu skor Piotroski F-Score dan Altman Z-Score di `StockExplorer.jsx` yang menerangkan bahwa nilai tersebut adalah estimasi heuristik multi-faktor adaptif untuk BEI.
- Aksesibilitas Dialog & UX Mobile:
  - Menambahkan pendengar tombol universal ESC, penutupan klik backdrop, dan atribut ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) pada seluruh modal di `StockExplorer.jsx`, `PensionCalculator.jsx`, `StockOwnershipModal.jsx`, `DetailPanel.jsx`, dan `AuthModal.jsx`.
  - Menambahkan indikator status sinkronisasi harga live beserta tombol trigger sinkronisasi manual di header mobile (`TopHeader.jsx`).
- Verifikasi:
  - 246 test suites lulus (100%).
  - Build produksi Next.js Turbopack sukses dalam 1.8 detik tanpa error.

## [2026-09-24] fix | Pemodelan Domain: Resolusi Frekuensi vs Lot & Integrasi Kepemilikan Institusional Yahoo Finance
- Resolusi Ambiguitas Konseptual Frekuensi vs Lot (Standar Pasar BEI):
  - Memperbaiki diskrepansi konseptual pada `src/lib/syncService.js` dan `src/scripts/sync-prices.js` di mana nilai `volume / 100` sebelumnya disimpan ke kolom database `frequency`. Di Bursa Efek Indonesia (BEI), 1 Lot = 100 lembar saham; sehingga `volume / 100` merupakan **Jumlah Lot**, BUKAN frekuensi perdagangan (*trade count*).
  - Memperjelas dokumentasi arsitektural pada `prisma/schema.prisma`, `syncService.js`, dan `sync-prices.js` bahwa kolom database `frequency` menyimpan Jumlah Lot demi menjaga kompatibilitas skema yang sudah ada.
  - Menambahkan properti resmi `lots` pada respons `/api/stocks/[ticker]/route.js` di samping `frequency`.
  - Memperbaiki label tampilan yang menyesatkan pada `src/components/StockExplorer.jsx:2486` yang sebelumnya menampilkan `...x transaksi` (membuat trader salah mengira terjadi jutaan kali transaksi), diganti dengan terminologi pasar modal Indonesia yang tepat: `... Lot`.
- Integrasi Modul Kepemilikan Yahoo Finance (`majorHoldersBreakdown`, `fundOwnership`, `institutionOwnership`):
  - Pada `src/lib/syncService.js`, menambahkan modul kepemilikan ke pemanggilan `quoteSummary` dan mengekstrak metrik kunci ke dalam objek `fundamentals`:
    - `insidersPercentHeld` (% kepemilikan insider/pengendali)
    - `institutionsPercentHeld` (% total kepemilikan institusi)
    - `institutionsFloatPercentHeld` (% kepemilikan institusi atas saham beredar bebas/float)
    - `institutionsCount` (total jumlah institusi pemilik saham)
    - `topInstitutionalFunds` (daftar 10 reksa dana/manajer investasi global seperti Vanguard, BlackRock/iShares beserta lembar kepemilikan, estimasi nilai, dan persentase)
    - `topInstitutions` (daftar institusi pengelola dana utama)
  - Menambahkan fallback persistensi kepemilikan awal pada `StockData.ownership` saat deep sync sehingga emiten baru langsung menampilkan data kepemilikan institusi bahkan sebelum scraper Puppeteer BEI dijalankan.
  - Mendokumentasikan alasan tidak tersedianya `insiderTransactions` di Yahoo Finance untuk emiten berakhiran `.JK` (insider BEI wajib melaporkan kepemilikan ke OJK/BEI sesuai POJK 11/POJK.04/2017, bukan Form 4 US SEC). Pelacakan transaksi insider domestik tetap ditangani secara akurat melalui `src/scripts/sync-ownership.js` (scraper Keterbukaan Informasi BEI) dan `src/scripts/sync-ksei.js` (scraper kustodian KSEI).
- Verifikasi & Pengujian:
  - 242 unit dan integration test lulus 100%.
  - Production build Next.js (Turbopack) berhasil tanpa eror.

## [2026-09-24] feat | Remidiasi Audit Komprehensif Full-Stack & Optimalisasi Pipeline Data Eksternal
- Pipeline Data Eksternal & Integrasi Yahoo Finance:
  - Menambahkan kesadaran jam bursa resmi BEI (`isIDXMarketHours` di `src/lib/syncService.js`). Fast price sync otomatis dilewati di luar jam perdagangan aktif (Senin - Jumat 09:00 - 16:00 WIB), menghemat ribuan request API dan mengeliminasi risiko limit kuota pada malam hari dan akhir pekan.
  - Menyesuaikan ukuran batch query (`chunkSize`) dari 50 menjadi 25 emiten untuk mencegah terjadinya *silent drop* oleh Yahoo Finance.
  - Memperluas modul `quoteSummary` dengan menambahkan `balanceSheetHistory` dan `cashflowStatementHistory`, secara aktif mengekstrak dan menormalisasi metrik `totalAssets` dan `totalLiabilities` (lengkap dengan konversi kurs USD untuk emiten BEI berpelaporan valas).
  - Menerapkan *Exponential Backoff* dinamis (30 detik hingga 5 menit) di `src/lib/worker.js` saat terjadi kegagalan deep sync berturut-turut untuk melindungi server dari pemblokiran IP (HTTP 429).
- Koreksi Finansial & Kalkulasi Realized PnL:
  - Memperbaiki perhitungan Realized PnL pada `src/app/api/portfolio/route.js` agar mengurangkan harga modal beli (*cost basis*) dari hasil penjualan kotor, mencegah penggelembungan laba bersih portofolio.
  - Menambahkan validasi satuan perdagangan resmi BEI (1 lot = 100 lembar) pada endpoint `/api/portfolio/buy` dan `/api/portfolio/sell`.
  - Menangani penutupan posisi penuh (*full position sell*) dengan mereset nilai posisi secara bersih ketika `totalShares === 0`.
  - Memasang pengaman batas bawah harga pasar reguler BEI (`IDX_REGULAR_BOARD_MIN_PRICE = 50`) pada kalkulasi stop loss di `src/lib/tradeSetup.js`.
  - Memutakhirkan proyeksi target harga di `src/components/ScenarioForecaster.jsx` menggunakan model valuasi kelipatan EPS × P/E institusional alih-alih asumsi linear 1:1 pendapatan.
- Penguatan Keamanan & Kontrol Akses:
  - Mengeliminasi celah *privilege escalation* admin pada `src/lib/auth.js` (`verifyAdminAccess`) dengan membatasi otoritas administrasi hanya pada API key `ADMIN_SECRET_KEY`, user berstatus `ADMIN`, atau email yang terdaftar di `ADMIN_EMAIL`.
  - Menambahkan validasi masa berlaku token JWT (`exp`) pada Edge runtime proxy (`src/proxy.js`).
  - Menutup celah IDOR pada endpoint konsultasi AI `src/app/api/ai/chat/route.js` dengan memverifikasi kepemilikan sesi terhadap `userId` login sebelum membaca atau menghapus sesi.
- Kinerja Database & Infrastruktur:
  - Menambahkan B-tree index untuk `lastPriceSync` dan `lastDeepSync` pada tabel `StockData`, serta kolom `role` pada model `User` di `prisma/schema.prisma`.
  - Menerapkan In-Memory TTL Cache (30 detik) pada `src/lib/providers/DatabaseProvider.js` untuk mengeliminasi ribuan operasi `JSON.parse` yang membebani event loop Node.js pada setiap request.
  - Menambahkan pengunci *concurrency mutex* (`isPriceSyncRunning`, `isDailyScraperRunning`, `isProcessingQueue`) pada `scraper-cron.js` dan `ai-worker.js` untuk mencegah penumpukan proses dan crash OOM container.
  - Memperbaiki crash browser Chromium Puppeteer di Docker Alpine (`src/scripts/sync-ownership.js`) dengan menginjeksikan `PUPPETEER_EXECUTABLE_PATH` dan flag kontainer.
- Penyempurnaan UI/UX & Responsivitas Mobile:
  - Mengatasi gap tata letak pada tablet (`md`) di `src/components/DetailPanel.jsx` dengan dukungan grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` serta `md:col-span-2` pada kolom penjelasan.
  - Mengotomatiskan mode tampilan `StockScreener.jsx` ke format *Cards* saat dibuka di layar ponsel (< 768px) untuk mencegah scroll tabel horizontal.
  - Membangun komponen grafik visual **Kurva Pertumbuhan Ekuitas (Equity Curve)** interaktif berbasis SVG lengkap dengan analisis *peak capital* dan *max drawdown* pada `src/components/BacktestPanel.jsx`.
  - Memasang atribut aksesibilitas ARIA `role="dialog"` dan `aria-modal="true"` pada modal dialog kustom di `DetailPanel.jsx`.
- Verifikasi:
  - Seluruh 242 pengujian unit test lulus 100%.
  - Build produksi Turbopack berhasil tanpa error.

## [2026-09-24] feat | Engine Pengurutan Koleksi Saham: 7 Strategi Otomatis & Modal Panduan Strategi
- Modul Engine Pengurutan Murni (`src/lib/collectionSorter.js`):
  - Membangun fungsi pengurutan independen (*pure function*) yang mengimplementasikan 7 algoritma kuantitatif:
    1. `SMART_COMBINATION`: Peringkat cerdas sinergis menggabungkan Skor Komposit Kualitas (40%), Pemicu Beli MACD (35%), dan Kedekatan Target Beli (25%).
    2. `HIGHEST_SCORE`: Urutan murni skor komposit tertinggi ke terendah (A-Grade 80+ s/d D-Grade).
    3. `MACD_CROSS`: Prioritas waktu teknikal (Fresh Golden Cross ➔ Bullish Histogram ➔ Rebound Momentum ➔ Bearish).
    4. `PROXIMITY_TARGET_BUY`: Mengurutkan dari saham yang paling dekat dengan target beli manual (zona beli $\le 0-2\%$ di posisi teratas, dengan cadangan support teknikal atau diskon 5%).
    5. `SMART_MONEY`: Aliran dana akumulasi bandarmologi & skor smart money tertinggi.
    6. `TOP_PERFORMER`: Persentase kenaikan harga harian tertinggi (+25% s/d -15%).
    7. `ALPHABETICAL`: Penyusunan alfabetis A sampai Z berdasarkan kode ticker resmi BEI.
- Antarmuka Interaktif & Menu Dropdown Informatif (`src/components/CollectionSortDropdown.jsx`):
  - Menyematkan tombol picu ringkas `⚡ Urutkan ▾` pada header sidebar koleksi Stock Explorer.
  - Membangun menu popover kaya informasi yang menampilkan ke-7 opsi lengkap dengan ikon khusus, lencana kategori (`Rekomendasi`, `Kualitas`, `Teknikal`, `Eksekusi`, `Bandarmologi`, `Momentum`, `Kerapian`), dan ringkasan penjelasan 1 baris.
  - Menyediakan Modal Dialog Panduan Strategi interaktif (`(?) Panduan Formula`) yang membedah persamaan matematika, bobot persentase, dan skenario penerapan trading untuk setiap opsi, dilengkapi tombol aksi langsung `[Terapkan]`.
- Integrasi API & Penyimpanan Database Permanen:
  - Memperkaya endpoint `GET /api/collections/items` dengan indikator teknikal live (`macd`, `rsi14`, `support`, `resistance`, `ma20`, `ma50`).
  - Terintegrasi langsung dengan `PATCH /api/collections/items` untuk menyimpan urutan baru (`orderedIds`) secara permanen melalui transaksi Prisma ke database MySQL.
  - Mempertahankan 100% fleksibilitas *drag-and-drop* manual pasca pengurutan.
- Verifikasi & Pengujian:
  - Menambahkan test suite khusus `tests/collectionSorter.test.js` yang menguji ke-7 strategi dan sifat imutabilitas pure function (9/9 test lulus).
  - Seluruh 242 unit test proyek lulus 100%. Kompilasi produksi Next.js Turbopack berhasil tanpa galat.

## [2026-09-24] fix | Navigasi Bulan Berkelanjutan Kalender Aksi Korporasi & Caching Memori Sub-Milidetik
- Analisis Penyebab Utama (Root Cause):
  - Navigasi Macet Melewati Oktober 2026 & Respon Lambat ("Lama"): Setiap pergantian bulan pada `src/components/CorporateCalendar.jsx`, endpoint `/api/corporate-actions` melakukan pemindaian tabel MySQL penuh tanpa cache terhadap 1.020 saham, mendeserialisasi dan memproses ribuan data JSON teks pada setiap panggilan (~4.000–5.000 ms).
  - Tampilan Kalender Hilang/Tertutup Spinner: Selama jeda 5 detik tersebut, komponen membongkar (*unmount*) seluruh kisi kalender bulanan dan menggantinya dengan pemuat layar penuh (*spinner*). Hal ini menghilangkan tombol navigasi "Bulan Depan ▶" di banner atas kalender, sehingga klik cepat pengguna terasa tertahan di Oktober 2026 (bulan terjauh yang saat ini memiliki agenda aktif di database).
- Caching Memori Backend (`src/app/api/corporate-actions/route.js`):
  - Mengimplementasikan `getCachedCorporateEvents` dengan TTL 5 menit (`CACHE_TTL_MS = 5 * 60 * 1000`). Seluruh 1.657 agenda korporasi dan indeks bulan di-cache dalam memori.
  - Memangkas latensi API dari ~5.000 ms menjadi **di bawah 1 ms (< 0,001 detik)**, memungkinkan pergantian bulan terjadi seketika tanpa hambatan. Mendukung `?refresh=true` untuk invalidasi manual.
- Arsitektur Frontend Responsif (`src/components/CorporateCalendar.jsx`):
  - Navigasi State Fungsional: Mengubah `handleNextMonth` dan `handlePrevMonth` menggunakan *functional state updater* (`setSelectedMonth(prev => ...)`), menjamin klik cepat berturut-turut langsung melompat tanpa terpengaruh *stale closure* (`2026-10` -> `2026-11` -> `2026-12` -> `2027-01` -> ...).
  - Pembatalan Permintaan dengan AbortController: Mengintegrasikan `AbortController` pada `useEffect` agar klik bulan berikutnya secara otomatis membatalkan permintaan lama yang masih berjalan.
  - Tampilan Kalender Optimistik Non-Blocking: Mempertahankan tampilan kisi kalender dan tombol navigasi tetap terpasang saat berpindah bulan dengan indikator pemuatan halus (*header spinner*) dan transisi opasitas.
  - Penjelasan Bulan Tanpa Agenda: Menyediakan banner informasi saat pengguna membuka bulan masa depan atau masa lalu yang belum memiliki jadwal resmi emiten (misalnya November 2026).
- Verifikasi & Pengujian:
  - Menambahkan test case pada `tests/corporateCalendar.test.js` untuk memvalidasi lompatan navigasi bulan tanpa batas melewati Oktober 2026 hingga 12 bulan ke depan. Seluruh 233 unit test lulus 100%. Kompilasi produksi Turbopack berhasil tanpa kendala.

## [2026-09-24] feat | Perluasan Lebar Layar Ultra-Wide Stock Explorer & Header Tetap (Sticky Fixed)
- Perluasan Lebar Layar Penuh (Fit Width):
  - Memperbarui kontainer `<main>` pada `src/components/Dashboard.jsx` agar secara dinamis beralih dari batas standar `max-w-7xl` ke ultra-wide `max-w-[1920px] 2xl:px-8` saat tab aktif berada di `explorer`, menghilangkan area kosong di sisi kiri dan kanan layar monitor lebar (1080p, 1440p, 4K).
  - Menyesuaikan lebar maksimum sidebar koleksi (`2xl:w-[400px]`), memberikan ruang baca yang lebih lega untuk nama emiten dan catatan target harga, sekaligus memperluas kanvas analisis kanan untuk grafik teknikal dan tabel indikator.
- Header Tetap Tidak Ikut Tergulir (Sticky / Fixed Top Header):
  - Menjadikan header utama Stock Explorer (judul `Stock Explorer`, deskripsi, serta tab pemilih `Eksplorasi Saham` vs `Komparasi Saham`) tetap menempel di posisi atas (`sticky top-0 z-30 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md shadow-md`), sehingga tidak lagi hilang saat pengguna menggulir ke bawah (*scroll*).
  - Menyelaraskan jangkar lekat sidebar koleksi ke `lg:sticky lg:top-[94px]` agar menempel tepat di bawah header tanpa saling tumpang tindih (*overlap*).
  - Memverifikasi kelulusan 16/16 unit test otomatis serta keberhasilan kompilasi produksi Next.js Turbopack.

## [2026-09-24] fix | Navigasi Bulan & Tahun Kalender Aksi Korporasi & Opsi Jendela Bergulir
- Perbaikan Tombol Next & Prev Macet (Stuck):
  - Mendiagnosis ketidakcocokan opsi HTML `<select>` pada `src/components/CorporateCalendar.jsx`: sebelumnya, opsi dropdown bulan hanya merender `calendarData.monthsAvailable` (bulan yang memiliki agenda aksi korporasi di database). Ketika pengguna mengklik tombol `◀` atau `▶` untuk melihat bulan yang belum memiliki agenda (atau sebelum data dimuat), elemen `<select>` DOM tidak menemukan `<option>` yang cocok dan otomatis kembali menampilkan opsi pertama (September 2026), sehingga tampilan bulan/tahun terlihat macet.
  - Menerapkan `monthOptions` dengan jendela bergulir dinamis (-24 bulan hingga +12 bulan) yang digabungkan secara aman dengan `monthsAvailable`, `selectedMonth`, dan `initialYearMonth`. Seluruh bulan yang dituju kini dijamin tersedia pada opsi pilihan.
  - Memperkuat fungsi `handlePrevMonth` dan `handleNextMonth` dengan pengecekan `isNaN` defensif dan peralihan batas pergantian tahun yang aman (`2026-12` -> `2027-01` dan `2026-01` -> `2025-12`).
  - Menambahkan banner header bulan khusus tepat di atas kalender grid lengkap dengan tombol pintas (`◀ Bulan Lalu`, `Hari Ini`, `Bulan Depan ▶`) serta penghitung agenda aktif.
  - Menambahkan unit test pada `tests/corporateCalendar.test.js` untuk memvalidasi kalkulasi navigasi bulan maju dan mundur melintasi batas tahun (16/16 test lulus).

## [2026-09-24] feat | Tata Ulang Antarmuka Stock Explorer: Workspace Master-Detail Dual-Pane & Tab Kategori Analytical Cockpit
- **Workspace Master-Detail Dual-Pane (Opsi 1)**:
  - Mengubah penumpukan vertikal kontainer koleksi di bagian atas menjadi sidebar kiri yang fleksibel dan dapat diciutkan (`w-80 lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20`).
  - Menambahkan menu pilihan (dropdown) peralihan koleksi dengan tombol aksi kilat (🔄 Refresh, ✏️ Edit, 🔗 Bagikan, 🗑️ Hapus) serta indikator jumlah saham aktif.
  - Mengimplementasikan daftar kartu saham vertikal yang ringkas dan dapat digulir (`max-h-[calc(100vh-270px)]`), menampilkan harga real-time, persentase & nominal perubahan, lencana skor berkode warna dinamis (80+ emerald, 65+ blue, 50+ amber, <50 rose), lencana pencapaian target harga beli/jual, serta mempertahankan 100% fungsionalitas drag-and-drop untuk mengatur urutan saham.
  - Menyematkan tombol toggle pada header bilah pencarian (`[◀ Tutup Koleksi] / [📂 Buka Koleksi (N)]`) agar pengguna dapat menciutkan sidebar sewaktu-waktu dan memperluas grafik kanvas hingga lebar penuh layar monitor.
  - Menyediakan tampilan kanvas kosong (*empty state*) yang intuitif saat belum ada saham yang dipilih, memandu pengguna untuk mencari atau memilih saham dari koleksi.
- **Tab Kategori Analytical Cockpit (Opsi 4)**:
  - Mengonsolidasikan 10 sub-panel analitis yang sebelumnya menumpuk panjang di bawah grafik menjadi 4 tab kategori institucional (`cockpitTab`):
    1. `Valuasi & Finansial`: Valuasi Relatif Peers (RV), Pita Valuasi Historis (PBND), ROIC vs WACC & EVA, serta Interactive Scenario Forecaster.
    2. `Musim & Dividen`: Heatmap Seasonality Bulanan 5 Tahun, Analisis Jebakan Dividen & Run-Rate, serta Kalender Aksi Korporasi & Timeline Katalis.
    3. `Smart Money & Aliran`: Pergeseran Kepemilikan KSEI, Konsentrasi Broker (Aliran Bandarmologi), Profil Volume Lelang Pasar, serta Batas Auto-Rejection (ARA/ARB) & Tangga Eksekusi.
    4. `Riset AI & Sentimen`: Berkas Riset Intelijen Institusional Bloomberg dan Indeks Sentimen Berita Algoritmik.
  - Menyertakan lencana hitung modul aktif pada setiap header tab untuk menandakan ketersediaan sub-mesin analitis.
- **Verifikasi & Build**:
  - Semua pengujian otomatis lulus 100% (15/15 unit test).
  - Kompilasi produksi Next.js Turbopack sukses bersih dengan 0 error.

## [2026-09-24] feat | Kalender Aksi Korporasi, Jadwal 4 Tanggal Keramat Dividen BEI & Pelacak Riwayat Multi-Tahun
- Saluran Data 4 Tanggal Dividen Resmi BEI: Memperbarui `src/lib/corporateActionEngine.js` untuk membedah struktur keterbukaan informasi aksi korporasi Bursa Efek Indonesia (BEI), mengekstrak 4 tanggal krusial dividen: Cum Date (batas beli), Ex Date (tanpa hak dividen), Recording Date (DPS KSEI 16:00 WIB), dan Payment Date (pencairan ke RDN).
- Resolusi Nilai Dividen (DPS) Bertingkat: Menerapkan hirarki perhitungan DPS mencakup nominal per lembar langsung (`CashDividenPerSaham`), derivasi matematis dividen total dibagi jumlah saham beredar (`CashDividenTotal / sharesOutstanding`), pemadanan jendela toleransi 15 hari dengan data Yahoo Finance, dan cadangan tingkat dividen statis.
- Rekam Jejak Dividen Multi-Tahun Terpadu: Membangun `compileHistoricalDividends` yang menggabungkan keterbukaan profil BEI dengan histori multi-tahun Yahoo Finance, mengeliminasi duplikasi dalam jendela 15 hari serta menyusun tabel kronologis lengkap.
- Perombakan Panel Antarmuka Aksi Korporasi: Menulis ulang `src/components/CorporateActionsPanel.jsx` dengan tata letak 3 tab interaktif:
  1. *Jadwal Terkini*: Stepper visual 4 tanggal, kartu status (Cum Aktif, Menunggu Pencairan, Selesai), nominal DPS, estimasi yield terhadap harga pasar saat ini, total dana dividen tunai, dan rekor dividen berturut-turut.
  2. *Riwayat Dividen*: Tabel pembagian dividen multi-tahun yang responsif mencakup tahun buku, jenis dividen (interim vs final), DPS, yield saat itu, dan atribusi sumber data.
  3. *Agenda & RUPS*: Jendela musim RUPS Tahunan (RUPST) dan jendela penyampaian laporan keuangan berkala ke OJK/BEI (Q1, Q2, Q3, FY).
- Integrasi Detail Stock Explorer: Memperbarui `src/app/api/stocks/[ticker]/route.js` dan `src/components/StockExplorer.jsx` untuk meneruskan `dividendSchedule`, `historicalDividends`, dan `dividendSummary`, serta memperbaiki kartu ikhtisar metrik "Dividen Terakhir" agar menampilkan DPS riil.
- Pengujian & Verifikasi: Menambahkan unit test komprehensif pada `tests/corporateAction.test.js` untuk menguji parsing BEI, resolusi DPS, deduplikasi, dan metadata jadwal (223/223 pengujian lulus 100%). Build produksi Turbopack terverifikasi bersih.

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
