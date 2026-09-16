---
title: "Bloomberg WACC & ROIC Nilai Tambah Ekonomi (EVA)"
description: "Kalkulasi biaya modal (WACC) dan perbandingan terhadap ROIC untuk menilai penciptaan kekayaan riil pemegang saham."
category: "financial-engine"
tags: ["bloomberg", "wacc", "roic", "eva", "economic-spread", "biaya-modal", "capm"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg WACC & ROIC Nilai Tambah Ekonomi (EVA)

## 1. Latar Belakang & Rasionalitas Finansial

Laba bersih akuntansi dapat mengecoh: perusahaan yang melaporkan laba bersih positif bisa jadi sebenarnya sedang membakar modal pemegang saham apabila imbal hasil modal investasinya gagal melampaui biaya modal rata-rata tertimbang (*Weighted Average Cost of Capital*).

Modul **Bloomberg WACC Engine** mengalkulasi:
1. **Biaya Modal Rata-Rata Tertimbang (WACC)**: Batas imbal hasil minimum (*hurdle rate*) kelayakan bisnis.
2. **Imbal Hasil Modal Investasi (ROIC)**: Imbal hasil operasional riil dari seluruh modal utang dan ekuitas yang ditanamkan.
3. **Economic Spread**: Selisih $\text{ROIC} - \text{WACC}$.
4. **Economic Value Added (EVA)**: Nilai tambah ekonomi riil dalam satuan mata uang setelah memperhitungkan seluruh biaya pembiayaan.

---

## 2. Rumus & Logika Finansial

### 2.1 Perhitungan WACC

$$\text{WACC} = \left(\frac{E}{V} \times K_e\right) + \left(\frac{D}{V} \times K_d \times (1 - T)\right)$$

Variabel:
- $E$: Kapitalisasi Pasar (Nilai Ekuitas)
- $D$: Total Utang Berbunga
- $V = E + D$: Total Struktur Modal Perusahaan
- $K_e$: Biaya Ekuitas dari Model CAPM:
  $$K_e = R_f + (\beta \times \text{ERP})$$
  - $R_f = 6.5\%$: Imbal hasil obligasi pemerintah RI tenor 10 tahun (SBN 10Y).
  - $\beta$: Koefisien beta volatilitas saham terhadap IHSG.
  - $\text{ERP} = 5.5\%$: Premi risiko ekuitas pasar modal Indonesia.
- $K_d$: Biaya utang sebelum pajak (~8.0% suku bunga pinjaman komersial RI).
- $T = 22\%$: Tarif PPh Badan di Indonesia.

### 2.2 ROIC & Economic Spread

$$\text{NOPAT} = \text{Laba Operasional (EBIT)} \times (1 - T)$$

$$\text{Invested Capital} = \text{Total Utang} + \text{Total Ekuitas} - \text{Kas Berlebih}$$

$$\text{ROIC} = \frac{\text{NOPAT}}{\text{Invested Capital}} \times 100\%$$

$$\text{Economic Spread} = \text{ROIC} - \text{WACC}$$

$$\text{EVA} = \text{Invested Capital} \times \left(\frac{\text{Economic Spread}}{100}\right)$$

### 2.3 Klasifikasi Keputusan

- **$\text{Spread} \ge +5.0\%$**: **Super Value Creator 👑** (Perusahaan pencipta kekayaan luar biasa).
- **$\text{Spread} > 0\%$**: **Value Creator ✨** (Operasional sehat melampaui biaya modal).
- **$-3.0\% \le \text{Spread} < 0\%$**: **Marginal Destroyer ⚠️** (Efisiensi perputaran modal perlu perbaikan).
- **$\text{Spread} < -3.0\%$**: **Value Destroyer 🚨** (Membakar modal ekonomi pemegang saham).

---

## 3. Implementasi Kode

- Mesin kalkulasi murni: `src/lib/waccEngine.js`.
- Integrasi API: Disertakan pada rute `GET /api/stocks/[ticker]` sebagai `stockDetail.wacc`.
- Komponen Antarmuka: `src/components/EconomicValuePanel.jsx` terpasang di Stock Explorer dengan diagram bobot modal ($W_e$ vs $W_d$) dan status Economic Spread.
