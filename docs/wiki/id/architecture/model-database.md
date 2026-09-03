---
title: "Model Database & Skema Prisma"
description: "Model-model database PostgreSQL, relasi tabel, dan aturan penanganan BigInt"
category: "architecture"
tags: ["prisma", "postgresql", "bigint", "skema-database"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Model Database & Skema Prisma

Aplikasi menggunakan database PostgreSQL yang dikelola melalui Prisma ORM pada berkas `prisma/schema.prisma`.

---

## 🗄️ Model-Model Inti

### 1. `StockData`
Tabel utama yang menyimpan seluruh data emiten saham di Indonesia:
* `ticker`: Kode saham tanpa akhiran `.JK` (misal: `BBRI`, `TLKM`).
* `name`, `sector`, `subSector`: Klasifikasi Industri BEI.
* `price`, `changePercent`: Harga terkini dan persentase perubahan harian.
* `volume`, `avgVolume3mo`, `turnover`: Angka bertipe BigInt yang wajib disanitasi ke Number sebelum dikirim ke browser.
* `fundamentals`: Objek JSON berisi rasio finansial lengkap.
* `technicals`: Objek JSON berisi deret indikator teknikal (RSI, DEMA, Supertrend, Volume).
* `kseiLatest`, `kseiHistory`: Data histori kepemilikan efek dari KSEI.

### 2. `Recommendation`
Tabel pencatatan rekam jejak sinyal dan saham yang dipantau pengguna:
* `priceAtRecommend`: Harga saat sinyal keluar atau harga antre beli yang dimasukkan pengguna.
* `targetPrice`: Target Jual / Take Profit (TP).
* `stopLoss`: Batas Cut Loss (SL).
* `status`:
  - `WAITING_BUY`: Antri Beli. Harga pasar belum menyentuh level beli.
  - `OPEN`: Posisi Aktif. Order sudah *matched* atau pengguna mencentang "Sudah Beli".
  - `WIN`: Harga menyentuh atau melampaui Target TP.
  - `LOSS`: Harga jatuh menyentuh batas Stop Loss.
  - `EXPIRED`: Antrean batal otomatis karena lewat batas hari tanpa pernah tersentuh.
  - `CLOSED`: Posisi ditutup pada harga pasar saat batas waktu holding habis.

### 3. `Collection` & `CollectionItem`
Menyimpan daftar pantauan kustom pengguna lengkap dengan catatan pribadi dan target beli/jual mandiri.

### 4. `Portfolio` & `Transaction`
Mencatat portofolio simulasi atau riil pengguna dengan perhitungan harga rata-rata (*average price*) dan lot.

### 5. `PensionRecord` & `User`
Mengelola sesi autentikasi dan alokasi perencanaan dana pensiun multi-aset (SBN, Saham, RDPU).
