---
title: "Ringkasan Sistem"
description: "Arsitektur teknologi tingkat tinggi dan komponen utama aplikasi watchlist-saham"
category: "architecture"
tags: ["nextjs", "turbopack", "tailwind", "prisma", "arsitektur"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Ringkasan Sistem

`watchlist-saham` adalah terminal analisis saham dan intelijen portofolio kelas institusi yang dirancang khusus untuk investor dan swing trader di Bursa Efek Indonesia (BEI/IDX).

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi | Keterangan & Konfigurasi |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.1 (App Router) | Menggunakan **Turbopack** untuk kompilasi kilat (<1.2 detik). Mengkombinasikan Server Components dan Route Handlers. |
| **Database ORM** | Prisma 5.x + PostgreSQL | Skema relasional yang dioptimalkan dengan indeks untuk ticker, sektor, dan transaksi pengguna. |
| **Tipografi** | `Plus Jakarta Sans` (`@next/font/google`) | Variabel `--font-sans` dengan tracking rapat (`-0.01em`) dan `tabular-nums` untuk perataan angka finansial. |
| **Styling** | Tailwind CSS 3.4+ | Tema ganda: **Deep Obsidian** (`#070b14`) dan **Crisp Pearl** (`#f8fafc`). |
| **Grafik Saham** | Lightweight Charts + SVG | Grafik candlestick real-time dengan data OHLCV, pita Supertrend, dan garis DEMA. |
| **Efisiensi Token** | Rust Token Killer (`rtk`) | Seluruh perintah terminal dibungkus dengan `rtk` untuk menghemat konsumsi token LLM sekitar 55%. |

---

## 🏛️ Tata Letak & Tampilan Utama

1. **Dashboard Utama (`/`)**:
   - **4-Card Market Cockpit**: Indeks IHSG real-time, Kedalaman Pasar (Dual Progress Bar emiten menguat vs melemah), Likuiditas 3 bulan, dan Rezim Rekomendasi AI.
   - **Pita Rotasi Sektor**: Heatmap 11 sektor BEI dengan badge pendar api (`🔥`) pada 2 sektor terkuat.
   - **Pusat Kendali Strategi**: Tombol horison waktu (`Scalping`, `Daily`, `Swing`) + Pemilihan mode algoritma (`Otomatis`, `Seimbang`, `Pertumbuhan`, `Konservatif`, `Defensif`, `Custom`).
   - **Tabel Peringkat Saham**: Tabel pemindai saham dengan pencarian teks real-time, filter instan (`Skor ≥ 80`, `Sinyal BUY`, `R:R ≥ 2.0`), dan chip level beli/target di tampilan mobile.
2. **Stock Explorer**: Analisis mendalam per emiten, proyeksi Nilai Wajar Graham, breakdown skor Piotroski & Altman, koleksi kustom, dan komposisi pemegang saham.
3. **Stock Screener**: Tab pemindai multi-strategi (Pilihan Utama, Dividen Pasif, Valuasi Murah, Compounder Berkualitas, Potensi Breakout).
4. **Alpha Legends**: Pemindai saham berbasis filosofi investor legendaris dunia yang disesuaikan untuk pasar BEI.
5. **Kalkulator & Tracker Pensiun**: Simulasi alokasi pensiun multi-aset (SBN, Saham, RDPU) menggunakan optimasi portofolio modern dan backprop.
