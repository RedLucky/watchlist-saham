---
title: "Bloomberg PORT & MARS: Manajemen Risiko Portofolio, Beta Tertimbang & Stress Testing"
description: "Analitik risiko portofolio institusi, Weighted Beta, Value at Risk (VaR 95% 1-Hari), dan simulasi uji ketahanan guncangan makroekonomi."
category: "trading-system"
tags: ["bloomberg", "port", "mars", "manajemen-risiko", "weighted-beta", "var-95", "stress-testing", "portofolio"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg PORT & MARS: Manajemen Risiko Portofolio, Beta Tertimbang & Stress Testing

## 1. Ikhtisar & Rasional Institusional

Pengelolaan portofolio modern tidak cukup hanya memantau keuntungan mengambang (*floating profit*), tetapi wajib mengukur sensitivitas pasar dan potensi kerugian maksimal pada kondisi krisis (*downside protection*).

Fitur **Bloomberg PORT (`PORT <GO>`) & MARS (`MARS <GO>`)** menyediakan:
1. **Weighted Portfolio Beta ($\beta_{\text{port}}$)**: Mengukur volatilitas agregat portofolio terhadap IHSG.
2. **Value at Risk (VaR 95% 1-Hari)**: Estimasi potensi kerugian nominal maksimal dalam rentang 1 hari perdagangan pada tingkat keyakinan 95%.
3. **Peringatan Konsentrasi & Sektor**: Mendeteksi bobot tunggal yang terlalu dominan (> 35%) atau sektor yang mendominasi lebih dari 50% modal.
4. **Kokpit Uji Ketahanan Makro (Stress Testing)**: Simulasi seketika atas 4 skenario guncangan pasar:
   - *IHSG Flash Crash (-5.0%)*
   - *Kenaikan Suku Bunga BI Rate (+50 bps)*
   - *Commodity Supercycle Rebound (+10%)*
   - *Pelemahan Rupiah ke Rp 17.000 / USD*

---

## 2. Formulasi Matematika & Kriteria Risiko

### 2.1 Beta Portofolio Rata-Rata Tertimbang

$$\beta_{\text{port}} = \sum_{i=1}^{M} w_i \times \beta_i \quad \text{di mana } w_i = \frac{\text{Nilai Posisi}_i}{\text{Total Nilai Portofolio}}$$

- $\beta_{\text{port}} \ge 1.25$: Profil Agresif / Volatilitas Tinggi ⚡ (fluktuasi lebih tajam dibanding pasar).
- $0.80 \le \beta_{\text{port}} < 1.25$: Profil Seimbang / Netral Pasar ⚖️.
- $\beta_{\text{port}} < 0.80$: Profil Defensif / Risiko Rendah 🛡️.

### 2.2 Value at Risk (VaR 95%)

$$\text{VaR}_{95\%} = 1.645 \times \sigma_{\text{harian}} \times \beta_{\text{port}} \times \text{Total Portofolio}$$

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/portfolioRiskEngine.js`.
- Integrasi API: Disematkan di `GET /api/portfolio` sebagai `riskAnalytics`.
- Komponen visual: Kokpit terpadu pada `src/components/PortfolioPanel.jsx`.
- Pengujian otomatis: `tests/portfolioRisk.test.js`.
