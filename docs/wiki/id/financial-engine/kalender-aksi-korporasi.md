---
title: "Bloomberg CA: Kalender Aksi Korporasi & Katalis Pasar"
description: "Mesin jadwal dan hitung mundur dividen tunai, agenda RUPS tahunan/luar biasa, serta jendela musim rilis laporan keuangan berkala."
category: "financial-engine"
tags: ["bloomberg", "ca", "aksi-korporasi", "kalender-katalis", "rups", "rilis-lk", "dividen"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg CA: Kalender Aksi Korporasi & Katalis Pasar

## 1. Ikhtisar & Rasional Institusional

Pada pasar modal, pergerakan harga saham dan re-rating valuasi paling sering dipicu oleh agenda aksi korporasi (*corporate events*) daripada fluktuasi teknikal semata. Fitur **Bloomberg CA (`CA <GO>`)** menyediakan kalender komprehensif bagi pemodal institusi untuk memantau katalis utama:
1. **Jadwal Dividen Tunai**: Tanggal pembayaran, besaran per lembar saham, dan status jatuh tempo.
2. **Rapat Umum Pemegang Saham (RUPS / RUPST / RUPSLB)**: Penentu persetujuan dividen tahunan, restrukturisasi modal, dan perubahan manajemen.
3. **Musim Rilis Laporan Keuangan Berkala**: Estimasi jendela pelaporan resmi menurut regulasi BEI dan OJK (Tahunan FY, Q1, Q2, dan Q3).

---

## 2. Sintesis Agenda & Aturan Kalender

### 2.1 Dividen Tunai
- Sumber: Riwayat dan pengumuman pembagian dividen emiten.
- Logika Hitung Mundur:
  - $\Delta_{\text{hari}} = \text{Tanggal Agenda} - \text{Hari Ini}$
  - Klasifikasi status: "Mendatang" (hijau) atau "Terealisasi" (abu-abu).

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

- Mesin kalkulasi murni: `src/lib/corporateActionEngine.js`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.corporateActions`.
- Komponen visual: `src/components/CorporateActionsPanel.jsx`.
- Pengujian otomatis: `tests/corporateAction.test.js`.
