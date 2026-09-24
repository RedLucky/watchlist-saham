# Matriks Finansial Bloomberg (FA - Financial Analysis)

## Ringkasan
Panel **Matriks Finansial Bloomberg (FA)** (`src/components/FinancialMatrixPanel.jsx`) menyediakan tampilan laporan keuangan komparatif multi-tahun institusional langsung di dalam Stock Explorer. Terinspirasi dari fungsi legendaris Bloomberg Terminal `FA <GO>`, panel ini menyajikan indikator finansial kunci ke dalam 4 kategori utama:

1. **Laporan Laba Rugi (Income Statement)**: Total Pendapatan (Revenue), Laba Kotor (Gross Profit), Laba Usaha / EBIT, Laba Bersih (Net Income), Margin Laba Kotor (GPM), Margin Laba Usaha (OPM), dan Margin Laba Bersih (NPM).
2. **Neraca Keuangan (Balance Sheet)**: Total Aset, Total Liabilitas, Total Ekuitas, Kas & Setara Kas, Total Utang Berbunga, Debt-to-Equity Ratio (DER), dan Current Ratio.
3. **Arus Kas & Dividen (Cash Flow & Dividend)**: Arus Kas Operasi (OCF), Free Cash Flow (FCF), Dividen Per Saham (DPS), Dividend Yield, dan Dividend Payout Ratio (DPR).
4. **Profitabilitas & Valuasi (Profitability & Valuation)**: Return on Equity (ROE), Return on Assets (ROA), Laba Per Saham (EPS), Price-to-Earnings Ratio (PER), Price-to-Book Value (PBV), dan Enterprise Value (EV).

---

## Desain Arsitektur & Fitur Utama

### 1. Matriks Komparatif Multi-Tahun
- Memanfaatkan data historis dari `StockData.fundamentals` (seperti `historicalFinancials`, `earningsTrend`, dan laporan keuangan historis).
- Apabila data historis multi-tahun tidak lengkap dari Yahoo Finance API, panel ini secara elegan mengisolasi angka Trailing Twelve Months (TTM) / laporan tahunan terbaru dengan label tahun yang jelas (misal: FY2023, FY2024, FY2025, TTM).
- Menampilkan pertumbuhan tahunan (YoY) serta lencana warna untuk membedakan metrik yang berekspansi vs berkontraksi.

### 2. Tab Kategori & Navigasi Cepat
Pengguna dapat berganti tampilan dengan mudah:
- `all`: Tampilan master lengkap mencakup keempat kategori finansial sekaligus.
- `income`: Tampilan fokus Laporan Laba Rugi.
- `balance`: Tampilan fokus Neraca Keuangan & Struktur Modal.
- `cashflow`: Tampilan fokus Arus Kas & Distribusi Dividen.
- `ratios`: Tampilan fokus Rasio Profitabilitas DuPont & Multiplikasi Valuasi.

### 3. Standar Pasar Modal Indonesia & Pajak Dividen
- Mengintegrasikan pemotongan Pajak Penghasilan (PPh) Final 10% atas dividen (PP 9/2021 & UU HPP) dengan tooltip transparan yang membedakan Yield Bruto vs Yield Netto.
- Format mata uang Rupiah otomatis (Triliun, Miliar, Juta) dengan pemisah ribuan standar Indonesia (`id-ID`).
- Penanganan fallback defensif apabila Yahoo Finance menyediakan keterbatasan data pada submodul neraca dan arus kas emiten BEI tertentu.

---

## Integrasi Komponen
Panel ini dipasang pada `src/components/StockExplorer.jsx`:
- Tab mode navigasi: `activeTab === 'matrix'`
- Dirender melalui `<FinancialMatrixPanel stockDetail={stockDetail} />`
- Tata letak responsif yang mendukung scroll horizontal pada kartu mobile serta tabel matriks densitas tinggi pada desktop.
