// Data Sektor & Metrik Komplit Alpha Legend (Part 1 - Part 7)

export const ALPHA_LEGEND_SECTORS = [
  // PART 1
  {
    id: 'bank',
    part: 1,
    name: 'Bank',
    icon: '🏦',
    category: 'Jasa Keuangan',
    metrics: [
      { name: 'NIM (Net Interest Margin)', desc: 'Persentase selisih pendapatan bunga dan beban bunga dibanding total aset produktif.' },
      { name: 'CASA (Current Acc. & Saving Acc.)', desc: 'Rasio dana murah (Giro & Tabungan) terhadap total DPK.' },
      { name: 'NPL (Non-Performing Loan)', desc: 'Rasio kredit bermasalah/macet. Idealnya < 3%.' },
      { name: 'LDR (Loan to Deposit Ratio)', desc: 'Rasio penyaluran kredit dibanding total simpanan masyarakat.' }
    ]
  },
  {
    id: 'ritel',
    part: 1,
    name: 'Ritel',
    icon: '🛒',
    category: 'Konsumer',
    metrics: [
      { name: 'SSSG (Same-Store Sales Growth)', desc: 'Pertumbuhan penjualan di gerai yang sudah beroperasi lebih dari 1 tahun.' },
      { name: 'CCC (Cash Conversion Cycle)', desc: 'Waktu yang dibutuhkan untuk mengonversi persediaan menjadi arus kas.' },
      { name: 'ITO (Inventory Turnover)', desc: 'Perputaran persediaan barang dagangan dalam periode tertentu.' },
      { name: 'OPM (Operating Profit Margin)', desc: 'Margin laba usaha dari total pendapatan.' }
    ]
  },
  {
    id: 'tower',
    part: 1,
    name: 'Tower Provider',
    icon: '📡',
    category: 'Infrastruktur',
    metrics: [
      { name: 'Tenancy Ratio', desc: 'Rasio rata-rata penyewa per satu menara telekomunikasi.' },
      { name: 'EBITDA Margin', desc: 'Margin laba sebelum bunga, pajak, depresiasi, dan amortisasi.' },
      { name: 'FCF (Free Cash Flow)', desc: 'Arus kas bebas sisa operasional setelah dikurangi capex.' },
      { name: 'Debt to EBITDA', desc: 'Tingkat utang terhadap EBITDA perusahaan menara.' }
    ]
  },
  {
    id: 'rumah-sakit',
    part: 1,
    name: 'Rumah Sakit',
    icon: '🏥',
    category: 'Kesehatan',
    metrics: [
      { name: 'BOR (Bed Occupancy Ratio)', desc: 'Persentase tingkat keterisian tempat tidur rumah sakit.' },
      { name: 'ROIC (Return on Invested Capital)', desc: 'Imbal hasil dari modal yang diinvestasikan pada pembukaan RS baru.' },
      { name: 'LOS (Length of Stay)', desc: 'Rata-rata durasi hari rawat inap pasien.' },
      { name: 'EBITDA Margin', desc: 'Profitabilitas operasional RS.' }
    ]
  },
  {
    id: 'properti',
    part: 1,
    name: 'Properti',
    icon: '🏢',
    category: 'Real Estate',
    metrics: [
      { name: 'Land Bank', desc: 'Luas cadangan lahan yang dimiliki untuk pengembangan di masa depan.' },
      { name: 'Marketing Sales', desc: 'Pra-penjualan unit properti sebelum diakui sebagai pendapatan resmi.' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Rasio total utang terhadap modal bersih.' },
      { name: 'NAV (Net Asset Value)', desc: 'Nilai bersih aset properti diskon dibanding kapitalisasi pasar.' }
    ]
  },

  // PART 2
  {
    id: 'shipping',
    part: 2,
    name: 'Shipping',
    icon: '🚢',
    category: 'Logistik & Transportasi',
    metrics: [
      { name: 'Freight Rate', desc: 'Tarif sewa kargo per kapal / per kontainer.' },
      { name: 'Utilization Rate', desc: 'Persentase hari beroperasi aktif kapal dalam sebulan.' },
      { name: 'Fleet Age', desc: 'Rata-rata umur armada kapal.' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Tingkat utang utamanya utang bank/leasing kapal.' }
    ]
  },
  {
    id: 'coal-mining',
    part: 2,
    name: 'Coal Mining',
    icon: '⛏️',
    category: 'Energi & Tambang',
    metrics: [
      { name: 'Cash Cost', desc: 'Biaya tunai produksi pertambangan batu bara per ton.' },
      { name: 'Stripping Ratio', desc: 'Rasio volume lapisan tanah penutup (OB) dibanding tonase batu bara.' },
      { name: 'Reserves', desc: 'Jumlah cadangan batu bara terbukti.' },
      { name: 'ASP (Average Selling Price)', desc: 'Harga jual rata-rata batu bara per ton.' }
    ]
  },
  {
    id: 'cpo',
    part: 2,
    name: 'CPO',
    icon: '🌴',
    category: 'Pertanian & Perkebunan',
    metrics: [
      { name: 'FFB Yield', desc: 'Hasil produksi Tandan Buah Segar (TBS) per hektar.' },
      { name: 'OER (Oil Extraction Rate)', desc: 'Rasio rendemen ekstraksi minyak sawit mentah.' },
      { name: 'Age Profile', desc: 'Profil umur tanaman kelapa sawit (muda, menghasilkan, tua).' },
      { name: 'Planted vs Mature Area', desc: 'Perbandingan luas lahan tertanam dengan lahan menghasilkan.' }
    ]
  },
  {
    id: 'fmcg',
    part: 2,
    name: 'FMCG',
    icon: '🥤',
    category: 'Barang Konsumen',
    metrics: [
      { name: 'GPM (Gross Profit Margin)', desc: 'Margin laba kotor terhadap penjualan.' },
      { name: 'ITO (Inventory Turnover)', desc: 'Kecepatan perputaran produk cepat saji di pasar.' },
      { name: 'ROIC (Return on Invested Capital)', desc: 'Efisiensi pengembalian modal kerja barang konsumsi.' },
      { name: 'Market Share', desc: 'Pangsa pasar kategori produk utama di masyarakat.' }
    ]
  },
  {
    id: 'telco-provider',
    part: 2,
    name: 'Telco Provider',
    icon: '📱',
    category: 'Telekomunikasi',
    metrics: [
      { name: 'ARPU (Avg. Revenue per User)', desc: 'Pendapatan rata-rata per pengguna aktif data/telepon.' },
      { name: 'Churn Rate', desc: 'Persentase pengguna yang berhenti berlangganan.' },
      { name: 'EBITDA Margin', desc: 'Efisiensi biaya operasional jaringan telekomunikasi.' },
      { name: 'Capex to Revenue', desc: 'Persentase belanja modal BTS/fiber optic dibanding pendapatan.' }
    ]
  },

  // PART 3
  {
    id: 'pulp-paper',
    part: 3,
    name: 'Pulp & Paper',
    icon: '📄',
    category: 'Material Dasar',
    metrics: [
      { name: 'Utilization Rate', desc: 'Tingkat penggunaan kapasitas pabrik kertas/pulp.' },
      { name: 'Global Pulp Price', desc: 'Harga komoditas bubur kertas global.' },
      { name: 'ROIC (Return on Invested Capital)', desc: 'Imbal hasil dari investasi mesin pabrik.' },
      { name: 'ICR (Interest Coverage Ratio)', desc: 'Kemampuan membayar beban bunga dari laba operasional.' }
    ]
  },
  {
    id: 'oil-gas',
    part: 3,
    name: 'Oil & Gas',
    icon: '🛢️',
    category: 'Energi',
    metrics: [
      { name: 'Cash Cost', desc: 'Biaya ekstraksi per barel minyak/gas.' },
      { name: 'BOEPD', desc: 'Barrels of Oil Equivalent per Day (Volume produksi harian).' },
      { name: 'ROE (Return on Equity)', desc: 'Tingkat pengembalian modal saham.' },
      { name: 'Net Debt to EBITDA', desc: 'Beban utang bersih terhadap EBITDA.' }
    ]
  },
  {
    id: 'konstruksi',
    part: 3,
    name: 'Konstruksi',
    icon: '🏗️',
    category: 'Infrastruktur',
    metrics: [
      { name: 'Order Book', desc: 'Total kontrak baru dan kontrak berjalan yang dikantongi.' },
      { name: 'Burn Rate', desc: 'Kecepatan pengerjaan proyek menjadi omzet.' },
      { name: 'OCF (Operating Cash Flow)', desc: 'Arus kas operasional positif (bukan piutang tertahan).' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Rasio utang modal pengerjaan proyek.' }
    ]
  },
  {
    id: 'poultry',
    part: 3,
    name: 'Poultry',
    icon: '🐔',
    category: 'Peternakan',
    metrics: [
      { name: 'DOC Price', desc: 'Harga bibit ayam (Day Old Chick).' },
      { name: 'Margin Pakan', desc: 'Selisih harga jual pakan ayam dibanding bahan baku jagung/kedelai.' },
      { name: 'Konsumsi Ayam per Kapita', desc: 'Tingkat konsumsi daging ayam masyarakat.' },
      { name: 'Broiler Price', desc: 'Harga jual ayam pedaging di tingkat peternak.' }
    ]
  },
  {
    id: 'utilities',
    part: 3,
    name: 'Utilities',
    icon: '⚡',
    category: 'Utilitas',
    metrics: [
      { name: 'Churn Rate', desc: 'Tingkat penurunan pelanggan fasilitas publik.' },
      { name: 'Availability Factor', desc: 'Ketersediaan operasional pembangkit/listrik.' },
      { name: 'EBITDA Margin', desc: 'Margin laba EBITDA stabil.' },
      { name: 'FCF Yield', desc: 'Hasil arus kas bebas terhadap kapitalisasi pasar.' }
    ]
  },

  // PART 4
  {
    id: 'perhotelan',
    part: 4,
    name: 'Perhotelan',
    icon: '🏨',
    category: 'Pariwisata',
    metrics: [
      { name: 'Occupancy Rate', desc: 'Persentase kamar terisi per malam.' },
      { name: 'RevPAR', desc: 'Revenue per Available Room (Pendapatan per kamar tersedia).' },
      { name: 'GPM (Gross Profit Margin)', desc: 'Margin kotor jasa kamar & F&B hotel.' },
      { name: 'Rating OTA', desc: 'Ulasan konsumen di Traveloka/Agoda/Booking.com.' }
    ]
  },
  {
    id: 'jalan-tol',
    part: 4,
    name: 'Jalan Tol',
    icon: '🛣️',
    category: 'Infrastruktur',
    metrics: [
      { name: 'Jumlah Konsesi Jalan Tol (km)', desc: 'Total panjang ruas jalan tol yang dioperasikan.' },
      { name: 'ICR (Interest Coverage Ratio)', desc: 'Kemampuan membayar bunga dari pendapatan tol.' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Rasio utang sindikasi bank pengembang tol.' },
      { name: 'Volume of Traffic Transactions', desc: 'Jumlah lalu lintas kendaraan harian melintas.' }
    ]
  },
  {
    id: 'financing',
    part: 4,
    name: 'Financing',
    icon: '💳',
    category: 'Jasa Keuangan',
    metrics: [
      { name: 'NPF (Non-Performing Financing)', desc: 'Rasio pembiayaan bermasalah/macet multifinance.' },
      { name: 'ROAA (Return on Avg. Assets)', desc: 'Imbal hasil dari rata-rata total aset pembiayaan.' },
      { name: 'NIM (Net Interest Margin)', desc: 'Margin bunga bersih pembiayaan kendaraan/konsumen.' },
      { name: 'COC (Cost of Credit)', desc: 'Biaya pencadangan kredit bermasalah.' }
    ]
  },
  {
    id: 'media',
    part: 4,
    name: 'Media',
    icon: '📺',
    category: 'Hiburan',
    metrics: [
      { name: 'Audience Share', desc: 'Pangsa pemirsa TV pada jam prime time.' },
      { name: 'Jumlah Subscriber OTT', desc: 'Jumlah pelanggan platform streaming berbayar.' },
      { name: 'OCF (Operating Cash Flow)', desc: 'Kas masuk dari iklan dan royalti konten.' },
      { name: 'Digital Revenue', desc: 'Pertumbuhan iklan digital & media sosial.' }
    ]
  },
  {
    id: 'automotive-parts',
    part: 4,
    name: 'Automotive Parts',
    icon: '⚙️',
    category: 'Otomotif',
    metrics: [
      { name: 'Jumlah Retailer', desc: 'Banyaknya jaringan bengkel dan outlet distribusi.' },
      { name: 'GPM (Gross Profit Margin)', desc: 'Margin kotor penjualan suku cadang OEM vs Aftermarket.' },
      { name: 'ITO (Inventory Turnover)', desc: 'Perputaran stok komponen otomotif.' },
      { name: 'ROIC (Return on Invested Capital)', desc: 'Imbal modal pabrik suku cadang.' }
    ]
  },

  // PART 5
  {
    id: 'farmasi',
    part: 5,
    name: 'Farmasi',
    icon: '💊',
    category: 'Kesehatan',
    metrics: [
      { name: 'GPM (Gross Profit Margin)', desc: 'Margin kotor obat resep vs OTC.' },
      { name: 'Receivable Days', desc: 'Jumlah hari penagihan piutang dari RS/Apotek.' },
      { name: 'Inventory Days', desc: 'Lama penyimpanan bahan baku obat & obat mentah.' },
      { name: 'Market Share', desc: 'Pangsa pasar obat nasional & BPJS.' }
    ]
  },
  {
    id: 'bank-syariah',
    part: 5,
    name: 'Bank Syariah',
    icon: '🕌',
    category: 'Jasa Keuangan',
    metrics: [
      { name: 'CASA Ratio', desc: 'Rasio dana murah wadiah/mudharabah.' },
      { name: 'Fee-Based Ratio', desc: 'Pendapatan non-bagi hasil dari transaksi jasa.' },
      { name: 'NPF (Non-Performing Financing)', desc: 'Rasio pembiayaan kurang lancar/macet.' },
      { name: 'FDR (Financing to Deposit Ratio)', desc: 'Rasio penyaluran dana dibanding DPK.' }
    ]
  },
  {
    id: 'industrial-estate',
    part: 5,
    name: 'Industrial Estate',
    icon: '🏭',
    category: 'Real Estate',
    metrics: [
      { name: 'Marketing Sales', desc: 'Penjualan lahan kawasan industri baru.' },
      { name: 'Land Bank', desc: 'Sisa cadangan lahan industri siap bangun.' },
      { name: 'Recurring Income Ratio', desc: 'Pendapatan rutin dari listrik/air/sewa kawasan.' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Rasio utang obligasi/bank pengembang.' }
    ]
  },
  {
    id: 'ebt',
    part: 5,
    name: 'EBT / Clean Energy',
    icon: '☀️',
    category: 'Energi Bersih',
    metrics: [
      { name: 'Installed Capacity', desc: 'Kapasitas terpasang pembangkit EBT (MW).' },
      { name: 'Produksi Listrik', desc: 'Jumlah listrik yang dijual ke PLN (GWh).' },
      { name: 'EBITDA Margin', desc: 'Margin EBITDA kontrak jangka panjang PPA PLN.' },
      { name: 'Capex per MW', desc: 'Efisiensi belanja modal instalasi per Megawatt.' }
    ]
  },
  {
    id: 'restaurant',
    part: 5,
    name: 'Restaurant',
    icon: '🍽️',
    category: 'Konsumer',
    metrics: [
      { name: 'SSSG (Same-Store Sales Growth)', desc: 'Pertumbuhan omzet resto yang lama beroperasi.' },
      { name: 'Net Store Addition', desc: 'Jumlah pembukaan gerai resto baru dikurangi gerai tutup.' },
      { name: 'ITO (Inventory Turnover)', desc: 'Perputaran bahan makanan cepat saji.' },
      { name: 'GPM (Gross Profit Margin)', desc: 'Margin kotor F&B restoran.' }
    ]
  },

  // PART 6
  {
    id: 'semen',
    part: 6,
    name: 'Semen',
    icon: '🏗️',
    category: 'Material Dasar',
    metrics: [
      { name: 'Production Capacity', desc: 'Total kapasitas produksi semen per tahun.' },
      { name: 'Market Share', desc: 'Pangsa pasar domisili & ekspor semen.' },
      { name: 'ASP (Average Selling Price)', desc: 'Harga jual rata-rata per kantong/ton.' },
      { name: 'Utilization Rate (%)', desc: 'Persentase kapasitas terpasang yang berproduksi.' }
    ]
  },
  {
    id: 'nickel-mining',
    part: 6,
    name: 'Nickel Mining',
    icon: '⛏️',
    category: 'Energi & Tambang',
    metrics: [
      { name: 'Unit Cash Cost of Sales', desc: 'Biaya tunai penambangan nikel per ton.' },
      { name: 'Production Volume', desc: 'Volume bijih nikel (saprolit/limonit) diproduksi.' },
      { name: 'Ore Reserve', desc: 'Jumlah cadangan bijih nikel terbukti.' },
      { name: 'ASP (Average Selling Price)', desc: 'Harga jual rata-rata bijih nikel acuan NPI/NPI LME.' }
    ]
  },
  {
    id: 'healthcare-lab',
    part: 6,
    name: 'Healthcare Diagnostic Lab',
    icon: '🔬',
    category: 'Kesehatan',
    metrics: [
      { name: 'Number of Outlets', desc: 'Jumlah jaringan laboratorium klinik & cabang.' },
      { name: 'Number of Visits', desc: 'Total kunjungan pasien tes lab.' },
      { name: 'Total Test Acceptance', desc: 'Banyaknya sampel pengujian laboratorium.' },
      { name: 'Revenue per Outlet', desc: 'Pendapatan rata-rata per cabang lab.' }
    ]
  },
  {
    id: 'car-rental',
    part: 6,
    name: 'Car Rental',
    icon: '🚗',
    category: 'Jasa & Transportasi',
    metrics: [
      { name: 'Number of Fleet', desc: 'Total armada mobil sewaan beroperasi.' },
      { name: 'Passenger Vehicle Rental', desc: 'Tingkat utilisasi armada sewa penumpang.' },
      { name: 'Sales of Used Vehicles', desc: 'Keuntungan dari penjualan mobil bekas operasional.' },
      { name: 'ICR (Interest Coverage Ratio)', desc: 'Kemampuan bayar bunga leasing armada.' }
    ]
  },
  {
    id: 'shipping-port',
    part: 6,
    name: 'Shipping Port',
    icon: '🏗️',
    category: 'Logistik',
    metrics: [
      { name: 'Capacity Utilization', desc: 'Persentase utilisasi kapasitas dermaga pelabuhan.' },
      { name: 'Storage Capacity', desc: 'Kapasitas daya tampung depo kontainer & kargo.' },
      { name: 'Yard Area', desc: 'Luas lapangan penumpukan barang.' },
      { name: 'Market Share', desc: 'Pangsa pasar arus bongkar muat kapal.' }
    ]
  },

  // PART 7
  {
    id: 'taxi-services',
    part: 7,
    name: 'Taxi Services',
    icon: '🚕',
    category: 'Transportasi',
    metrics: [
      { name: 'Avg. Revenue per Vehicle (ARPV)', desc: 'Pendapatan harian rata-rata per unit taksi.' },
      { name: 'DER (Debt to Equity Ratio)', desc: 'Rasio utang pengadaan armada taksi baru.' },
      { name: 'Net Promoter Score (NPS)', desc: 'Kepuasan penumpang & reputasi layanan.' },
      { name: 'NPM (Net Profit Margin)', desc: 'Margin laba bersih jasa transportasi.' }
    ]
  },
  {
    id: 'insurance',
    part: 7,
    name: 'Insurance',
    icon: '🛡️',
    category: 'Jasa Keuangan',
    metrics: [
      { name: 'Premium Growth', desc: 'Pertumbuhan penerimaan premi asuransi.' },
      { name: 'Claim Paid Ratio', desc: 'Rasio pembayaran klaim terhadap pendapatan premi.' },
      { name: 'RBC (Risk-Based Capital)', desc: 'Rasio solvabilitas modal asuransi. Batas aman OJK ≥ 120%.' },
      { name: 'RKI (Rasio Kecukupan Investasi)', desc: 'Kecukupan hasil investasi menutup kewajiban.' }
    ]
  },
  {
    id: 'airlines',
    part: 7,
    name: 'Airlines',
    icon: '✈️',
    category: 'Transportasi',
    metrics: [
      { name: 'Seat Load Factor (SLF)', desc: 'Persentase keterisian kursi penerbangan.' },
      { name: 'ASK (Available Seat Kilometer)', desc: 'Total kapasitas tempat tidur/jarak terbang.' },
      { name: 'Fuel Cost Ratio', desc: 'Persentase avtur terhadap total biaya operasional.' },
      { name: 'CASK (Cost Available Seat Km)', desc: 'Biaya operasional per kilometer kursi tersedia.' }
    ]
  },
  {
    id: 'courier-logistics',
    part: 7,
    name: 'Courier & Logistic Serv.',
    icon: '📦',
    category: 'Logistik',
    metrics: [
      { name: 'Shipment Volume', desc: 'Banyaknya paket pengiriman barang/ekspedisi.' },
      { name: 'Shipment Growth', desc: 'Pertumbuhan volume paket bulanan.' },
      { name: 'Revenue per Shipment', desc: 'Pendapatan rata-rata per pengiriman paket.' },
      { name: 'OPM (Operating Profit Margin)', desc: 'Margin laba operasi kurir.' }
    ]
  },
  {
    id: 'oil-gas-services',
    part: 7,
    name: 'Oil & Gas Mining Serv.',
    icon: '🛢️',
    category: 'Jasa Tambang',
    metrics: [
      { name: 'Rig Utilization', desc: 'Tingkat penyewaan rig pengeboran aktif.' },
      { name: 'Contract Backlog', desc: 'Nilai sisa kontrak pengerjaan ladang minyak.' },
      { name: 'EBITDA Margin', desc: 'Margin EBITDA sewa alat & perbaikan rig.' },
      { name: 'Net Debt to EBITDA', desc: 'Tingkat utang bersih peralatan driling.' }
    ]
  }
];
