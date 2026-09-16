---
title: "Bloomberg ALRT: Mesin Peringatan Pintar Berbasis Aturan & Trigger Webhook"
description: "Evaluasi otomatis sinyal pasar untuk kedekatan ARA/ARB, valuasi diskon ekstrem, jebakan dividen, dan lonjakan volume tidak wajar."
category: "trading-system"
tags: ["bloomberg", "alrt", "peringatan-pintar", "sinyal-pasar", "discord-webhook", "lonjakan-volume"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg ALRT: Mesin Peringatan Pintar Berbasis Aturan & Trigger Webhook

## 1. Ikhtisar & Rasional Institusional

Pada meja perdagangan institusi (*institutional trading desk*), trader memanfaatkan mesin pemindai sinyal otomatis untuk mendeteksi anomali likuiditas dan peluang valuasi langka secara real-time tanpa perlu memantau ratusan grafik secara manual.

Modul **Bloomberg ALRT (`ALRT <GO>`)** mengevaluasi 4 kondisi krusial:
1. **Kedekatan Batas Auto-Rejection (ARA / ARB)**: Sisa $\le 2$ fraksi harga menuju batas ARA atau ARB, serta status penguncian batas bursa.
2. **Diskon Valuasi Ekstrem PBND**: Nilai Z-Score P/E $\le -1.5\text{SD}$ yang menandai zona akumulasi historis langka.
3. **Peringatan Dividend Trap**: Emiten dengan *dividend yield* tinggi ($\ge 9.0\%$) namun skor kecukupan kas rendah ($< 45$).
4. **Lonjakan Volume Transaksi**: Volume harian melesat $\ge 2.5\times$ di atas rata-rata 5 hari terakhir.

---

## 2. Aturan Evaluasi & Tingkat Kepentingan

| ID Aturan | Tingkat Kepentingan | Kondisi Pemicu | Makna Sinyal |
| :--- | :--- | :--- | :--- |
| **`NEAR_ARA`** | `CRITICAL` / `WARNING` | Sisa fraksi ke ARA $\le 2$ | Momentum beli sangat kuat menuju batas atas |
| **`NEAR_ARB`** | `CRITICAL` / `WARNING` | Sisa fraksi ke ARB $\le 2$ | Tekanan jual ekstrem menuju batas bawah |
| **`VALUATION_DISCOUNT`** | `INFO` | Z-Score P/E $\le -1.5\text{SD}$ | Valuasi emiten berada di pita diskon historis |
| **`DIVIDEND_TRAP`** | `WARNING` | Yield $\ge 9\%$ dan Skor Kas $< 45$ | Risiko penurunan tajam saat Ex-Date |
| **`VOLUME_SPIKE`** | `INFO` | Volume $\ge 2.5\times$ rata-rata 5 hari | Aktivitas akumulasi/distribusi besar |

---

## 3. Detail Implementasi

- Mesin evaluasi murni: `src/lib/smartAlertEngine.js`.
- Pustaka pemformatan Discord: `formatDiscordAlertEmbed`.
- Integrasi API: Disematkan di `GET /api/stocks/[ticker]` sebagai `stockDetail.smartAlerts`.
- Tampilan antarmuka: Banner notifikasi langsung pada `src/components/AutoRejectionLadderPanel.jsx`.
- Pengujian otomatis: `tests/smartAlert.test.js`.

