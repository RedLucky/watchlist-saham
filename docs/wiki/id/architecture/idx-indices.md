---
title: "Keanggotaan Indeks IDX"
description: "Lima indeks BEI yang dilacak, cara data anggota diambil dari IDX, dan labelnya di seluruh aplikasi"
category: "architecture"
tags: ["idx", "indeks", "lq45", "issi", "syariah", "scraper", "backend", "frontend"]
last_updated: "2026-10-07"
version: "1.0.0"
---

# Keanggotaan Indeks IDX

**Dalam satu kalimat:** aplikasi tahu saham mana saja yang masuk LQ45, IDX30, IDX Value 30, High Dividend 20, dan ISSI (Syariah), lalu menampilkan label kecil itu di mana pun saham muncul.

*Untuk pemula:* IDX menerbitkan beberapa "indeks" — daftar saham pilihan dengan aturan tertentu. LQ45 berisi 45 saham dengan kapitalisasi besar dan likuiditas tinggi; IDX30 berisi 30 perusahaan besar yang fundamentalnya baik; IDX Value 30 berisi 30 saham yang valuasinya murah; High Dividend 20 berisi 20 saham dengan dividen tertinggi; ISSI berisi saham yang memenuhi prinsip investasi syariah. Halaman ini menjelaskan bagaimana aplikasi mengetahui keanggotaan itu, dan bagaimana labelnya ditampilkan.

*Untuk pengembang berpengalaman:* data anggota diambil dari IDX ke dua tabel Prisma (`IdxIndex`, `IdxConstituent`) oleh `src/scripts/sync-indices.js`, dibaca lewat `/api/indices` dan `/api/indices/[code]`, dan bisa diganti manual lewat `POST /api/indices` bila scraper tidak bisa jalan. Label dirender oleh `src/components/IndexBadges.jsx`, yang mengambil peta ticker → kode indeks tepat satu kali per sesi browser.

## Lima indeks yang dilacak

| Kode | Nama | Arti |
| :--- | :--- | :--- |
| `LQ45` | LQ45 | 45 saham dengan kapitalisasi besar dan likuiditas tertinggi |
| `IDX30` | IDX30 | 30 perusahaan berkapitalisasi besar, likuid, fundamental baik |
| `IDXVALUE30` | IDX Value 30 | 30 saham yang relatif murah dibanding sektor sejenis |
| `HIDV20` | High Dividend 20 | 20 saham dengan dividen kas tertinggi dan konsisten |
| `ISSI` | ISSI (Syariah) | Saham yang memenuhi prinsip pengelolaan dana syariah |

Kelima kode di atas adalah sumber kebenaran tunggal: `TRACKED_INDEX_CODES` di `src/lib/idxIndices.js` menentukan apa yang diambil scraper dan apa yang diterima unggahan admin.

### Mengapa ISSI tetap berupa label

Saham yang tercatat di BEI **tidak otomatis** masuk ISSI. Hanya perusahaan yang bisnis dan laporan keuangannya lolos penyaringan halal yang dimasukkan, jadi label ini benar-benar informatif — sama seperti empat indeks lainnya.

## Bagaimana data masuk (scraper, dengan cadangan manual)

`sync-indices.js` memakai Puppeteer dengan konfigurasi yang sama seperti `sync-ksei.js` (flag `--no-sandbox` dan pencarian `PUPPETEER_EXECUTABLE_PATH` yang sama).

```bash
node src/scripts/sync-indices.js
```

Dua sifat aman yang sengaja dibuat:

1. **Indeks yang gagal tidak menghapus data lama.** Kalau sebuah indeks tidak menghasilkan anggota, script hanya memberi peringatan dan membiarkan keanggotaan lama tetap ada. Indeks yang kosong lebih buruk daripada indeks basi, karena yang kosong terlihat benar.
2. **Setiap indeks disimpan terpisah**, jadi perubahan tata letak satu halaman IDX tidak bisa menghapus empat indeks lainnya.

Karena IDX menilai ulang keanggotaan beberapa kali setahun, yang penting bukan Soal tanggal persisnya, tapi seberapa tua datanya. `isStaleSync()` menganggap data yang lebih tua dari `STALE_AFTER_DAYS` (60 hari) sebagai basi, dan antarmuka mengatakannya secara terbuka daripada diam-diam menyajikan data lama sebagai data terkini.

### Scraper tidak lagi berfungsi — dan alasannya

IDX memindahkan halaman tersebut ke balik proteksi bot. Hasil pengukuran dari repo ini, per2026-10-07:

