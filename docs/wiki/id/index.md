# Watchlist Saham - Indeks Basis Pengetahuan (Wiki)

> **Catatan Pengembang & Agen AI**: Ini adalah peta navigasi versi Bahasa Indonesia untuk dokumentasi basis pengetahuan aplikasi `watchlist-saham`. Referensi teknis standar baku untuk agen AI tersedia di `docs/wiki/en/index.md`.

---

## 🏛️ Arsitektur Sistem

* [Ringkasan Sistem](./architecture/ringkasan-sistem.md) — Gambaran arsitektur teknologi (Next.js 16, Turbopack, Tailwind CSS, PostgreSQL, Prisma, Plus Jakarta Sans).
* [Pipeline & Sinkronisasi Data](./architecture/pipeline-data.md) — Sinkronisasi harga kilat, deep sync fundamental, integrasi Yahoo Finance, dan antrean round-robin.
* [Model & Skema Database](./architecture/model-database.md) — Definisi skema Prisma, serialisasi BigInt, integritas relasi, dan indexing.
* [Mesin Riset AI Lokal & Antrean](./architecture/mesin-ai.md) — Inferensi mandiri GGUF (llama.cpp), optimasi thread CPU multi-core, pencarian berita, dan antrean pekerja asinkron.

---

## 📊 Engine Finansial & Kuantitatif

* [Kerangka Skoring Multi-Faktor](./financial-engine/kerangka-skoring.md) — Matriks penilaian 0–100, sub-skor, dan bobot dinamis per gaya trading (Scalping, Daily, Swing).
* [Model Valuasi & Nilai Wajar](./financial-engine/model-valuasi.md) — Nilai Wajar Benjamin Graham, imbal hasil SUN 10 tahun, Altman Z-Score, Piotroski F-Score, dan pembatasan CAGR 25%.
* [Indikator & Sinyal Teknikal](./financial-engine/sinyal-teknikal.md) — Wilder's RSI 14, Supertrend + DEMA 20, MACD, Bollinger Bands, dan deteksi pola candlestick.
* [Strategi Alpha Legends](./financial-engine/strategi-alpha-legend.md) — Kriteria kuantitatif para legenda investasi (Buffett, Lynch, Graham, Greenblatt) yang disesuaikan untuk BEI.
* [Portofolio Pensiun & Lot Knapsack](./financial-engine/portofolio-pensiun.md) — Alokasi multi-aset FIRE pensiun dini, pemilihan saham AI, dan optimasi integer knapsack lot (efisiensi anggaran 98-99.9%).
* [Valuasi Relatif Peers (RV)](./financial-engine/valuasi-relatif-peers.md) — Mesin komparasi peers Bloomberg RV, pemeringkatan sub-sektor, dan seleksi emiten terbaik di kelasnya (Best-in-Class).
* [Pita Valuasi Historis (PBND)](./financial-engine/pita-valuasi-pbnd.md) — Pita deviasi standar PE & PBV Bloomberg PBND (Mean, +/-1 SD, +/-2 SD) serta target harga diskon ekstrem.
* [Kalkulator WACC & Nilai Tambah EVA](./financial-engine/wacc-nilai-ekonomi.md) — Mesin biaya modal Bloomberg WACC, CAPM Ke, dan Economic Value Added (Value Creator vs Destroyer).
* [Analisis Jebakan Dividen & Run-Rate Pasif (DTRP / DVD)](./financial-engine/jebakan-dividen-dtrp.md) — Evaluasi keamanan dividen, kecukupan FCF, risiko ex-date drop, dan proyeksi arus kas 12 bulan.
* [Kalender Aksi Korporasi & Katalis Pasar (CA)](./financial-engine/kalender-aksi-korporasi.md) — Jadwal dan hitung mundur dividen tunai, RUPS (RUPST/RUPSLB), dan jendela musim rilis laporan keuangan.

---

## 🎯 Sistem Trading & Pasar Modal

* [Siklus Hidup Order & Pelacakan Win Rate](./trading-system/siklus-hidup-order.md) — Simulasi order antre beli: WAITING_BUY -> OPEN -> WIN / LOSS / EXPIRED, dan rumus Win Rate riil.
* [Aliran Smart Money & KSEI](./trading-system/aliran-smart-money.md) — Pelacakan kepemilikan institusi KSEI, foreign flow, dan deteksi akumulasi bandarmologi.
* [Bot Interaktif Discord & Notifikasi](./trading-system/bot-discord.md) — Ekstraksi kode saham alami (NLP), cache pintar 30 hari, format rich embed, dan peringatan webhook transaksi otomatis.
* [Batas Auto-Rejection & Tangga Fraksi (ARA / ARB)](./trading-system/tangga-auto-rejection.md) — Batas harga regulasi BEI, perhitungan presisi jarak fraksi, dan tangga harga 7 tingkat.
* [Manajemen Risiko Portofolio & Stress Testing (PORT / MARS)](./trading-system/manajemen-risiko-portofolio.md) — Weighted Beta portofolio, VaR 95% 1-hari, dan uji ketahanan skenario guncangan makro.
* [Peringatan Pintar Berbasis Aturan (ALRT)](./trading-system/peringatan-pintar-alrt.md) — Sinyal otomatis kedekatan ARA/ARB, diskon valuasi ekstrem, jebakan dividen, dan lonjakan volume transaksi.
