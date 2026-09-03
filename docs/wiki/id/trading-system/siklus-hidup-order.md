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
                ┌────────────────┴────────────────┐
                ▼                                 ▼
        [ currentPrice >= TP ]            [ currentPrice <= SL ]
                │                                 │
                ▼                                 ▼
            Status: WIN                       Status: LOSS
```

### 1. `WAITING_BUY` (Sedang Antri Beli)
* Diberikan secara default saat pengguna mengeklik tombol **"Pantau"** dengan membiarkan checkbox "Sudah Beli di Harga Ini" **tidak tercentang**.
* Pada fase ini sistem **TIDAK mengevaluasi Win maupun Loss**.
* **Pemicu Match**: Ketika harga pasar harian turun menyentuh atau berada di bawah harga antre beli ($\text{Harga Pasar} \le \text{Harga Antre}$), order otomatis berubah menjadi `OPEN`.
* **Pemicu Batal / Expired**: Jika harga tidak menyentuh level beli hingga batas waktu holding (`maxHoldingDays`: 3–14 hari), status menjadi `EXPIRED`. Posisi ini dikeluarkan dari pembagi Win Rate.

### 2. `OPEN` (Posisi Aktif / Sudah Terbeli)
* Diberikan langsung jika pengguna **mencentang** opsi "Sudah Beli di Harga Ini", atau secara otomatis setelah antrean `WAITING_BUY` match.
* Memulai pemantauan harian terhadap target rencana trading.

### 3. `WIN` vs `LOSS` vs `CLOSED`
* **`WIN`**: $\text{Harga Pasar} \ge \text{Target Price}$ (Target Take Profit tercapai).
* **`LOSS`**: $\text{Harga Pasar} \le \text{Stop Loss}$ (Batas Cut Loss tersentuh).
* **`CLOSED`**: Posisi ditutup pada harga pasar karena melewati batas maksimal penahanan (*Time Stop*).

### 4. 📢 Notifikasi Real-Time Discord (Hanya WIN & LOSS)
Setiap kali status posisi trading berubah dari `OPEN` menjadi `WIN` atau `LOSS`, modul pelacak (`src/lib/recommendationTracker.js`) secara otomatis mengirimkan notifikasi *rich embed* ke channel Discord yang terhubung:
* 🏆 **WIN**: Embed hijau berisi kode saham, nama emiten, harga beli, harga keluar, persentase profit riil (+X%), target TP, gaya trading, serta sumber (`🤖 Sistem` vs `👤 User`).
* 🛑 **LOSS**: Embed merah berisi kode saham, nama emiten, harga beli, harga keluar, persentase cut loss (-X%), level SL, gaya trading, dan sumber.
* *Catatan: Transisi status `WAITING_BUY`, `OPEN`, `EXPIRED`, maupun `CLOSED` tidak dikirim ke Discord demi mencegah spam notifikasi.*

---

## 🎯 Rumus Perhitungan Win Rate Riil

$$\text{Win Rate} = \frac{\text{Jumlah Transaksi WIN}}{\text{Jumlah Transaksi WIN} + \text{Jumlah Transaksi LOSS}} \times 100\%$$

*Antrean yang belum match (`WAITING_BUY`) dan antrean yang kedaluwarsa (`EXPIRED`) tidak merusak rasio akurasi win rate.*
