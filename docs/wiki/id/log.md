# Log Kronologis Wiki

Seluruh riwayat perubahan, penambahan materi (*ingest*), dan pemutakhiran basis pengetahuan dicatat di sini secara kronologis.

---

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
