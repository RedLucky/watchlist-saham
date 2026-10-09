---
title: "Aliran Smart Money & Analisis KSEI"
description: "Mekanisme bandarmologi, analisis kepemilikan tanpa warkat KSEI, deteksi lonjakan volume, dan mesin arus transaksi Domestik/Asing multi-periode"
category: "trading-system"
tags: ["smart-money", "ksei", "bandarmologi", "aliran-dana", "inflow-netflow"]
last_updated: "2026-10-09"
version: "1.1.0"
---

# Aliran Smart Money & Analisis KSEI

Mengevaluasi apakah investor institusi besar (*Smart Money*) serta pelaku pasar Domestik dan Asing sedang melakukan akumulasi atau distribusi pada rentang harian hingga tahunan.

---

## 🏛️ 1. Metrik Distribusi Kepemilikan Efek KSEI
Terdapat pada `src/lib/scoring/smartMoney.js` dan `src/scripts/sync-ksei.js`.

* **Rasio Kepemilikan Institusi**:
  - Perbankan, Reksadana, Asuransi, dan Dana Pensiun.
  - Kenaikan persentase kepemilikan institusi yang diiringi penurunan kepemilikan ritel merupakan indikasi **Akumulasi**.
* **Aliran Dana Asing (*Foreign Flow*)**:
  - Net buy atau net sell investor asing dalam rentang 5, 20, dan 60 hari bursa.

---

## 📊 2. Deteksi Anomali & Lonjakan Volume
Terdapat pada `src/lib/scoring/technical.js`.

* **Penghitungan Baseline Volume**: Menghitung rata-rata volume 5 hari secara ketat **sebelum hari ini** untuk menghindari bias self-inclusion:
  $$\text{Baseline Volume} = \text{Rata-rata}(\text{Volume}[-6 \dots -1])$$
* **Lonjakan Akumulasi**: Terdeteksi jika $\text{Volume Hari Ini} \ge 2.0 \times \text{Baseline Volume}$ dan harga ditutup pada 40% rentang teratas candle harian.

---

## 💸 3. Mesin Arus Transaksi Multi-Periode (Inflow, Outflow & Netflow)
Terdapat pada `src/lib/transactionFlowEngine.js` (`calculateTransactionFlows`).

Menghitung **Inflow (Gross Buy)**, **Outflow (Gross Sell)**, dan **Netflow (Net Buy/Sell)** untuk **Investor Asing (Foreign)**, **Investor Domestik (Lokal)**, serta **Arus Uang Aktif (Active Flow)** pada empat jendela hari bursa BEI:
* **Harian (`1d`)**: 1 Hari Bursa (`1HK`)
* **Mingguan (`1w`)**: 5 Hari Bursa (`5HK`)
* **Bulanan (`1m`)**: 20 Hari Bursa (`20HK`)
* **Tahunan (`1y`)**: 250 Hari Bursa (`250HK`)

### Arsitektur Data Hibrida
1. **Data Resmi Ringkasan Saham BEI (`source: 'idx'`)**:
   - Ketika data harian *Ringkasan Saham* BEI (`foreignBuy`, `foreignSell`, `volume`, `value`) tersedia di `technicals.idxFlow`, nilai *inflow* dan *outflow* asing dihitung langsung dari jumlah lembar resmi BEI dikalikan harga rata-rata tertimbang harian ($\text{VWAP} = \text{value} / \text{volume}$).
   - Transaksi domestik dihitung melalui prinsip kliring pasar: $\text{Domestic Buy} = \max(0, \text{Volume} - \text{Foreign Buy})$ dan $\text{Domestic Sell} = \max(0, \text{Volume} - \text{Foreign Sell})$.
2. **Estimasi Terkalibrasi OHLCV + KSEI (`source: 'estimated'`)**:
   - Untuk hari bursa historis yang belum memiliki baris ringkasan BEI, rasio beli aktif (`computeDailyBuyingRatio`) menggabungkan **Close Location Value** ($\text{CLV} = \frac{\text{Close} - \text{Low}}{\text{High} - \text{Low}}$, bobot $65\%$) dan kurva logistik perubahan harga harian ($35\%$).
   - Total volume dibagi antara Asing dan Domestik menggunakan `kseiLatest.foreignPercent` (dibatasi pada $[5\%, 85\%]$, bawaan $35\%$) disertai kemiringan arah beli (`resolveKseiFlowWeights`) dari delta bulanan KSEI.
