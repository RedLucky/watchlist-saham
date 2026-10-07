---
title: "Kerangka Aplikasi & Navigasi"
description: "Sidebar desktop, header mobile, bar bawah mobile dengan lembar Lainnya, dan footer"
category: "architecture"
tags: ["frontend", "navigation", "mobile", "layout"]
last_updated: "2026-10-07"
version: "1.0.0"
---

# Kerangka Aplikasi & Navigasi

**Dalam satu kalimat:** di komputer menu berupa sidebar di kiri; di HP ada header ramping di atas dan bar bawah berisi 4 halaman utama plus "Lainnya".

Memakai token "Bursa 1985" ([ADR 0001](../adr/0001-bursa-1985-design-system.md)).

| Bagian | File | Tampil di |
| :--- | :--- | :--- |
| Konfigurasi menu & helper | `src/lib/navigation.js` | — |
| Sidebar desktop | `src/components/Navigation/Sidebar.jsx` | `lg` (≥ 1024px) |
| Header mobile | `src/components/Navigation/TopHeader.jsx` | di bawah `lg` |
| Bar bawah mobile + lembar "Lainnya" | `src/components/Navigation/MobileNav.jsx` | di bawah `lg` |
| Kontainer halaman & footer | `src/components/Dashboard.jsx` | semua |

## Konfigurasi menu (`src/lib/navigation.js`)

* `NAVIGATION_MENU` — 2 grup, 11 halaman. Setiap item punya `id`, `label`, `shortLabel` (≤ 10 karakter, untuk bar bawah) dan `icon` Unicode (bukan emoji, jadi mengikuti warna teks).
* `MOBILE_PRIMARY_IDS` — halaman yang dipasang di bar bawah: Analisis, Explorer, Screener, Portofolio.
* `splitMobileNav()` — memisahkan halaman utama dan sisanya (tampil di "Lainnya").
* `findMenuItem(id)` — halaman yang tampil sebagai subjudul di header mobile.
* `hasPreviousMonthKseiData(periods, now)` — apakah data KSEI bulan lalu sudah diunggah. `Dashboard` mengecek sekali setelah login dan meneruskan `kseiWarning` ke sidebar dan bar bawah (lencana "Update" / titik).

Unit test: `tests/navigation.test.js`.

## Sidebar desktop

* Lebar 240px, atau rel ikon 64px setelah klik **« Ciutkan**. Pilihan disimpan di `localStorage` (`sidebar-collapsed`).
* Halaman aktif: latar sunken + garis aksen tipis di kiri, `aria-current="page"`.
* Footer: status sinkronisasi Yahoo Finance dengan tombol sync manual (↻), tombol tema, Refresh, user dan Logout.

## Mobile

* **Header:** 48px, brand + nama halaman yang dibuka + tombol tema.
* **Bar bawah:** 56px + safe area perangkat; 5 tombol sama lebar (ikon 18px, label 10px satu baris, seluruh sel adalah area sentuh). Halaman aktif punya garis aksen di atas.
* **Lembar "Lainnya":** muncul dari bawah berisi 7 halaman lain, link admin KSEI, user dan Logout. Tertutup dengan Escape, tap latar, × atau memilih halaman; fokus pindah ke lembar lalu kembali ke tombol; halaman di belakang tidak ikut scroll.
* Konten halaman diberi padding bawah agar tidak tertutup bar.
