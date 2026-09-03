---
title: "Aliran Smart Money & Analisis KSEI"
description: "Mekanisme bandarmologi, analisis kepemilikan tanpa warkat KSEI, dan deteksi lonjakan volume"
category: "trading-system"
tags: ["smart-money", "ksei", "bandarmologi", "aliran-dana"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Aliran Smart Money & Analisis KSEI

Mengevaluasi apakah investor institusi besar (*Smart Money*) sedang melakukan akumulasi atau distribusi sebelum terjadi pergerakan harga yang signifikan.

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