3. **Satuan & Klasifikasi Pelaku Dominan**:
   - Setiap periode menyajikan nilai dalam **Rupiah (`Rp`)**, **Lot** ($\text{lembar} / 100$), dan **% terhadap Total Nilai Transaksi** (`shareOfTurnoverPct`, `netflowPct`), lengkap dengan penanda `dominantPlayer` (`FOREIGN_ACCUMULATION`, `DOMESTIC_ACCUMULATION`, `FOREIGN_DISTRIBUTION`, `DOMESTIC_DISTRIBUTION`, atau `BALANCED`).
4. **Integrasi Provider & Endpoint API**:
   - `src/lib/providers/DatabaseProvider.js` menyertakan objek `transactionFlow` pada setiap saham di cache memori 30 detik (`getStocks()`), serta melampirkan `transactionFlow` dan `briefing` pada `getMarketData()`.
   - `GET /api/stocks` mengirimkan `transactionFlow` baik pada daftar kandidat maupun pencarian tunggal `?ticker=XXXX` (digunakan oleh `DetailPanel` di halaman Analisis Saham).
   - `GET /api/stocks/[ticker]` menyertakan `transactionFlow` pada respons detail lengkap emiten (digunakan oleh `StockExplorer`).
   - `GET /api/market` mengekspos `transactionFlow` (arus pasar komposit IHSG multi-periode) dan `briefing` (rangkuman eksekutif harian pasar dan panduan taktis).
5. **Presentasi UI & Integrasi Komponen**:
   - `src/lib/transactionFlowPresenter.js` menyediakan helper murni pemformatan Rupiah (`formatFlowRupiah`), Lot BEI (`formatFlowLots`), rasio tekanan beli/jual (`computeGrossSplitPct`), serta lencana semantik Bursa 1985 (`getNetflowTone`, `getDominantFlowBadge`, `getFlowSourceBadge`).
   - `src/components/TransactionFlowPanel.jsx` menampilkan tab interaktif `1d`/`1w`/`1m`/`1y`, 3 kartu Investor Asing / Investor Domestik / Arus Uang Aktif (Gross Buy, Gross Sell, bar tekanan beli/jual, kotak Netflow), serta tabel matriks perbandingan 4 periode berdampingan di `DetailPanel.jsx` (Analisis Saham), `StockExplorer.jsx` (tab `Smart Money & KSEI`), dan langsung pada halaman utama **Analisis Saham** di `Dashboard.jsx` untuk arus IHSG pasar keseluruhan.
   - `src/components/MarketBriefingCard.jsx` menampilkan banner Ringkasan Perkembangan Pasar Eksekutif di bagian atas halaman Analisis Saham, menyajikan tajuk sentimen instan, kedalaman indeks, arus asing, likuiditas, dan panduan taktis aksi.
6. **Penyimpanan Relasional & Pipeline Migrasi (`StockDailyFlow`)**:
   - Untuk mendukung analitik arus jangka panjang multi-tahun tanpa membengkakkan ukuran kolom JSON di `StockData.technicals`, catatan harian resmi BEI disimpan ke dalam tabel relasional PostgreSQL khusus `StockDailyFlow` (`ticker`, `date`, `foreignBuy`, `foreignSell`, `domesticBuy`, `domesticSell`, `netForeignFlow`, `volume`, `turnover`, `vwap`).
   - `src/scripts/migrate-idx-flow-to-table.js`: Skrip migrasi bertahap idempoten yang membaca data JSON `technicals.idxFlow` yang sudah ada dan menyalinnya ke `StockDailyFlow` menggunakan `createMany({ skipDuplicates: true })`.
   - `src/scripts/sync-idx-flow.js`: Skrip scraper BEI harian secara paralel mencatat data baru ke `StockDailyFlow` melalui `upsert` sekaligus memperbarui jendela bergulir 60 hari pada `StockData.technicals` guna menjamin kompatibilitas tanpa *downtime*.
7. **Agregasi Pasar IHSG & Rangkuman Eksekutif Harian**:
   - `aggregateMarketTransactionFlows(stocks, ihsgStock)` di `src/lib/transactionFlowEngine.js` menjumlahkan arus Asing, Domestik, dan Arus Aktif dari seluruh emiten aktif untuk rentang `1d`, `1w`, `1m`, dan `1y`, dengan fallback ke indeks `^JKSE` bila daftar emiten kosong.
   - `generateMarketBriefing(marketData, marketFlow)` menyatukan tren indeks, kedalaman pasar (advance/decline), rasio likuiditas, dan netflow asing menjadi status pasar aksi riil (`bullish_accumulation`, `bullish_divergence`, `bearish_distribution`, `bearish_accumulation`, `sideways_consolidation`) beserta 4 poin rangkuman dan panduan taktis harian.
