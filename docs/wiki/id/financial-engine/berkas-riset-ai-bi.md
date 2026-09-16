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

## 3. Integrasi Antarmuka (UI)
- **Komponen**: `src/components/BloombergIntelligencePanel.jsx`.
- **Kartu Ringkasan**: Menampilkan konsensus, ulasan valuasi, dan tren secara instan.
- **Eksplorasi Lengkap**: Tombol aksi langsung membuka modal riset AI komprehensif tanpa harus berpindah halaman.