| Permintaan | Hasil |
| :--- | :--- |
| `idx.co.id/idx-data/idx-stock-composition` (URL lama) | 503 lewat browser headless sungguhan, 403 lewat curl |
| `idx.co.id/primary/Index/GetIndexConstituent` (API JSON lama) | 302 → halaman 404 |
| `idx.co.id/StaticData/.../BEI.POP_*.zip` (file pengumuman) | 403 |

Endpoint yang lebih baru memang ada — `idx.co.id/secondary/get/StockData/GetStockUploader` — dan
ia sempat mengembalikan JSON valid (LQ45: 4 record, ISSI: 7) saat dipanggil dari dalam halaman
browser yang sudah terbuka. Tapi Cloudflare memblokirnya pada permintaan berikutnya, sehingga tidak
bisa diandalkan tanpa pengawasan.

Dua akibat yang perlu diingat: endpoint itu mengembalikan **file ZIP pengumuman**, bukan ticker,
jadi masih ada langkah unduh-dan-parse; dan `sync-indices.js` harus tetap memakai perilakunya "data
lama tidak pernah dihapus saat gagal", karena URL-nya sudah mati dan sekarang akan mencatat
`0 anggota ditemukan` di setiap jadwal.

### Dua hal yang sengaja tidak dilakukan halaman ini

- **Tidak ada kolom skor komposit.** `StockData` tidak punya kolom `score`; skor komposit dihitung
  on-the-fly dari JSON `fundamentals` dan `technicals` (lihat `/api/screener`). Menghitungnya
  ulang di sini akan menggandakan bobot itu dan membuat dua halaman menyimpang, jadi tabel indeks
  hanya menampilkan keanggotaan dan data pasar. Skornya tersedia di halaman analisis.
- **Tidak ada field admin key.** Menambah dan menghapus anggota memakai cookie sesi yang sedang
  login. Mengetik key di setiap halaman hanya menambah friksi tanpa manfaat; input key hanya ada
  di halaman unggah massal, yang merupakan pintu masuk admin.

### Seed file adalah sumber sebenarnya

`src/data/idxMembers.seed.json` memuat keanggotaan yang sudah diverifikasi manusia, diterapkan oleh:

```bash
node src/scripts/seed-indices.js
```

Setiap entri mencatat `effectiveFrom` (kapan IDX menerbitkannya), `source`, `verifiedOn`, dan
`verifiedFrom` (halaman mana yang dipakai untuk mencocokkan), sehingga pembaca review bisa melihat
asal setiap ticker alih-alih percaya begitu saja. Menjalankan ulang aman; ia mengganti daftar
anggota tiap indeks yang ada di seed.

