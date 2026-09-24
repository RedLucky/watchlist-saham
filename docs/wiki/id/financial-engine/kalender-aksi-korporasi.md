---
title: "Bloomberg CA: Kalender Aksi Korporasi & Jadwal Dividen BEI"
description: "Mesin jadwal dan hitung mundur 4 tanggal keramat dividen (Cum, Ex, DPS, Pembayaran), serta riwayat pembagian dividen multi-tahun emiten BEI."
category: "financial-engine"
tags: ["bloomberg", "ca", "aksi-korporasi", "kalender-katalis", "rups", "rilis-lk", "dividen", "cum-date", "ex-date"]
last_updated: "2026-09-24"
version: "2.0.0"
---

# Bloomberg CA: Kalender Aksi Korporasi & Jadwal Dividen BEI

## 1. Ikhtisar & Rasional Institusional

Pada pasar modal, pergerakan harga saham dan rotasi likuiditas paling sering dipicu oleh agenda aksi korporasi (*corporate events*) nyata daripada fluktuasi teknikal semata. Fitur **Bloomberg CA (`CA <GO>`)** menyediakan kalender terpadu bagi pemodal institusi dan ritel untuk memantau katalis utama:
1. **4 Tanggal Keramat Dividen Resmi BEI**:
   - **Cum Date**: Hari bursa terakhir untuk membeli saham agar berhak memperoleh dividen.
   - **Ex Date**: Hari pertama perdagangan saham tanpa hak dividen (harga saham lazim terkoreksi).
   - **Recording Date (DPS)**: Waktu resmi penentuan daftar pemegang saham terdaftar di KSEI (Pukul 16:00 WIB).
   - **Payment Date**: Tanggal pencairan dana dividen kas langsung ke rekening dana nasabah (RDN).
2. **Rekam Jejak Riwayat Dividen Multi-Tahun**: Kompilasi riwayat pembagian dividen multi-tahun yang dideduplikasi dari keterbukaan informasi profil emiten BEI dan aksi korporasi Yahoo Finance.
3. **Rapat Umum Pemegang Saham (RUPS / RUPST / RUPSLB)**: Penentu pengesahan rasio dividen (*dividend payout ratio*), laba ditahan, dan perubahan susunan direksi/komisaris.
4. **Musim Rilis Laporan Keuangan Berkala**: Estimasi jendela pelaporan resmi menurut regulasi BEI dan OJK (Tahunan FY, Q1, Q2, dan Q3).

---

## 2. Sintesis Agenda & Aturan Kalender

### 2.1 Jadwal Dividen Tunai & Resolusi Nilai DPS
- **Sumber Data**: Keterbukaan informasi resmi BEI (`StockData.dividendHistory`) dipadukan dengan riwayat historis Yahoo Finance (`StockData.fundamentals.yahooDividendHistory`).
- **Hirarki Resolusi DPS (Nilai Dividen per Lembar Saham)**:
  1. Utama: `div.CashDividenPerSaham` (data nominal resmi dari BEI).
  2. Derivasi Matematis: Jika `CashDividenPerSaham == 0` namun terdapat `CashDividenTotal > 0` dan `sharesOutstanding > 0`, hitung $\text{DPS} = \frac{\text{CashDividenTotal}}{\text{sharesOutstanding}}$.
  3. Pencocokan Jendela Waktu: Jika tidak tersedia, padankan dengan riwayat Yahoo Finance terdekat dalam toleransi jendela 15 hari.
  4. Cadangan Statis: `fundamentals.dividendRate`.
- **Siklus Hidup & Status Jadwal**:
  - `CUM_ACTIVE` ($\text{Hari Ini} \le \text{Cum Date}$): Investor masih berhak dividen jika membeli hingga batas Cum Date.
  - `WAITING_PAYMENT` ($\text{Cum Date} < \text{Hari Ini} \le \text{Payment Date}$): Hak dividen terkunci; menunggu pencairan dana ke RDN.
  - `COMPLETED` ($\text{Hari Ini} > \text{Payment Date}$): Seluruh dana dividen telah selesai disalurkan.

### 2.2 Estimasi Musim Rilis Laporan Keuangan (Ketentuan BEI / OJK)

| Periode Laporan | Batas Waktu Regulasi | Jendela Pasar Lazim |
| :--- | :--- | :--- |
| **Tahunan (FY Audit)** | Akhir bulan ke-3 (90 hari) | Maret – April |
| **Kuartal I (Q1)** | Akhir bulan ke-4 / ke-5 | Mei – Juni |
| **Kuartal II (Q2 / Interim)** | Akhir bulan ke-7 / ke-8 | Juli – Agustus |
| **Kuartal III (Q3 / 9M)** | Akhir bulan ke-10 / ke-11 | Oktober – November |

### 2.3 Musim RUPS Tahunan
- Musim reguler RUPST di Indonesia berlangsung padat pada rentang bulan **April hingga Juni** setiap tahunnya setelah laporan keuangan tahunan diaudit.

---

## 3. Detail Implementasi

- Mesin kalkulasi murni: `src/lib/corporateActionEngine.js` (`parseDividendScheduleItem`, `compileHistoricalDividends`, `buildCorporateActionsTimeline`).
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai:
  - `stockDetail.corporateActions`: Array event timeline katalis.
  - `stockDetail.dividendSchedule`: Objek terstruktur 4 tanggal dividen aktif/terkini.
  - `stockDetail.historicalDividends`: Daftar kronologis pembagian dividen multi-tahun.
  - `stockDetail.dividendSummary`: Ringkasan metrik dividen (yield, DPR, streak).
- Komponen visual: `src/components/CorporateActionsPanel.jsx` (antarmuka 3 tab interaktif: Stepper 4 Tanggal Terkini, Tabel Riwayat Multi-Tahun, dan Agenda RUPS/LK).
- Integrasi tampilan detail: `src/components/StockExplorer.jsx` (kartu ikhtisar dividen terakhir dan panel aksi korporasi).
- Pengujian otomatis: `tests/corporateAction.test.js`.
