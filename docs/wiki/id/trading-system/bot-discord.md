---
title: "Bot Interaktif Discord & Sistem Notifikasi"
description: "Arsitektur bot interaktif Discord dua arah dengan ekstraksi ticker alami (NLP), kebijakan cache pintar 30 hari, format visual rich embed, dan webhook peringatan transaksi satu arah."
category: "trading-system"
tags: ["bot-discord", "nlp", "ekstraksi-ticker", "cache", "rich-embed", "webhook"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bot Interaktif Discord & Sistem Notifikasi

## 1. Ikhtisar

Platform ini mendukung dua mode interaksi dengan Discord:
1. **Pemberitahuan Satu Arah via Webhook (`src/scripts/discord-notifier.js`)**: Mengirimkan rangkuman saham pilihan pagi hari, serta peringatan real-time saat posisi transaksi mencapai `WIN (TP)`, `LOSS (SL)`, atau `Time Stop`.
2. **Bot Interaktif Dua Arah (`src/scripts/discord-bot.js`)**: Bot asisten cerdas berbasis `discord.js` v14 yang aktif memantau pesan di channel tertentu (misalnya `#bot-saham`), mengekstrak kode saham dari kalimat sehari-hari, memberikan harga live, dan menjalankan riset mendalam berbasis AI lokal.

---

## 2. Ekstraksi Kode Saham & Bahasa Alami (NLP)

Bot dilengkapi dengan modul parser mandiri (`parseStockQuery`) yang mampu mengenali kode saham 4 huruf BEI dari bahasa percakapan informal tanpa memerlukan awalan perintah kaku (seperti `!analisa` atau `/saham`):

- **Contoh Pola Kalimat Percakapan**:
  - *"tolong cek harga elsa sekarang dan analisamu apa?"* $\rightarrow$ Ticker: `ELSA`, Maksud: `analisa`
  - *"analisa itic dong"* $\rightarrow$ Ticker: `ITIC`, Maksud: `analisa`
  - *"gimana prospek bbri?"* $\rightarrow$ Ticker: `BBRI`, Maksud: `analisa`
  - *"harga tlkm berapa?"* $\rightarrow$ Ticker: `TLKM`, Maksud: `harga`
  - *"analisa ulang asii"* $\rightarrow$ Ticker: `ASII`, Maksud: `analisa`, Force Refresh: `true`

- **Penyaringan Kata Mirip (Anti False-Positive)**: Kata umum 4 huruf dalam Bahasa Indonesia (seperti `DONG`, `BISA`, `PADA`, `SAYA`, `KITA`, `BAGI`, `HARI`, `DARI`, `MAKA`, `LAGI`) disaring menggunakan daftar hitam kata (*blacklist*) agar tidak keliru dianggap sebagai kode saham.

---

## 3. Kebijakan Cache Pintar 30 Hari

Mengingat inferensi model lokal GGUF pada CPU memerlukan waktu 15–40 detik, bot menerapkan aturan **cache pintar 30 hari**:

1. **Cache Hit (< 30 Hari)**: Jika emiten telah dianalisis oleh AI dalam kurun waktu kurang dari 30 hari (dan pengguna tidak meminta *"analisa ulang"*), bot langsung membalas dalam waktu sangat cepat (< 2 detik) menyajikan harga real-time terkini beserta hasil riset AI yang sudah tersimpan di `AiStockResearch`.
2. **Cache Kadaluarsa (> 30 Hari) / Paksa Ulang**: Bot segera mengirim pesan status awal (*"⏳ Sedang melakukan riset AI untuk [TICKER]..."*), mengagregasi berita keuangan terkini dari Bing/Google RSS, menjalankan inferensi `llama.cpp`, memperbarui database `AiStockResearch`, mencatat log performa ke `AiAuditLog`, lalu memperbarui (*edit*) pesan awal menjadi tampilan Rich Embed yang lengkap.

---

## 4. Visualisasi Rich Embed Discord

Hasil analisis ditampilkan menggunakan komponen `EmbedBuilder` dengan standarisasi visual:
- **Warna Aksen**:
  - 🟢 Hijau Zamrud (`0x10B981`) untuk rekomendasi `BELI`
  - 🔴 Merah Crimson (`0xEF4444`) untuk rekomendasi `JUAL`
  - 🟡 Kuning Amber (`0xF59E0B`) untuk rekomendasi `TAHAN`
- **Bagian Informasi**:
  - **Ringkasan Pasar**: Harga Terkini, Perubahan Harian (%), Volume.
  - **Valuasi & Target**: Nilai Wajar Graham, Margin of Safety (%), Rasio Risk/Reward.
  - **Indikator Teknikal**: Wilder's RSI, Sinyal Supertrend, Status MACD.
  - **Intisari AI**: Tesis investasi, katalis penggerak harga, dan mitigasi risiko.
  - **Footer**: Identitas model AI, stempel waktu, dan status umur cache.
