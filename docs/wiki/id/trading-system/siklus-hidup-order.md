---
title: "Siklus Hidup Order & Pelacakan Win Rate"
description: "Mekanisme antrean beli limit order, pencocokan eksekusi harga pasar, dan perhitungan Win Rate riil"
category: "trading-system"
tags: ["siklus-order", "antri-beli", "win-rate", "risk-reward"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Siklus Hidup Order & Pelacakan Win Rate

Terintegrasi pada berkas `src/app/api/stocks/route.js`, `src/app/api/history/route.js`, dan komponen antarmuka `HistoryPanel.jsx`.

---

## 🔄 Alur 3-Fase Eksekusi Order

Untuk mencegah klaim kemenangan (*WIN*) atau kekalahan (*LOSS*) sebelum saham benar-benar terbeli, sistem menerapkan simulasi antrean order riil:

```
                      [ Input Harga Beli ]
                                │
                ┌──────────────┴──────────────┐
    Checkbox Dicentang              Checkbox Tidak Dicentang (Default)
    (Sudah Beli Riil)               (Simulasi Antri Beli)
                │                               │
                ▼                               ▼
         Status: OPEN                   Status: WAITING_BUY
                │                               │
                │                ┌──────────────┴──────────────┐
                │          Harga pasar turun              Lewat batas waktu
                │        (currentPrice <= entry)          tanpa pernah match
                │                │                               │
                │                ▼                               ▼
                └───────► Status: OPEN (Matched!)          Status: EXPIRED
                                 │                         (Tanpa Penalti Win Rate)
                ┌────────────────┼──────────────────────────────┐
                ▼                ▼                              ▼
      [ currentPrice >= TP ]  [ currentPrice <= SL ]  [ Lewat maxHoldingDays ]
                │                │                      (Evaluasi Time Stop)
                │                │                              │
                │                │                      ┌───────┴───────┐
                │                │                      ▼               ▼
                ▼                ▼                 (P/L >= 0%)      (P/L < 0%)
           Status: WIN      Status: LOSS                │               │
                                                        ▼               ▼
                                                   Status: WIN     Status: LOSS
```

### 1. `WAITING_BUY` (Sedang Antri Beli)
* Diberikan secara default saat pengguna mengeklik tombol **"Pantau"** dengan membiarkan checkbox "Sudah Beli di Harga Ini" **tidak tercentang**.
* Pada fase ini sistem **TIDAK mengevaluasi Win maupun Loss**.
* **Pemicu Match**: Ketika harga pasar harian turun menyentuh atau berada di bawah harga antre beli ($\text{Harga Pasar} \le \text{Harga Antre}$), order otomatis berubah menjadi `OPEN`.
* **Pemicu Batal / Expired**: Jika harga tidak menyentuh level beli hingga batas waktu holding (`maxHoldingDays`: 2–14 hari), status menjadi `EXPIRED`. Posisi ini dikeluarkan dari pembagi Win Rate.

### 2. `OPEN` (Posisi Aktif / Sudah Terbeli)
* Diberikan langsung jika pengguna **mencentang** opsi "Sudah Beli di Harga Ini", atau secara otomatis setelah antrean `WAITING_BUY` match.
* Memulai pemantauan harian terhadap target rencana trading.

### 3. Resolusi Akhir: `WIN` vs `LOSS` (100% Terukur)
Setiap posisi aktif wajib diselesaikan secara tegas agar 100% transaksi terukur di Win Rate:
* **`WIN (TP)`**: $\text{Harga Pasar} \ge \text{Target Price}$ (Target Take Profit tercapai).
* **`LOSS (SL)`**: $\text{Harga Pasar} \le \text{Stop Loss}$ (Batas Cut Loss tersentuh).
* **`WIN (Time)`**: Batas waktu penahanan (*Time Stop*, 2–14 hari) tercapai dan posisi ditutup pada harga pasar dengan hasil $\text{P/L} \ge 0\%$.
* **`LOSS (Time)`**: Batas waktu penahanan (*Time Stop*) tercapai dan posisi ditutup pada harga pasar dengan hasil $\text{P/L} < 0\%$.

### 4. 📢 Notifikasi Real-Time Discord (Semua Transaksi Selesai)
Setiap kali status posisi trading berubah dari `OPEN` menjadi `WIN` atau `LOSS` (baik via TP/SL maupun Time Stop), modul pelacak (`src/lib/recommendationTracker.js`) secara otomatis mengirimkan notifikasi *rich embed* ke channel Discord:
* 🏆 **WIN**: Embed hijau berisi kode saham, harga beli, harga keluar, persentase profit riil (+X%), serta pemicu (`TP` vs `Waktu Habis`).
* 🛑 **LOSS**: Embed merah berisi kode saham, harga beli, harga keluar, persentase cut loss (-X%), serta pemicu (`SL` vs `Waktu Habis`).

---

## 🤖 Pemisahan Sumber Rekomendasi (Sistem vs User)

Untuk memisahkan antara akurasi sinyal bot otomatis dengan pilihan subjektif pengguna, setiap rekomendasi ditandai dengan `source`:
* `source: 'SYSTEM'`: Dibuat otomatis oleh cron rekomendasi harian jam 18:00 WIB (`src/scripts/discord-notifier.js`) untuk setup Scalping, Daily, dan Swing.
* `source: 'USER'`: Ditambahkan secara manual oleh pengguna yang login melalui modal "Pantau" di halaman Analisis Saham.

Dashboard Win Rate (`src/components/HistoryPanel.jsx`) menyajikan kartu KPI perbandingan mandiri:
* **🤖 Bot Discord**: Win rate riil, total transaksi, serta statistik WIN/LOSS/OPEN khusus sinyal algoritma sistem.
* **👤 Pantauan Anda**: Win rate riil dan riwayat transaksi khusus saham pilihan mandiri pengguna.

---

## ⚙️ Mekanisme Evaluasi Status Otomatis (Dual-Trigger)

Status posisi diperbarui secara otomatis menggunakan modul terpadu `src/lib/recommendationTracker.js` melalui dua jalur eksekusi:
1. **Background Daemon Cron (Setiap 5 Menit di Docker)**:
   * Kontainer `watchlist_scraper` mengeksekusi `src/scripts/sync-prices.js` secara berkala setiap 5 menit.
   * Tepat setelah menyimpan harga pasar terbaru dari Yahoo Finance, fungsi `updateExistingRecommendations()` memeriksa seluruh antrean `WAITING_BUY` dan posisi aktif `OPEN`.
   * Berjalan otomatis 24 jam nonstop tanpa perlu interaksi pengguna di browser.
2. **Jalur Akses Web API (On-Demand)**:
   * Setiap kali endpoint `/api/stocks` dipanggil saat pengguna membuka aplikasi web, fungsi evaluasi yang sama dijalankan untuk memastikan kesegaran data (*failsafe*).

---

## 🎯 Rumus Perhitungan Win Rate Riil

$$\text{Win Rate} = \frac{\text{Jumlah Transaksi WIN}}{\text{Jumlah Transaksi WIN} + \text{Jumlah Transaksi LOSS}} \times 100\%$$

*Antrean yang belum match (`WAITING_BUY`) dan antrean yang kedaluwarsa (`EXPIRED`) tidak merusak rasio akurasi win rate.*

---

## 🛡️ Proteksi Win Rate & Kalibrasi Eksekusi (Standar Sistem 2026)

Guna mengeliminasi kerugian sistemik dan melindungi modal portofolio, 4 mekanisme kuantitatif ditegakkan:

### 1. Kunci Posisi Aktif (*Active Position Lockout / Deduplikasi*)
Bot Discord (`src/scripts/discord-notifier.js`) menolak membuat rekomendasi baru bagi emiten yang saat ini masih memiliki posisi aktif `OPEN` atau `WAITING_BUY`. Hal ini mencegah penumpukan posisi rugi berturut-turut pada saham yang sedang mengalami koreksi (contoh kasus: `DSSA` yang sebelumnya terduplikasi 5 kali).

### 2. Plafon Target Take Profit Selaras Gaya Trading
Level resisten *swing high* 20 hari tidak lagi menggelembungkan target harga jangka pendek. Target Take Profit di `src/lib/tradeSetup.js` secara ketat dibatasi oleh durasi simpan:
* **Scalping (1–2 hari)**: Dibatasi maksimal **+5.0%** (`SCALP_MAX_TARGET_PCT`). Target realistis: +2.5% s/d +4.0%.
* **Daily Trading (3–5 hari)**: Dibatasi maksimal **+8.0%** (`DAILY_MAX_TARGET_PCT`). Target realistis: +4.0% s/d +7.0%.
* **Swing Trading (1–3 minggu)**: Dibatasi maksimal **+18.0%** (`SWING_MAX_TARGET_PCT`). Target terjangkar resisten: +8.0% s/d +16.0%.

### 3. Grace Period Buffer pada Time Stop
Pada `src/lib/recommendationTracker.js`, ketika posisi melewati `maxHoldingDays`, posisi **tidak** langsung dipotong rugi jika defisit masih tergolong fluktuasi minor ($\text{PnL} > -1.5\%$, `TIME_STOP_TOLERANCE_LOSS_PCT`). Posisi diberikan **tambahan waktu 3 hari bursa** (`TIME_STOP_GRACE_DAYS`) untuk memberi ruang napas bagi pembalikan arah menuju Take Profit.

### 4. Circuit Breaker Rezim Pasar IHSG
Saat IHSG terdeteksi dalam tren melemah (`detectedMode === 'defensive'`), bot otomatis menangguhkan setup agresif Mode Pertumbuhan, menghapus relaksasi kuota Pass 2 (tidak meloloskan saham ber-skor $< 60$), dan membatasi rekomendasi maksimal 2 emiten defensif terbaik.
