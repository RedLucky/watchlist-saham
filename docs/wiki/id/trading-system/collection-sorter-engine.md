# Engine Pengurutan Koleksi Saham & Manajemen Watchlist Institusional

**Collection Sorter Engine** (`src/lib/collectionSorter.js`) menyediakan algoritma pengurutan multi-faktor otomatis untuk koleksi saham dan *watchlist* pengguna di Stock Explorer. Fitur ini memungkinkan trader dan investor untuk langsung mengenali target eksekusi paling prioritas tanpa harus memilah puluhan saham secara manual.

---

## 1. Arsitektur Sistem

* **Modul Engine**: `src/lib/collectionSorter.js`
* **Komponen Menu & Modal**: `src/components/CollectionSortDropdown.jsx`
* **Integrasi API**: `GET /api/collections/items` (dilengkapi data teknikal live) & `PATCH /api/collections/items` (menyimpan `orderedIds` ke database melalui transaksi Prisma)
* **Tampilan Induk**: `src/components/StockExplorer.jsx` (Sidebar Kiri Koleksi Saham)

```
[ Item Koleksi ] ──> [ CollectionSortDropdown ]
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
  [ Menu Popover Cepat ]           [ Modal Panduan Strategi ]
   (7 Opsi Pilihan Cepat)          (Detail Formula & Skenario)
             │                               │
             └───────────────┬───────────────┘
                             ▼
                 [ sortCollectionItems() ]
                   (Pure Sorter Engine)
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
   [ UI Reorder Optimistik ]       [ PATCH /api/collections/items ]
    (Animasi Susun Instan)          (Penyimpanan Permanen Database)
```

---

## 2. Rincian 7 Algoritma Pengurutan

### 1. `SMART_COMBINATION` (⭐ Kombinasi Cerdas) - Rekomendasi Utama
Menyelaraskan kualitas jangka panjang dengan ketepatan waktu masuk teknikal serta level target pribadi.
$$\text{SmartRank} = (\text{Skor Komposit} \times 0.40) + (\text{Poin Sinyal MACD} \times 0.35) + (\text{Poin Kedekatan Target Beli} \times 0.25)$$

* **Skor Komposit (40%)**: Skor multi-faktor (0–100) yang menggabungkan Fundamental (45%), Teknikal (35%), Tren (10%), dan Smart Money (10%).
* **Poin Sinyal MACD (35%)**:
  * Fresh Golden Cross (`isGoldenCross: true`): **100 poin**
  * Histogram Bullish (`histogram > 0`): **75 poin**
  * Momentum Rebound (`histogram < 0` tetapi `histogram > prevHistogram`): **55 poin**
  * Fase Bearish: **20 poin**
* **Poin Kedekatan Target Beli (25%)**:
  * Harga pasar $\le$ Target Beli (sudah di zona beli): **100 poin**
  * Jarak $\le 2\%$: **90 poin**
  * Jarak $\le 5\%$: **70 poin**
  * Jarak $\le 10\%$: **50 poin**
  * Jauh di atas target beli: **20 poin**

### 2. `HIGHEST_SCORE` (🏆 Skor Tertinggi)
Mengurutkan saham murni dari kesehatan fundamental dan teknikal terbaik secara keseluruhan.
* Urutan Utama: `stock.score` menurun (100 ➔ 0).
* Kriteria Penentu: `scores.fundamental` ➔ `scores.technical`.

### 3. `MACD_CROSS` (📈 Sinyal Beli MACD)
Memprioritaskan sinyal beli teknikal dan konfirmasi kelanjutan tren:
1. Peringkat 1 (100 poin): Fresh Golden Cross terkonfirmasi hari ini.
2. Peringkat 2 (75 poin): Ekspansi Bullish (`histogram > 0`).
3. Peringkat 3 (55 poin): Histogram negatif yang menipis menuju 0 (antisipasi pembalikan arah/rebound).
4. Peringkat 4 (20 poin): Pelemahan bearish / dead cross.

### 4. `PROXIMITY_TARGET_BUY` (🎯 Paling Dekat Target Beli)
Mendeteksi saham yang paling mendekati zona beli yang telah direncanakan pengguna:
$$\text{Jarak} = \frac{|\text{Harga Pasar} - \text{Target Beli}|}{\text{Harga Pasar}} \times 100\%$$
* Saham di zona beli ($\text{Harga} \le \text{Target Beli}$) atau berjarak $\le 2\%$ mendapat prioritas teratas.
* Nilai Cadangan (*Fallback*): Jika belum menentukan `targetBuy` manual, sistem menggunakan `stock.technicals.support` atau `stock.price * 0.95`.

### 5. `SMART_MONEY` (🐋 Akumulasi Smart Money)
Mengurutkan berdasarkan akumulasi dana institusi dan konsentrasi broker:
* Urutan Utama: `stock.scores.smartMoney` menurun.
* Kriteria Penentu: `stock.scores.trending` ➔ `changePercent`.

### 6. `TOP_PERFORMER` (🚀 Performa Hari Ini)
Mengurutkan berdasarkan persentase perubahan harga harian:
* Urutan Utama: `stock.changePercent` menurun (+25% ➔ -15%).

### 7. `ALPHABETICAL` (🔤 Nama Emiten A – Z)
Menyusun urutan secara alfabetis rapi berdasarkan kode ticker resmi BEI (`AALI` ➔ `BBCA` ➔ `TLKM` ➔ `UNVR`).

---

## 3. Penyimpanan Database & Kompatibilitas Drag-and-Drop Manual

* **Model Database**: Tabel `CollectionItem` dengan kolom `sortOrder Int @default(0)`.
* **Handler API**: `PATCH /api/collections/items` menerima `{ collectionId, orderedIds }`.
* **Transaksi Prisma**: Memperbarui indeks `sortOrder` setiap item secara atomik di database MySQL.
* **Kustomisasi Manual**: Pengguna tetap bebas melakukan *drag-and-drop* manual pada kartu saham kapan saja setelah menjalankan pengurutan otomatis.
