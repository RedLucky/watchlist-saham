# Memulai

> Untuk developer baru. Ganti panduan ini dengan langkah dan command yang sebenarnya (ditulis seperti di AGENTS.md → Commands).

## Singkatnya
Cara menjalankan watchlist-saham di mesin Anda, memastikan semuanya bekerja, dan membuat perubahan pertama.

## Kebutuhan
Tool dan versi yang harus terpasang (runtime, package manager, database, …) serta tooling agent wajib yang tercantum di AGENTS.md.

## Instal dan jalankan
Command yang tepat, berurutan, dari clone baru sampai project berjalan.

## Test
Cara menjalankan test dan seperti apa hasil yang "lolos".

## Hook graph
Kalau AGENTS.md mencantumkan graphify di Required tooling, jalankan `graphify hook install` sekali setelah clone: git hook ada di `.git/` dan tidak ikut di-commit, dan hook ini menjaga graph kode yang ditanyai AI agent tetap mutakhir setiap kali commit. `graphify hook status` menunjukkan apakah hook sudah terpasang.

## Perubahan pertama Anda
Alur kerjanya: rencanakan task, buat perubahan dengan test dan doc comment, perbarui halaman wiki topiknya, lolos Definition of Done, lalu minta persetujuan commit.
