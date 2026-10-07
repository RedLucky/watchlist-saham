# 0001. Design system "Bursa 1985" dengan token warna semantik
- Status: accepted
- Date: 2026-10-07
- Reference: TASK-7314

## Konteks
UI memakai class warna Tailwind mentah di mana-mana (~6.400 pemakaian `indigo`, `blue`, `sky`, `cyan`, `slate`, …), ditambah gradien, efek blur kaca, dan kartu dengan sudut sangat bulat. Pemilik aplikasi merasa tampilan ini generik ("seperti buatan AI"), dan mode terang butuh override `!important` di `globals.css` agar tetap terbaca. Mengganti tema berarti mengubah setiap komponen. Aplikasi juga harus nyaman di mobile serta di mode terang dan gelap.

## Opsi yang dipertimbangkan
1. **Tetap pakai class palet, cukup ganti warna per komponen.** Tidak ada konsep baru, tetapi tema tetap tersebar di 50 file, dan perubahan berikutnya sama mahalnya.
2. **Retro neon / cyberpunk ("Retro-Futurism" ui-ux-pro-max).** Khas, tetapi glow neon, scanline, dan efek glitch sulit dibaca untuk angka keuangan, dan library-nya sendiri menandai risiko aksesibilitas tinggi.
3. **"Bursa 1985" (retro halus) dengan token semantik.** Mode terang seperti halaman harga saham di koran keuangan ("Kertas Bursa": kertas krem, tinta hitam); mode gelap seperti terminal trading generasi awal ("Terminal Fosfor": hitam hangat, fosfor amber). Warna didefinisikan sekali sebagai variabel CSS dan diekspos sebagai nama Tailwind yang menjelaskan peran, bukan warna.

## Keputusan
Opsi 3.

* Token ada di `src/app/globals.css`: variabel `--c-*` di `:root` (terang) dan `.dark` (gelap), diekspos lewat `@theme inline` sebagai warna Tailwind: `canvas`, `surface`, `sunken`, `line`, `line-strong`, `ink`, `muted`, `accent`, `on-accent`, `up`, `down`, `warn` (+ latar `*-soft`) dan `focus`.
* **Hijau / merah / oker hanya untuk arti harga** (naik, turun, target/peringatan) — tidak pernah untuk hiasan. Mode terang tidak punya aksen berwarna (tombol utama hitam tinta); mode gelap memakai amber sebagai satu-satunya aksen.
* Tipografi: IBM Plex Sans (teks UI), IBM Plex Serif (judul halaman), IBM Plex Mono (harga, ticker, label kecil kapital), dimuat dengan `next/font/google` → `font-sans`, `font-serif`, `font-mono`.
* Bentuk: panel rata, garis tipis, radius kecil (`rounded-sm`), tanpa gradien, tanpa blur kaca, tanpa glow. Blok dasar: `.card`, `.label-mono`, `.rule-double`, `.btn-primary`, `.btn-secondary`, `.focus-ring`.
* Ikon: simbol Unicode menggantikan emoji (tanpa dependency baru).
* Kunjungan pertama mengikuti tema perangkat (`defaultTheme="system"`).
* `tests/themeTokens.test.js` memastikan kedua tema mendefinisikan token yang sama dan warna teks mencapai WCAG AA (4.5:1).

## Konsekuensi
* Setiap komponen harus dimigrasi dari class palet ke token; dilakukan per area (TASK-2958 … TASK-4458). Sampai selesai, tampilan halaman akan campur.
* Override `!important` mode terang yang lama tetap ada sampai pembersihan akhir (TASK-7761), agar halaman yang belum dimigrasi tetap kontras.
* Perubahan tema ke depan cukup di `globals.css`.
* Warna baru harus ditambahkan sebagai token di kedua tema (jika tidak, test gagal).
