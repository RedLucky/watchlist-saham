---
title: "Bloomberg ARA / ARB: Batas Regulasi Auto-Rejection BEI & Tangga Fraksi Harga"
description: "Batas fluktuasi harga harian BEI (ARA/ARB), perhitungan presisi jarak fraksi (ticks), dan tangga eksekusi harga saham real-time."
category: "trading-system"
tags: ["bloomberg", "ara", "arb", "auto-rejection", "fraksi-harga", "eksekusi-order", "aturan-bei"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg ARA / ARB: Batas Regulasi Auto-Rejection BEI & Tangga Fraksi Harga

## 1. Ikhtisar & Rasional Institusional

Di Bursa Efek Indonesia (BEI), sistem perdagangan JATS menerapkan batas persentase pergerakan harga harian maksimum yang disebut **Auto-Rejection**. Order beli atau jual yang melampaui rentang ini otomatis ditolak oleh sistem bursa.

Fitur **Bloomberg ARA / ARB (`ARA <GO>`)** menyediakan instrumen eksekusi presisi bagi trader dan manajer investasi:
1. **Batas Harga Resmi ARA & ARB**: Nilai Auto-Rejection Atas (ARA) dan Auto-Rejection Bawah (ARB) dihitung dari harga penutupan sebelumnya (*previous close*) dan dibulatkan sesuai fraksi harga resmi BEI.
2. **Jarak Fraksi Harga Presisi (Tick Distance)**: Menghitung persis berapa fraksi (*ticks*) yang tersisa antara harga pasar saat ini menuju batas ARA maupun ARB.
3. **Tangga Eksekusi (Execution Ladder)**: Visualisasi 7 tingkat harga kunci (`[ARA, +10%, +5%, Harga Saat Ini, -5%, -10%, ARB]`) lengkap dengan persentase perubahan dan jarak fraksi.
4. **Peringatan Kedekatan Batas (Proximity Alerts)**: Notifikasi dini saat harga saham berada dalam jarak $\le 3$ fraksi harga dari ARA atau ARB.

---

## 2. Ketentuan Regulasi & Formulasi Matematika

### 2.1 Persentase Batasan Simetris BEI (Pasar Reguler)

| Rentang Harga Penutupan ($P_{\text{prev}}$) | Batas Maksimum Kenaikan / Penurunan | Fraksi Minimum (Tick Size) |
| :--- | :--- | :--- |
| **$<\text{Rp } 200$** | $\pm 35\%$ | Rp 1 |
| **$\text{Rp } 200 - \text{Rp } 5.000$** | $\pm 25\%$ | Rp 2 (200–500), Rp 5 (500–2k), Rp 10 (2k–5k) |
| **$>\text{Rp } 5.000$** | $\pm 20\%$ | Rp 25 |
| **Papan Akselerasi** | $\pm 10\%$ | Rp 1 |

### 2.2 Aturan Pembulatan Fraksi Harga

$$\text{Harga ARA} = \text{roundToIDXTick}\left(P_{\text{prev}} \times (1 + \frac{\text{Limit}\%}{100}), \text{'down'}\right)$$

$$\text{Harga ARB} = \max\left(50, \text{roundToIDXTick}\left(P_{\text{prev}} \times (1 - \frac{\text{Limit}\%}{100}), \text{'up'}\right)\right)$$

*Catatan: Pada pasar reguler, batas ARB tidak dapat menembus harga dasar Rp 50.*

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/idxExecutionLimits.js`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.executionLimits`.
- Komponen visual: `src/components/AutoRejectionLadderPanel.jsx`.
- Pengujian otomatis: `tests/idxExecutionLimits.test.js`.

