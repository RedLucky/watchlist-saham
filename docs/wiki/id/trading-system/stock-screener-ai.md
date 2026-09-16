# Stock Screener Bertenaga AI: Penyaringan Bahasa Alami & Sintesis Strategi

## 1. Ikhtisar & Arsitektur Utama
Fitur **Stock Screener AI** memungkinkan pencarian saham di Bursa Efek Indonesia (BEI) berbasis teks bahasa alami bebas (*Natural Language Screening*).

Tanpa perlu mengatur banyak slider filter secara manual, investor dapat mengetikkan kriteria investasi kompleks (misal: *"Cari saham sektor perbankan dengan dividen yield di atas 5%, ROE minimal 15%, dan akumulasi asing"*).

Model bahasa lokal (`llama.cpp` via `src/lib/ai/client.js`) secara cerdas mengurai maksud pengguna menjadi format JSON kuantitatif presisi, yang kemudian dieksekusi oleh mesin screener terhadap data fundamental dan KSEI Smart Money.

---

## 2. Skema Ekstraksi Kuantitatif AI
Kueri bahasa alami dikonversi menjadi batasan matematis terstruktur:

```json
{
  "sector": "Financials",
  "minDividendYield": 5.0,
  "minRoe": 15.0,
  "minOpm": null,
  "maxPer": 15.0,
  "maxPbv": 1.5,
  "maxDer": 1.5,
  "smartMoneyOnly": true,
  "syariahOnly": false,
  "explanation": "Menyaring saham perbankan dengan yield dividen >= 5%, ROE >= 15%, dan akumulasi smart money."
}
```

### 2.1. Ketahanan & Fallback Heuristik
Jika server AI lokal sedang offline atau sibuk, sistem secara otomatis mengaktifkan *heuristic keyword matcher* (`buildHeuristicFallbackCriteria`) sehingga proses pencarian saham tidak pernah gagal atau mengalami *crash*.

---

## 3. Algoritma Pemeringkatan & Pembobotan
Saham yang lolos kriteria diurutkan berdasarkan skor kecocokan komposit ($0 - 99$):
- **ROE $\ge 15\%$**: $+15$ poin
- **Dividend Yield $\ge 5\%$**: $+15$ poin
- **$\text{PER} \le 12\text{x}$**: $+10$ poin
- **$\text{PBV} \le 1.5\text{x}$**: $+10$ poin
- **Akumulasi Smart Money / Asing**: $+10$ poin

---

## 4. Detail Implementasi
- **Rekayasa Prompt & Ekstraktor**: `src/lib/ai/screenerPrompt.js`.
- **Rute API**: `POST /api/screener/ai`.
- **Antarmuka UI**: `src/components/AiScreenerBar.jsx` yang terpasang di atas tabel pada `src/components/StockScreener.jsx`.
- **Pengujian Unit**: `tests/aiScreener.test.js` (198/198 pengujian lulus 100%).

