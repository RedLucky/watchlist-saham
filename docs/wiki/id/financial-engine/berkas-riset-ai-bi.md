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

## 3. Intelijen Komprehensif 35 Sektor Alpha Legend & Rubrik Relasional

Untuk mengeliminasi kesimpulan umum yang dangkal, AI Research Engine diselaraskan 100% dengan seluruh **35 sektor spesifik** dari **Alpha Legend Screener** (`src/data/alphaLegendSectors.js`) melalui mesin intelijen khusus (`src/lib/ai/sectorIntelligence.js`):

### A. Taksonomi & Resolusi Sektoral:
1. **Resolusi Slug Langsung**: Mencocokkan slug resmi `StockData.subSector` (seperti `automotive-parts`, `poultry`, `shipping`, `cpo`, `bank-syariah`, `rumah-sakit`).
2. **Taksonomi Kata Kunci Semantis**: Tanpa perbandingan kode saham statis (zero hardcoded ticker). Mencocokkan sektor, subsektor, dan kegiatan korporasi dengan kamus keuangan industri (misal `['auto part', 'spare part', 'suku cadang', 'ban', 'tire', 'shock absorber']`).
3. **Ekspansi Kueri Tematik Multi-Arah**: Secara otomatis menyusun hingga 4 tugas penelusuran paralel per emiten (menghasilkan hingga 16 cuplikan berita komprehensif per saham):
   - Task 1: Berita & Sentimen Utama Saham (`{ticker} {name} saham`).
   - Task 2: Rencana Bisnis, Capex & Strategi Finansial (`{name} rencana bisnis belanja modal capex ekspansi target`).
   - Task 3: Dinamika Kebutuhan Industri, Siklus Makro & Market-Fit (`{name} [kueri makro spesifik]`).
   - Task 4: Pangsa Pasar, Benchmarking Parit Kompetitor & Prospek Ekspansi (`{name} [kueri kompetitor & kapasitas]`).
   - Volume kuota pengambilan ditingkatkan hingga 4 cuplikan berita berbobot per kueri melalui Bing RSS dan Google RSS fallback.

### B. Model Relasional Industri & KPI Khusus 35 Sektor:
- **Komponen Otomotif (`automotive-parts`)**: Model Penuaan Armada Kendaraan / Aging Fleet (lag penjualan mobil 2-5 tahun lalu memicu permintaan suku cadang penggantian untuk kendaraan 3-7 tahun), ketahanan ICE vs EV, split kontrak OEM pabrikan vs Aftermarket/OES (Shop&Drive), GPM, ITO, ROIC.
- **Perbankan & Bank Syariah (`bank`, `bank-syariah`)**: Rasio dana murah CASA vs Cost of Funds (CoF), pertumbuhan kredit per segmen, cakupan pencadangan NPL/LAR (>200%), efisiensi digital BOPO/CIR, serta FDR/NPF untuk bank syariah.
- **Energi, Batu Bara & Tambang Hilirisasi (`coal-mining`, `oil-gas`, `oil-gas-services`, `nickel-mining`)**: Kurva biaya kas (cash cost curves), rasio kupas (SR), umur tambang, batas DMO PLN 25%, nikel Kelas 1 HPAL MHP (baterai EV) vs Kelas 2 RKEF NPI (stainless steel), dan kuota RKAB.
- **Agribisnis & CPO (`cpo`, `poultry`)**: Lantai serapan mandat domestik Biodiesel B35/B40, profil usia tanaman (prima 8-18 tahun vs replanting), yield TBS & rendemen OER (>23%), harga DOC, culling ayam broiler, dan margin pakan feedmill.
- **Logistik, Pelayaran & Infrastruktur (`shipping`, `shipping-port`, `courier-logistics`, `jalan-tol`, `airlines`, `car-rental`, `taxi-services`)**: Indeks Baltic Dry/freight rate, utilisasi & umur armada kapal, arus peti kemas TEUs pelabuhan, margin paket e-commerce, siklus 2 tahunan penyesuaian tarif tol, dan Seat Load Factor (SLF).
- **Kesehatan & Farmasi (`rumah-sakit`, `healthcare-lab`, `farmasi`)**: Rasio Keterisian Tempat Tidur (BOR), lama rawat (LOS), bauran pasien umum/asuransi vs BPJS, volume tes lab diagnostik, GPM obat resep vs OTC, dan ketergantungan impor bahan baku aktif (API).
- **Konsumer, Ritel, Properti & Sektor Lainnya (`ritel`, `fmcg`, `restaurant`, `properti`, `industrial-estate`, `konstruksi`, `ebt`, `utilities`, `perhotelan`, `media`, `tower`, `telco-provider`, `pulp-paper`, `semen`, `financing`, `insurance`)**: SSSG, CCC, diskon NAV cadangan lahan, pendapatan utilitas berulang, burn rate kontrak baru, kontrak jangka panjang take-or-pay PPA PLN, dan audience share.

