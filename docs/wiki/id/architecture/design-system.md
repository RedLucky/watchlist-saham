---
title: "Design System (Bursa 1985)"
description: "Token warna, tipografi, dan class UI standar untuk tombol, form, badge, alert, tab, modal, dan tabel"
category: "architecture"
tags: ["frontend", "design-system", "tailwind", "theme", "accessibility"]
last_updated: "2026-10-07"
version: "1.0.0"
---

# Design System (Bursa 1985)

**Dalam satu kalimat:** setiap layar dibangun dari sekumpulan kecil nama warna dan class CSS siap pakai di `src/app/globals.css`, sehingga mode terang/gelap dan tampilan keseluruhan tetap konsisten di mana pun.

Alasan tema ini: [ADR 0001](../adr/0001-bursa-1985-design-system.md).

## 1. Token warna

Gunakan nama Tailwind berikut, bukan warna palet (`indigo-600`, `slate-400`, …):

| Token | Dipakai untuk |
| :--- | :--- |
| `bg-canvas` | Latar halaman |
| `bg-surface` | Kartu, panel, modal |
| `bg-sunken` | Header tabel, input, blok redup, hover |
| `border-line` / `border-line-strong` | Garis tipis / garis penegas |
| `text-ink` / `text-muted` | Teks utama / teks sekunder |
| `bg-accent` + `text-on-accent` | Tombol utama, penanda aktif |
| `text-up` / `bg-up-soft` | Harga naik, beli, positif |
| `text-down` / `bg-down-soft` | Harga turun, jual, error |
| `text-warn` / `bg-warn-soft` | Target, peringatan |

**Aturan:** up/down/warn hanya membawa arti — jangan dipakai sebagai hiasan.

## 2. Tipografi

| Class | Font | Dipakai untuk |
| :--- | :--- | :--- |
| `font-sans` (default) | IBM Plex Sans | Teks UI |
| `font-serif` | IBM Plex Serif | Judul halaman dan section |
| `font-mono` | IBM Plex Mono | Harga, ticker, angka, label |

## 3. Class UI standar

| Grup | Class | Catatan |
| :--- | :--- | :--- |
| Judul | `.page-title`, `.section-title`, `.section-subtitle`, `.rule-double` | Satu `.page-title` (h1) per halaman, dengan `.rule-double` di bawahnya |
| Label | `.label-mono` | Label mono kecil kapital (`TARGET BELI`) |
| Panel | `.card` | Panel rata, garis tipis, radius kecil |
| Tombol | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon` | Tinggi min. 36px; `.btn-icon` wajib `aria-label` |
| Form | `.field-label`, `.field-hint`, `.input`, `.select`, `.checkbox` | Selalu hubungkan `<label htmlFor>` ke `id` input; `aria-invalid="true"` menampilkan garis error |
| Badge | `.badge`, `.badge-up`, `.badge-down`, `.badge-warn`, `.badge-outline` | Mono, kecil, tanpa emoji |
| Alert | `.alert`, `.alert-up`, `.alert-down`, `.alert-warn` | Tambahkan `role="alert"` untuk error |
| Tab | `.tabs` + `.tab` | Tab aktif lewat `aria-selected="true"` (tab) atau `aria-pressed="true"` (grup toggle) |
| Modal | `.modal-backdrop`, `.modal-panel`, `.modal-header`, `.modal-body`, `.modal-footer` | Bottom sheet di HP, dialog di tengah mulai 640px; tambahkan `role="dialog" aria-modal="true"` |
| Scroll & tabel | `.scroll-area`, `.table-base` (+ sel `.num`) | Header mono sticky, angka rata kanan |
| Fokus | `.focus-ring` | Fokus keyboard terlihat untuk kontrol kustom |

Ikon berupa simbol Unicode (`▲ ▼ ↻ × ⇅ ◎ …`), tidak pernah emoji berwarna.

## 4. Test penjaga

* `tests/themeTokens.test.js` — kedua tema mendefinisikan token yang sama; warna teks mencapai WCAG AA (4.5:1).
* `tests/designTokens.test.js` — file yang sudah dimigrasi tidak berisi warna palet, gradien, blur kaca, radius besar, warna hex hard-coded, atau emoji berwarna. Tambahkan file ke `MIGRATED_FILES` saat dimigrasi.
