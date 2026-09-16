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

---

## 🎯 Sistem Trading & Pasar Modal

* [Siklus Hidup Order & Pelacakan Win Rate](./trading-system/siklus-hidup-order.md) — Simulasi order antre beli: WAITING_BUY -> OPEN -> WIN / LOSS / EXPIRED, dan rumus Win Rate riil.
* [Aliran Smart Money & KSEI](./trading-system/aliran-smart-money.md) — Pelacakan kepemilikan institusi KSEI, foreign flow, dan deteksi akumulasi bandarmologi.
* [Bot Interaktif Discord & Notifikasi](./trading-system/bot-discord.md) — Ekstraksi kode saham alami (NLP), cache pintar 30 hari, format rich embed, dan peringatan webhook transaksi otomatis.