### C. Format Wajib Laporan Riset 7 Babak:
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
- **Kartu Ringkasan & Sanitasi Cuplikan**: Kartu ringkasan pada `BloombergIntelligencePanel` memproses teks melalui `formatPreviewSnippet` untuk membersihkan tag header (`## ...`), garis pemisah horizontal, dan simbol bullet/bintang mentah agar tampilan ringkasan 2 baris terlihat rapi tanpa bocoran markup.
- **Renderer Markdown Lengkap (`renderAiMarkdown`)**:
  - Seluruh laporan riset modal dirender melalui parser CommonMark terdedikasi yang mendukung header H1–H5, garis pemisah horizontal (`---`, `***`, `___`), kutipan blok (`>`), blok kode (```` ``` ````), kode inline (`` `kode` ``), rumus matematika inline (`$rumus$`), bold-italic, coret (*strikethrough*), dan tautan web aktif (`[label](url)`).
  - **Kotak Panggilan Dinamis (*Callout Cards*)**: Secara cerdas mengenali `SKOR AI:`, `KESIMPULAN: [BELI/HOLD/JUAL]`, dan `ALASAN SINGKAT:` menjadi kartu visual berlatar khusus, sekalipun model AI menyertakan format tebal `**` pada awal baris.
  - **Tabel Responsif**: Baris tabel markdown (`| kolom1 | kolom2 |`) disusun menjadi elemen `<table>` HTML asli dengan kepala tabel (*thead*), baris zebra, dan pembungkus geser horizontal (*overflow-x-auto*).
  - **Ketahanan Persamaan Matematika**: Deteksi batas spasi mencegah persamaan perkalian aritmatika keuangan (seperti `Harga = 500 * 22,5 = Rp 11.250`) salah terdeteksi sebagai tanda bintang miring (*italic*).
- **Eksplorasi Lengkap**: Tombol aksi langsung membuka modal riset AI komprehensif tanpa harus berpindah halaman.

---

## 5. Mesin Penyaring Clickbait & Pemeringkat Kepadatan Informasi (Signal-to-Noise)

Untuk mencegah halusinasi model AI dan memastikan laporan riset bertumpu pada data faktual aksi korporasi, pipeline pencarian berita internet (`src/lib/ai/search.js` dan `src/lib/ai/prompter.js`) menerapkan arsitektur dua tahap:

### A. Filtrasi Judul Clickbait (`isClickbaitTitle`)
- **Pembersihan Kebisingan (Noise Elimination)**: Secara otomatis membuang artikel rekomendasi harian spekulatif, listicle broker, dan judul sensasional seperti:
  - Rekomendasi broker harian: `rekomendasi saham`, `menu saham`, `saham pilihan`, `saham jagoan`, `ide trading`, `trading plan`.
  - Umpan target harga: `simak target harga`, `target harga potensial`, `potensi cuan`, `layak beli`, `intip saham`, `saatnya beli?`.
  - Rangkuman pasar harian: `ihsg melemah... cek rekomendasi`, `top gainers/losers`.
- **Daftar Putih Aksi Korporasi (Corporate Action Whitelist)**: Tetap meloloskan artikel yang memuat rilis data moneter konkret dan keterbukaan informasi emiten (contoh: `laba bersih`, `dividen interim`, `capex`, `akuisisi`, `rights issue`, `buyback`, `miliar`, `triliun`).

### B. Pemeringkatan Skor Sinyal Finansial (`calculateSignalScore`)
Setiap artikel yang diambil diberi skor dari $0 - 100$ dan diurutkan menurun sebelum disusun ke dalam prompt:
1. **Kepadatan Ringkasan (+25 s.d. +35 poin)**: Bobot tinggi untuk deskripsi artikel substansial (>40 karakter) dari Bing RSS.
2. **Angka Moneter & Metrik Operasional (+20 poin)**: Metrik terukur (`Rp`, `%`, `triliun`, `miliar`, `ton`, `barel`).
3. **Kategori Finansial Utama (+15 poin)**: Metrik kinerja konkret (`laba`, `pendapatan`, `ebitda`, `capex`, `dividen`).
4. **Kredibilitas Media Bisnis Resmi (+15 poin)**: Media keuangan terverifikasi (`Bisnis.com`, `Kontan`, `CNBC Indonesia`, `Katadata`, `Investor Daily`, `Bloomberg Technoz`, `IDNFinancials`, `Jakarta Globe`).
5. **Penalti Listicle (-20 poin)**: Mengurangi drastis skor artikel kompilasi pasar yang memuat 3+ kode saham sekaligus.

### C. Kueri Boolean Terarah (Targeted Boolean Querying)
Mengganti pencarian teks panjang tanpa operator dengan kueri boolean terstruktur:
- Kueri Utama Korporasi: `"${cleanName}" (laba OR pendapatan OR kinerja OR dividen OR capex OR ekspansi)`
- Kueri Ekspansi & Capex: `"${cleanName}" (rencana bisnis OR belanja modal OR capex OR ekspansi OR target laba)`

### D. Mandat Prompt Anti-Clickbait Ketat
Bagian 4 dan Bagian 6 pada `prompter.js` menyertakan `[ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]`, mewajibkan AI untuk mengabaikan analisis teknikal/broker harian spekulatif dan memusatkan evaluasi pada pengumuman aksi korporasi resmi serta laporan keuangan kuartalan yang terverifikasi.


