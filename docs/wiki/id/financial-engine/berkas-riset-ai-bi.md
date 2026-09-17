# Bloomberg Intelligence (BI): Berkas Riset Ekuitas AI (AI Research Dossier)

## 1. Ikhtisar & Arsitektur Utama
Modul **Bloomberg Intelligence (BI)** mengintegrasikan sintesis riset ekuitas institusional mendalam langsung ke dalam tab analisis Stock Explorer.

Mengadopsi pendekatan riset terpadu Bloomberg `BI`, mesin ini memanfaatkan inferensi model bahasa lokal (`aiStockResearch` via `llama.cpp`) untuk meringkas data fundamental multidimensi, rekomendasi konsensus (`BUY`, `HOLD`, `SELL`), valuasi wajar, dan momentum tren emiten ke dalam ringkasan eksekutif.

---

## 2. Atribut & Skema Berkas Riset
Disimpan dalam database PostgreSQL melalui Prisma (`model AiStockResearch`), data riset mencakup:
- **`ticker`**: Kode saham BEI (misal `BBCA`, `ASII`).
- **`buyHoldSell`**: Aksi konsensus rekomendasi (`BUY`, `HOLD`, atau `SELL`).
- **`score`**: Skor komposit emiten ($0 - 100$).
- **`valuation`**: Ulasan naratif valuasi wajar, margin of safety, dan ekspektasi kelipatan harga.
- **`trend`**: Analisis aliran dana smart money, bandarmologi, dan momentum teknikal.
- **`content`**: Dokumen riset lengkap berformat Markdown.
- **`createdAt`**: Waktu pembuatan laporan untuk memastikan kebaruan data.

---

## 3. Kerangka Analisis Sektoral & Unit Bisnis Mendalam

Untuk mengeliminasi kesimpulan umum yang dangkal, AI Research Engine mengadopsi **Kerangka Kerja Intelijen Sektoral Dinamis** (`src/lib/ai/prompter.js`) yang dipadukan dengan **Pencarian Web Tematik Multi-Query** (`src/lib/ai/search.js`):

### A. Rubrik Relasional Sektoral:
- **Otomotif & Suku Cadang (misal `AUTO`, `SMSM`, `GJTL`)**:
  - *Model Penuaan Armada Kendaraan (Aging Fleet)*: Penjualan mobil/motor lampau (data GAIKINDO 2–5 tahun lalu) memicu siklus kebutuhan penggantian berkala (shock absorber, kampas rem, filter, aki) pada kendaraan berusia 3–7 tahun saat ini dan ke depan.
  - *Ketahanan Portofolio ICE vs EV/Hybrid*: Memisahkan komponen yang kebal elektrifikasi (suspensi, rem, sasis, kabel, aki 12V) dengan komponen mesin bensin yang rentan terdisrupsi.
  - *Segmentasi Saluran Penjualan*: OEM (perakitan pabrik mobil baru) vs Aftermarket / OES (arus kas berulang defensif melalui jaringan ritel seperti Shop&Drive).
- **Perbankan & Keuangan (misal `BBCA`, `BBRI`, `BMRI`)**:
  - Rasio dana murah CASA franchise vs Cost of Funds (CoF), pertumbuhan kredit per segmen (korporasi vs UMKM), pencadangan NPL/LAR, dan rasio efisiensi digital BOPO/CIR.
- **Energi & Pertambangan (misal `ADRO`, `PTBA`, `ANTM`, `INCO`)**:
  - Posisi kurva biaya kas (*cash cost curve*), rasio kupas (stripping ratio), umur cadangan tambang, DMO PLN, serta capex transisi hijau dan hilirisasi smelter HPAL/RKEF.
- **Agribisnis & Perkebunan CPO (misal `TAPG`, `DSNG`, `AALI`)**:
  - Penyerapan domestik mandat Biodiesel B35/B40, profil usia tanaman (tanaman prima vs replanting), yield Tandan Buah Segar (TBS/FFB), dan rendemen OER.
- **Telekomunikasi, Konstruksi, Properti, & Konsumer Primer**:
  - Monetisasi trafik data & pergerakan ARPU, laju burn rate kontrak baru, sensitivitas suku bunga KPR BI-Rate, kemampuan pass-through inflasi bahan baku, dan keunggulan parit distribusi.

### B. Format Wajib Laporan Riset 7 Babak:
1. `## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan`
2. `## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit`
3. `## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor`
4. `## 4. Analisis Fundamental & Valuasi Saham`
5. `## 5. Arah Tren & Momentum Teknikal`
6. `## 6. Analisis Sentimen Berita & Katalis Terkini`
7. `## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir` (disertai `SKOR AI: [0-100]`, `KESIMPULAN: [BELI/HOLD/JUAL]`, dan `ALASAN SINGKAT`)

---

## 4. Integrasi Antarmuka (UI)
- **Komponen**: `src/components/BloombergIntelligencePanel.jsx` & `src/components/StockExplorer.jsx`.
- **Ikon Babak Tematik**: Visualisasi badge judul babak (🏢 Unit Bisnis, 🔄 Siklus Pasar, 🛡️ Moat & Kompetitor, 📊 Valuasi, 📈 Teknikal, 📰 Berita, 🎯 Prospek).
- **Kartu Ringkasan**: Menampilkan konsensus, ulasan valuasi, dan tren secara instan.
- **Eksplorasi Lengkap**: Tombol aksi langsung membuka modal riset AI komprehensif tanpa harus berpindah halaman.

