---
title: "Bloomberg PBND: Pita Valuasi Historis PE & PBV"
description: "Pita deviasi standar historis (Mean, +/-1 SD, +/-2 SD) untuk mendeteksi level diskon ekstrem saham secara statistik."
category: "financial-engine"
tags: ["bloomberg", "pbnd", "pe-bands", "pbv-bands", "standar-deviasi", "valuasi-historis"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg PBND: Pita Valuasi Historis PE & PBV

## 1. Latar Belakang & Rasionalitas Institusional

Dalam analisis ekuitas institusional, menilai saham murah atau mahal hanya dari angka nominal PER (misal 15x) atau PBV (misal 2.0x) seringkali keliru. Saham perbankan bermoat tinggi seperti `BBCA` secara struktural diperdagangkan pada valuasi premium, sementara saham komoditas siklikal sering diperdagangkan pada diskon.

Metodologi **Bloomberg PBND (`PBND <GO>` / `VBND <GO>`)** mengukur valuasi saat ini terhadap distribusi historisnya sendiri selama 3–5 tahun terakhir menggunakan pita deviasi standar:
- **$+2\text{SD}$**: Premi Ekstrem (langit-langit valuasi historis, risiko normalisasi balik arah tinggi).
- **$+1\text{SD}$**: Di Atas Rata-rata (Overvalued).
- **$\text{Mean}$**: Nilai Wajar Historis (Titik Keseimbangan 5-Tahun).
- **$-1\text{SD}$**: Di Bawah Rata-rata (Undervalued).
- **$-2\text{SD}$**: Diskon Ekstrem (Peluang akumulasi nilai yang langka secara statistik).

---

## 2. Rumus & Perhitungan Matematis

Diberikan deret harga penutupan historis $P_t$ dan nilai pembagi saat ini (EPS untuk PER, atau BVPS untuk PBV):

$$\text{Multiple}_t = \frac{P_t}{\text{Denominator}}$$

### 2.1 Rata-Rata (Mean) & Standar Deviasi ($\sigma$)

$$\mu = \frac{1}{N} \sum_{t=1}^{N} \text{Multiple}_t$$

$$\sigma = \sqrt{\frac{1}{N - 1} \sum_{t=1}^{N} (\text{Multiple}_t - \mu)^2}$$

### 2.2 Pita Valuasi & Target Harga Fraksi BEI

| Tingkat Pita | Kelipatan Valuasi | Target Harga BEI | Arti Keputusan Investasi |
| :--- | :--- | :--- | :--- |
| **$-2\text{SD}$** | $\mu - 2\sigma$ | $\text{roundToIDXTick}((\mu - 2\sigma) \times \text{Denom})$ | Diskon Ekstrem (Akumulasi Defensif Langka) |
| **$-1\text{SD}$** | $\mu - 1\sigma$ | $\text{roundToIDXTick}((\mu - 1\sigma) \times \text{Denom})$ | Undervalued (Margin of Safety Menarik) |
| **$\text{Mean}$** | $\mu$ | $\text{roundToIDXTick}(\mu \times \text{Denom})$ | Nilai Wajar (Keseimbangan Historis) |
| **$+1\text{SD}$** | $\mu + 1\sigma$ | $\text{roundToIDXTick}((\mu + 1\sigma) \times \text{Denom})$ | Overvalued |
| **$+2\text{SD}$** | $\mu + 2\sigma$ | $\text{roundToIDXTick}((\mu + 2\sigma) \times \text{Denom})$ | Premi Ekstrem (Titik Jenuh / Realisasi Profit) |

### 2.3 Skor Z Valuasi

$$Z = \frac{\text{Current Multiple} - \mu}{\sigma}$$

---

## 3. Implementasi Kode

- Mesin kalkulasi murni: `src/lib/valuationBands.js`.
- Integrasi API: Disertakan pada rute `GET /api/stocks/[ticker]` sebagai `stockDetail.valuationBands`.
- Komponen Antarmuka: `src/components/ValuationBandsPanel.jsx` terpasang di Stock Explorer dengan tombol alih antara P/E dan P/BV.

