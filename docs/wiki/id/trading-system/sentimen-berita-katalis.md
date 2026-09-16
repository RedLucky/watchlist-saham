# Bloomberg NSENT: Skor Sentimen Berita & Pelabelan Katalis Pasar

## 1. Ikhtisar & Tujuan Utama
Modul **Bloomberg NSENT** menghitung skor sentimen kuantitatif berita pasar modal (ternormalisasi dari $-100$ hingga $+100$) serta mengekstraksi tag katalis penggerak harga saham secara otomatis dari aliran berita bursa.

Arus berita dan tajuk media sering memengaruhi keputusan likuiditas pasar. NSENT memberikan indikator objektif apakah narasi pasar saat ini sangat optimis, netral, atau dibayangi risiko litigasi/gagal bayar.

---

## 2. Logika Penilaian Sentimen & Klasifikasi

### 2.1. Pembobotan Kata Kunci & Agregasi
Setiap artikel dianalisis menggunakan leksikon keuangan khusus IDX dalam bahasa Indonesia & Inggris:
- **Kata Kunci Positif** (`laba`, `dividen`, `rekor`, `melonjak`, `ekspansi`, `akuisisi`, `untung`, `pertumbuhan`, `kontrak`, `buyback`, `profit`, `growth`): bernilai $+15$ poin.
- **Kata Kunci Negatif** (`rugi`, `anjlok`, `merosot`, `pailit`, `gugatan`, `suspensi`, `utang`, `bengkak`, `default`, `denda`, `penipuan`, `loss`, `lawsuit`): bernilai $-18$ poin (penalti risiko defensif).

Skor dinormalisasi ke rentang $[-100, +100]$:

$$\text{Skor Ternormalisasi} = \max\left(-100, \min\left(100, \text{round}\left(\frac{\sum \text{Skor Artikel}}{N}\right)\right)\right)$$

### 2.2. Ambang Batas Klasifikasi
- **Skor $\ge +40$**: "Sangat Positif / Katalis Kuat 🚀" (`emerald`)
- **Skor $> +10$**: "Sentimen Positif 🟢" (`emerald`)
- **$-10 \le \text{Skor} \le +10$**: "Netral ⚖️" (`blue`)
- **Skor $< -10$**: "Sentimen Negatif 🔴" (`rose`)
- **Skor $\le -40$**: "Sangat Negatif / Berita Buruk 🚨" (`rose`)

### 2.3. Pendeteksian Tag Katalis Korporasi
Filter regex mendeteksi katalis utama:
- **Dividen Tunai 💰**: Cum-date, DPS, pembagian dividen.
- **Kinerja Laba 📈**: Pertumbuhan omzet, laba bersih, ekspansi margin EBITDA.
- **Aksi Korporasi 🏛️**: Merger, akuisisi, rights issue, buyback saham.
- **Ekspansi Bisnis 🏭**: Proyek baru, kontrak kerja, belanja modal (capex).
- **Risiko Hukum / Utang ⚠️**: Gugatan PKPU, gagal bayar obligasi, sanksi suspensi bursa.

---

## 3. Detail Implementasi
- **Mesin Komputasi**: `src/lib/newsSentimentEngine.js`.
- **Rute API**: Disajikan pada `GET /api/stocks/[ticker]` sebagai properti `newsSentiment`.
- **Komponen UI**: Terpasang di `src/components/BloombergIntelligencePanel.jsx` pada tab Stock Explorer.
