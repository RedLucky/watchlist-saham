---
title: "Pipeline Data & Layanan Sinkronisasi"
description: "Arsitektur penarikan data pasar, antrean sinkronisasi latar belakang, dan integrasi Yahoo Finance"
category: "architecture"
tags: ["pipeline-data", "yahoo-finance", "sinkronisasi", "ksei"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Pipeline Data & Layanan Sinkronisasi

Aplikasi menerapkan sistem sinkronisasi data bertingkat untuk menjaga kesegaran data harga tanpa terkena pemblokiran batas kuota (*rate-limiting*) dari penyedia data.

---

## ⚡ 1. Sinkronisasi Harga Cepat (`fastSyncPrices`)

* **Frekuensi**: Berjalan otomatis di proses latar belakang (setiap 5–15 menit) atau saat dipicu manual lewat `POST /api/sync`.
* **Cakupan**: Saham yang ada di watchlist aktif pengguna, koleksi saham, dan 250 saham paling likuid di BEI.
* **Mekanisme**:
  - Menggunakan fungsi batch `yahooFinance.quote()`.
  - Memperbarui harga pasar terkini, persentase perubahan harian, volume perdagangan, dan timestamp pembaruan.
  - Memastikan angka bertipe BigInt diserialisasikan dengan aman ke bentuk Number sebelum dikirim ke antarmuka Next.js.

---

## 🔬 2. Sinkronisasi Fundamental Mendalam (`deepSyncStockOnce`)

* **Frekuensi**: Setiap malam atau jika data fundamental terakhir berusia lebih dari 24 jam.
* **Cakupan**: Mengambil modul laporan keuangan lengkap:
  - Rasio profitabilitas: Margin Operasional (OPM), Margin Laba Bersih (NPM), ROE, ROA.
  - Rasio solvabilitas & valuasi: DER, Current Ratio, PER, PBV, PEG Ratio, Nilai Buku.
  - Laporan Arus Kas: Free Cash Flow, histori laba bersih tahunan, dan pertumbuhan pendapatan.
* **Penyimpanan**: Disimpan sebagai string JSON di PostgreSQL (`StockData.fundamentals`, `StockData.technicals`, dll).

---

## 🏛️ 3. Sinkronisasi Data KSEI & Kepemilikan Institusi

* **Sumber**: Laporan distribusi kepemilikan saham tanpa warkat (*scriptless*) dari KSEI (Kustodian Sentral Efek Indonesia).
* **Skrip**: `src/scripts/sync-ksei.js`
* **Data yang diproses**:
  - Rasio kepemilikan institusi lokal vs asing (Perbankan, Reksadana, Asuransi, Dana Pensiun).
  - Konsentrasi saham pengendali vs investor ritel.
  - Aliran akumulasi dana pintar (*Smart Money Flow*).
