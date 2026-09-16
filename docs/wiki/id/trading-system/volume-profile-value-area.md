---
title: "Bloomberg GP: Volume Profile & Value Area (POC, VAH, VAL)"
description: "Distribusi horizontal volume perdagangan, Point of Control (POC), batas 70% Value Area, dan teori lelang pasar."
category: "trading-system"
tags: ["bloomberg", "gp", "volume-profile", "point-of-control", "value-area", "teori-lelang"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg GP: Volume Profile & Value Area (POC, VAH, VAL)

## 1. Ikhtisar & Rasional Institusional

Grafik volume konvensional hanya menampilkan volume berdasarkan waktu (sumbu vertikal). Sebaliknya, **Volume Profile** memetakan volume berdasarkan tingkat harga (sumbu horizontal), memperlihatkan level harga di mana konsensus transaksi terbesar institusi terjadi.

Modul **Bloomberg GP (`GP <GO>`)** Volume Profile menghitung:
1. **Point of Control (POC)**: Fraksi harga tunggal dengan volume transaksi terpadat. Bertindak sebagai harga jangkar/magnet likuiditas.
2. **Value Area (VA)**: Rentang harga yang mencakup 70% dari seluruh total volume yang diperdagangkan.
3. **Value Area High (VAH)**: Batas atas dari zona 70% Value Area.
4. **Value Area Low (VAL)**: Batas bawah dari zona 70% Value Area.
5. **Konteks Teori Lelang Pasar (Market Auction Theory)**: Menentukan apakah harga saat ini berada pada kondisi *Bullish Premium / Breakout* (di atas VAH), *Equilibrium / Konsolidasi* (di dalam VA), atau *Diskon Ekstrem / Rejection* (di bawah VAL).

---

## 2. Formulasi Matematika & Langkah Algoritma

### 2.1 Diskretisasi Rentang Harga ke Dalam Bins

$$\text{Lebar Bin} = \frac{P_{\text{max}} - P_{\text{min}}}{K} \quad (K = 15\text{ bins})$$

Setiap transaksi $(P_t, V_t)$ diakumulasikan ke dalam bin indeks $j$.

### 2.2 Penentuan POC & Ekspansi Value Area 70%

Dimulai dari bin dengan volume terbesar (POC), algoritma berekspansi ke atas dan ke bawah memilih bin tetangga dengan volume lebih besar hingga akumulasi mencapai $\ge 70\%$ total volume.

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/volumeProfileEngine.js`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.volumeProfile`.
- Komponen visual: Panel terpadu pada `src/components/SmartMoneyLiquidityPanel.jsx`.
- Pengujian otomatis: `tests/volumeProfile.test.js`.