Pada saat dokumen ini ditulis hanya LQ45 dan IDX30 yang terisi. IDX Value 30, High Dividend 20, dan
ISSI **tidak** diisi: daftar resminya berada di PDF
[Fact Sheet Indeks](https://www.idx.co.id/id/data-pasar/laporan-statistik/fact-sheet-indeks) bulanan
di domain terlindungi yang sama, dan tidak ada satu pun daftar yang dimasukkan tanpa sumber yang
bisa diverifikasi.

### Cadangan manual

`POST /api/indices` (khusus admin, memakai `verifyAdminAccess` seperti ingest KSEI) menerima teks yang ditempel lalu mengganti keanggotaan yang tersimpan. Formatnya satu ticker per baris, atau `KODE_INDEKS<tab atau koma>TICKER` untuk memperbarui beberapa indeks sekaligus. Indeks kemudian ditandai `source = "upload"` supaya antarmuka bisa membedakan daftar dari manusia dengan hasil scraper.

`parseMembershipText()` memvalidasi setiap baris dan gagal keras dengan menyebutkan baris yang bermasalah, bukan membuangnya diam-diam — indeks yang tersimpan separuh hasil adalah hasil terburuk.

## Model data

```prisma
model IdxIndex {
  code          String   @id      // "LQ45"
  name          String            // nama tampilan
  description   String?
  effectiveFrom DateTime?         // saat IDX merilis keanggotaan ini
  lastSyncedAt  DateTime          // saat terakhir diambil atau diunggah
  memberCount   Int
  source        String            // "scrape" | "upload"
  constituents  IdxConstituent[]
}

model IdxConstituent {
  indexCode String
  index     IdxIndex @relation(...)
  ticker    String
  position  Int?     // peringkat dalam indeks bila diketahui
  @@unique([indexCode, ticker])
}
```

Dua tabel, bukan satu JSON di `StockData`, karena pertanyaan utamanya adalah "siapa anggota LQ45?", bukan "saham apa saja indeks BBCA?".

## API

| Rute | Metode | Mengembalikan |
| :--- | :--- | :--- |
| `/api/indices` | GET | `{ indices: [...], byTicker: { BBCA: ['IDX30','LQ45'] } }` |
| `/api/indices` | POST | Unggahan admin; body `{ defaultIndex, text }` |
| `/api/indices/[code]` | GET | Satu indeks beserta anggotanya, dilengkapi harga, perubahan, dan skor dari `StockData` |
| `/api/indices/[code]` | POST | Admin; menambah satu ticker (`{ ticker }`) |
| `/api/indices/[code]` | DELETE | Admin; menghapus satu ticker (`?ticker=BBCA`) |

### Mengubah keanggotaan dari halaman

Halaman Indeks BEI adalah tempat keanggotaan dikelola, bukan hanya dibaca:

- Field admin key dan field ticker menambah satu saham ke indeks yang dipilih.
- Setiap baris punya tombol `Hapus` untuk mengeluarkan saham itu dari indeks.
- Kedua aksi memakai `src/lib/idxStore.js`, yang memvalidasi kode dan ticker *sebelum* menyentuh
  database, jadi salah ketik tidak pernah sampai ke Prisma.
- Menambah saham yang sudah jadi anggota tidak melakukan apa-apa dan sengaja **tidak** menandai
  `lastSyncedAt` baru: menambahkan ulang karena tidak sengaja tidak boleh membuat daftar basi terlihat
  baru saja diverifikasi.
- Setelah setiap perubahan, cache label dibuang lewat `invalidateIndexCache()`, kalau tidak label
  di halaman lain akan tetap menampilkan keanggotaan dari sebelum perubahan.

Halaman unggah massal `/admin/indeks` ditautkan dari header halaman, karena mengetik 200 ticker
ISSI satu per satu jelas tidak realistis.

`byTicker` ada supaya tabel berisi 50 baris hanya butuh satu permintaan, bukan 50. Setiap anggota juga melaporkan `tracked`, yang bernilai false bila anggota indeks itu tidak ada di database kita — halaman lalu menunjukkan berapa bagian indeks yang benar-benar bisa dianalisis.

## Halaman Indeks BEI

Menu baru (`indices`) di antara Stock Screener dan Alpha Legends, memakai `src/components/IndexDirectory.jsx`:

- Satu `StatCard` per indeks berisi jumlah anggota, waktu pembaruan, dan tanda basi; klik kartu untuk memilih indeks.
- Di bawahnya, tabel anggota: peringkat, ticker, sektor, harga, perubahan, skor komposit, dan label indeks milik saham itu sendiri.
- Kalau belum ada anggota yang tersinkron, halaman menjelaskan cara menjalankan script atau mengunggah daftar — tidak pernah terlihat seperti "indeks ini kosong".

## Label di halaman lain

`src/components/IndexBadges.jsx` mengekspor dua komponen, sama-sama berbagi satu promise tingkat modul sehingga peta indeks hanya diambil satu kali per sesi browser:

- `IndexBadgeList` — dipakai di dalam tabel dan kartu; menerima array ticker.
- `IndexBadges` — varian untuk satu ticker.

Label sengaja dibuat ringkas: maksimal `max` chip (1 atau 2 tergantung pemanggilannya) ditambah penghitung `+N`, dengan daftar lengkap di tooltip. Saham yang masuk empat indeks kalau tidak begitu akan membuat baris melebar dan merusak tata letak. Komponen menampilkan skeleton sampai peta tiba supaya baris tidak melompat.

Terpasang di: Analisis Saham (`StockTable`), kartu koleksi Stock Explorer, hasil Stock Screener (tampilan kisi dan daftar), tabel posisi Portofolio, baris Market Movers, dan tabel anggota di halaman Indeks BEI itu sendiri.

## Pemecahan masalah

| Gejala | Penyebab | Perbaikan |
| :--- | :--- | :--- |
| Semua label hilang | Migrasi belum diterapkan, jadi tabel `IdxIndex` belum ada | `npx prisma migrate deploy` |
| Halaman bilang "belum ada data" | Belum ada scrape maupun unggahan | Jalankan `sync-indices.js` atau unggah di `/admin/indeks` |
| Semua label basi | Scraper belum jalan lebih dari 60 hari | Jalankan ulang script; periksa log kontainer scraper |
| Scraper menemukan 0 anggota untuk satu indeks | Tata letak halaman IDX berubah | Unggah indeks itu secara manual dan perbarui selektor di `sync-indices.js` |
| Label hanya hilang di satu halaman | Pemanggilan di halaman itu belum dipasang | Tambahkan `IndexBadgeList` di sebelah ticker |

## Halaman terkait

- [Pipeline Data & Sinkronisasi](./data-pipeline.md) — cara harga dan data keuangan diambil.
- [Autentikasi & Akses Admin](./authentication.md) — siapa yang boleh memanggil endpoint unggahan.
- [Model Database & Skema](./database-models.md) — sisa skema.