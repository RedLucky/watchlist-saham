---
title: "Strategi Alpha Legends"
description: "Penyaring saham berbasis strategi para legenda investasi dunia yang disesuaikan untuk BEI"
category: "financial-engine"
tags: ["buffett", "lynch", "graham", "greenblatt", "alpha-legends"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Strategi Alpha Legends

Tersedia pada berkas `src/lib/alphaLegendEngine.js`. Mengadaptasi prinsip kuantitatif investor legendaris dengan batasan data emiten Bursa Efek Indonesia.

---

## 🦅 1. Warren Buffett (Economic Moat & Super Compounder)
* **Filosofi**: Keunggulan kompetitif jangka panjang, efisiensi modal tinggi, dan utang konservatif.
* **Kriteria**:
  - $\text{ROE} \ge 18\%$ (Pertumbuhan majemuk konsisten).
  - $\text{Operating Profit Margin (OPM)} \ge 15\%$.
  - $\text{Debt-to-Equity (DER)} \le 1.0\times$ (Kecuali sektor perbankan).
  - Arus Kas Bebas Positif ($\text{Free Cash Flow} > 0$).

---

## ⚡ 2. Peter Lynch (Fast Growers & Filter PEG)
* **Filosofi**: Saham pertumbuhan tinggi pada harga yang wajar (*Growth At a Reasonable Price / GARP*).
* **Kriteria**:
  - $\text{Pertumbuhan Pendapatan} \ge 15\%$.
  - $\text{Pertumbuhan Laba Bersih} \ge 15\%$.
  - $\text{PEG Ratio} \le 1.5\times$ (Filter mutlak Lynch untuk valuasi pertumbuhan).
  - $\text{PER} \le 28\times$.

---

## 🛡️ 3. Benjamin Graham (Nilai Defensif)
* **Filosofi**: Margin keamanan yang dalam dan proteksi modal kerja.
* **Kriteria**:
  - $\text{PER} \le 15.0\times$.
  - $\text{PBV} \le 1.5\times$.
  - $\text{PER} \times \text{PBV} \le 22.5$ (Perkalian Graham).
  - $\text{Current Ratio} \ge 1.5\times$.
  - Pembayaran dividen konsisten berkelanjutan (disesuaikan menjadi minimal 5 tahun untuk histori IDX).

---

## 🪄 4. Joel Greenblatt (Magic Formula)
* **Filosofi**: Kombinasi emiten murah (Earnings Yield tinggi) dengan bisnis berkualitas (Return on Capital tinggi).
* **Kriteria**:
  - $\text{Earnings Yield} = \frac{\text{EPS}}{\text{Harga}} \ge 9.0\%$.
  - $\text{Return on Capital (ROC / ROE)} \ge 16.0\%$.
  - Syarat mutlak: tidak ada kompromi jalan pintas OPM.
