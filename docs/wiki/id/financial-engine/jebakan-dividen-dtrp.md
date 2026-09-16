---
title: "Bloomberg DTRP & DVD: Analisis Jebakan Dividen & Proyeksi Arus Kas Pasif"
description: "Evaluasi institusional terhadap keberlanjutan dividen, kecukupan FCF, risiko kejatuhan harga di hari Ex-Date, dan run-rate pasif 12 bulan."
category: "financial-engine"
tags: ["bloomberg", "dtrp", "dvd", "jebakan-dividen", "fcf-coverage", "payout-ratio", "dividend-aristocrats"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg DTRP & DVD: Analisis Jebakan Dividen & Proyeksi Arus Kas Pasif

## 1. Ikhtisar & Rasional Institusional

Kesalahan umum investor ritel di Bursa Efek Indonesia (BEI) adalah mengejar *dividend yield* tinggi dua digit (misalnya 12% – 18%) tanpa memeriksa kesehatan kas dan ketahanan modal emiten. Pada hari *Ex-Date*, saham siklikal dengan yield tinggi sering anjlok tajam melebihi nilai dividen tunai yang diterima (*Dividend Trap*), menyebabkan investor merugi secara modal neto.

Modul **Bloomberg DTRP (`DTRP <GO>`) & DVD (`DVD <GO>`)** mengevaluasi keberlanjutan dividen melalui fundamental multidimensi:
1. **Free Cash Flow (FCF) Coverage**: Memastikan dividen dibiayai dari arus kas bebas riil operasional, bukan sekadar laba akrual atau penambahan utang.
2. **Batas Aman Dividend Payout Ratio (DPR)**: Menandai emiten yang membayarkan dividen di atas 85% atau melampaui 100% laba bersihnya.
3. **Konsistensi Rekam Jejak (Dividend Aristocrat BEI)**: Mengapresiasi emiten yang rutin membagikan dividen tanpa putus selama 5 hingga 10+ tahun.
4. **12-Month Cashflow Run-Rate (DVD)**: Menampilkan kalkulasi proyeksi arus kas dividen per 1 lot (100 lembar) dalam satuan harian, bulanan, dan tahunan.

---

## 2. Formulasi Matematika & Aturan Penilaian

### 2.1 Free Cash Flow Coverage

$$\text{FCF Coverage} = \frac{\text{Free Cash Flow}}{\text{Total Dividends Paid}}$$

- $\text{Coverage} \ge 1.0\times$: Dividen tertutup 100% dari arus kas bebas (+15 poin).
- $\text{FCF} \le 0$: Peringatan bahaya kas operasional tekor (-25 poin).

### 2.2 Evaluasi Payout Ratio (DPR)

- $\text{DPR} > 100\%$: Penalti ekstrem (-30 poin). Dividen dibiayai dari saldo laba masa lalu atau utang.
- $85\% < \text{DPR} \le 100\%$: Penalti rasio tinggi (-15 poin).
- $30\% \le \text{DPR} \le 70\%$: Rentang optimal & sehat (+15 poin).
- $\text{DPR} < 20\%$: Penalti rasio terlalu kecil (-5 poin).

### 2.3 Tingkat Utang (DER)

- $\text{DER} > 2.5\times$: Penalti beban utang tinggi (-15 poin).
- $\text{DER} < 1.0\times$: Bonus struktur modal sehat (+10 poin).

### 2.4 Rekam Jejak Rutin (Aristocrat Tier)

- $\text{Streak} \ge 10\text{ tahun}$: Dividend Aristocrat BEI (+20 poin).
- $\text{Streak} \ge 5\text{ tahun}$: Konsistensi teruji (+10 poin).
- $\text{Streak} \le 1\text{ tahun} \land \text{Yield} > 8\%$: Waspada windfall sementara (-20 poin).

### 2.5 Proyeksi Run-Rate Pasif 12 Bulan (DVD)

Untuk harga pasar $P$ dan Dividend Yield $Y\%$:

$$\text{Annual DPS} = P \times \frac{Y}{100}$$

$$\text{Tahunan / Lot} = \text{Annual DPS} \times 100$$

$$\text{Bulanan / Lot} = \frac{\text{Tahunan / Lot}}{12}$$

$$\text{Harian / Lot} = \frac{\text{Tahunan / Lot}}{365}$$

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/dividendTrapEngine.js`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.dividendTrap`.
- Komponen visual: `src/components/DividendTrapPanel.jsx`.
- Pengujian otomatis: `tests/dividendTrap.test.js`.

