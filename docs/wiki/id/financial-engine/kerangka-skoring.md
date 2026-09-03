---
title: "Kerangka Skoring Multi-Faktor"
description: "Matriks penilaian saham kuantitatif 0–100, bobot indikator, dan adaptasi mode trading"
category: "financial-engine"
tags: ["skoring", "multi-faktor", "bobot-indikator", "peringkat-saham"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Kerangka Skoring Multi-Faktor

Engine skoring mengevaluasi setiap emiten menggunakan skala terstandarisasi **0 hingga 100**.

---

## 🏛️ Enam Pilar Penilaian

1. **Skor Fundamental (0–100)**:
   - Menilai profitabilitas, efisiensi operasional, struktur modal, dan beban utang.
   - Metrik utama: ROE (Return on Equity), OPM (Margin Laba Operasional), DER (Debt-to-Equity), dan Arus Kas Bebas.
   - *Pengecualian Sektor Perbankan*: Emiten bank dengan DER tinggi (DER 5.0x–7.0x) **tidak dipenalti**, karena dana pihak ketiga (tabungan/deposito nasabah) dicatat sebagai liabilitas dalam akuntansi perbankan.
2. **Skor Valuasi (0–100)**:
   - PER terhadap Median Sektor (35%)
   - PBV terhadap Median Sektor (30%)
   - Earnings Yield = $\frac{\text{EPS}}{\text{Harga}} \times 100$ (20%)
   - Rasio PEG (15%)
3. **Skor Teknikal (0–100)**:
   - RSI Wilder 14 periode (momentum dan area jenuh jual/beli).
   - Penjajaran tren: SMA 20, 50, dan 200.
   - Lonjakan volume terhadap rata-rata 5 hari sebelumnya (tidak menyertakan bar hari ini agar tidak bias).
4. **Skor Tren (0–100)**:
   - Konfirmasi pembalikan arah menggunakan Supertrend (ATR 10, Pengali 3.0) dan persilangan garis DEMA 20.
5. **Skor Dividen (0–100)**:
   - Persentase dividen yield terhadap suku bunga acuan bebas risiko Bank Indonesia.
   - Konsistensi riwayat pembagian dividen selama beberapa tahun terakhir.
6. **Smart Money / Bandarmologi (0–100)**:
   - Akumulasi bersih kepemilikan institusi di KSEI dan aliran transaksi investor asing.

---

## ⚖️ Matriks Bobot Berdasarkan Horison & Gaya Trading

| Gaya Trading / Mode | Fundamental | Valuasi | Teknikal | Tren | Smart Money |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Scalping ⚡** | 10% | 10% | 40% | 25% | 15% |
| **Daily 📊** | 20% | 15% | 30% | 20% | 15% |
| **Swing 📈** (Bawaan) | 30% | 20% | 20% | 15% | 15% |
| **Pertumbuhan 🚀** | 35% | 10% | 20% | 25% | 10% |
| **Konservatif 🛡️** | 45% | 25% | 10% | 10% | 10% |
| **Defensif 🔒** | 50% | 30% | 10% | 5% | 5% |
