---
title: "Aliran Smart Money & Analisis KSEI"
description: "Mekanisme bandarmologi, analisis kepemilikan tanpa warkat KSEI, deteksi lonjakan volume, dan mesin arus transaksi Domestik/Asing multi-periode"
category: "trading-system"
tags: ["smart-money", "ksei", "bandarmologi", "aliran-dana", "inflow-netflow"]
last_updated: "2026-10-09"
version: "1.1.0"
---

# Aliran Smart Money & Analisis KSEI

Mengevaluasi apakah investor institusi besar (*Smart Money*) serta pelaku pasar Domestik dan Asing sedang melakukan akumulasi atau distribusi pada rentang harian hingga tahunan.

---

## 🏛️ 1. Metrik Distribusi Kepemilikan Efek KSEI
Terdapat pada `src/lib/scoring/smartMoney.js` dan `src/scripts/sync-ksei.js`.

* **Rasio Kepemilikan Institusi**:
  - Perbankan, Reksadana, Asuransi, dan Dana Pensiun.
  - Kenaikan persentase kepemilikan institusi yang diiringi penurunan kepemilikan ritel merupakan indikasi **Akumulasi**.
* **Aliran Dana Asing (*Foreign Flow*)**:
  - Net buy atau net sell investor asing dalam rentang 5, 20, dan 60 hari bursa.

---

## 📊 2. Deteksi Anomali & Lonjakan Volume
Terdapat pada `src/lib/scoring/technical.js`.

* **Penghitungan Baseline Volume**: Menghitung rata-rata volume 5 hari secara ketat **sebelum hari ini** untuk menghindari bias self-inclusion:
  $$\text{Baseline Volume} = \text{Rata-rata}(\text{Volume}[-6 \dots -1])$$
* **Lonjakan Akumulasi**: Terdeteksi jika $\text{Volume Hari Ini} \ge 2.0 \times \text{Baseline Volume}$ dan harga ditutup pada 40% rentang teratas candle harian.

---

## 💸 3. Mesin Arus Transaksi Multi-Periode (Inflow, Outflow & Netflow)
Terdapat pada `src/lib/transactionFlowEngine.js` (`calculateTransactionFlows`).

Menghitung **Inflow (Gross Buy)**, **Outflow (Gross Sell)**, dan **Netflow (Net Buy/Sell)** untuk **Investor Asing (Foreign)**, **Investor Domestik (Lokal)**, serta **Arus Uang Aktif (Active Flow)** pada empat jendela hari bursa BEI:
* **Harian (`1d`)**: 1 Hari Bursa (`1HK`)
* **Mingguan (`1w`)**: 5 Hari Bursa (`5HK`)
* **Bulanan (`1m`)**: 20 Hari Bursa (`20HK`)
* **Tahunan (`1y`)**: 250 Hari Bursa (`250HK`)

### Arsitektur Data Hibrida
1. **Data Resmi Ringkasan Saham BEI (`source: 'idx'`)**:
   - Ketika data harian *Ringkasan Saham* BEI (`foreignBuy`, `foreignSell`, `volume`, `value`) tersedia di `technicals.idxFlow`, nilai *inflow* dan *outflow* asing dihitung langsung dari jumlah lembar resmi BEI dikalikan harga rata-rata tertimbang harian ($\text{VWAP} = \text{value} / \text{volume}$).
   - Transaksi domestik dihitung melalui prinsip kliring pasar: $\text{Domestic Buy} = \max(0, \text{Volume} - \text{Foreign Buy})$ dan $\text{Domestic Sell} = \max(0, \text{Volume} - \text{Foreign Sell})$.
2. **Estimasi Terkalibrasi OHLCV + KSEI (`source: 'estimated'`)**:
   - Untuk hari bursa historis yang belum memiliki baris ringkasan BEI, rasio beli aktif (`computeDailyBuyingRatio`) menggabungkan **Close Location Value** ($\text{CLV} = \frac{\text{Close} - \text{Low}}{\text{High} - \text{Low}}$, bobot $65\%$) dan kurva logistik perubahan harga harian ($35\%$).
   - Total volume dibagi antara Asing dan Domestik menggunakan `kseiLatest.foreignPercent` (dibatasi pada $[5\%, 85\%]$, bawaan $35\%$) disertai kemiringan arah beli (`resolveKseiFlowWeights`) dari delta bulanan KSEI.
3. **Satuan & Klasifikasi Pelaku Dominan**:
   - Setiap periode menyajikan nilai dalam **Rupiah (`Rp`)**, **Lot** ($\text{lembar} / 100$), dan **% terhadap Total Nilai Transaksi** (`shareOfTurnoverPct`, `netflowPct`), lengkap dengan penanda `dominantPlayer` (`FOREIGN_ACCUMULATION`, `DOMESTIC_ACCUMULATION`, `FOREIGN_DISTRIBUTION`, `DOMESTIC_DISTRIBUTION`, atau `BALANCED`).

