---
title: "Mesin Valuasi Relatif (RV) & Komparasi Peers Bloomberg"
description: "Spesifikasi arsitektural dan matematis untuk benchmarking emiten institusional, pemeringkatan sub-sektor industri, dan komparasi valuasi relatif pasar modal Indonesia (BEI)."
category: "financial-engine"
tags: ["valuasi-relatif", "bloomberg-rv", "komparasi-peers", "peringkat-subsektor", "best-in-class"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Mesin Valuasi Relatif (RV) & Komparasi Peers Bloomberg

## 1. Ikhtisar & Tujuan Institusional

Dalam riset ekuitas institusional (terinspirasi dari fungsi terminal Bloomberg `RV <GO>`), sebuah rasio valuasi tidak pernah dinilai secara terisolasi. Rasio Price-to-Earnings (PER) sebesar $12\times$ mungkin tampak sangat murah untuk saham teknologi bervolume pertumbuhan tinggi, namun bisa tergolong mahal untuk sektor utilitas atau komoditas siklikal.

**Mesin Valuasi Relatif (RV)** menyediakan komparasi otomatis berdampingan (*side-by-side*) antara saham target dengan 3–4 kompetitor langsung teratas yang berada pada sub-sektor (atau sektor) yang sama di Bursa Efek Indonesia (BEI):
- Menilai apakah premi atau diskon harga saham dapat dibenarkan oleh tingkat pengembalian modal (*Return on Equity* / ROE) dan margin laba bersih.
- Menentukan pemimpin **Terbaik di Kelasnya (*Best-in-Class*)** pada metrik profitabilitas, dividen, dan kesehatan solvabilitas.
- Mencegah jebakan nilai (*value trap*) dengan membandingkan valuasi saham target terhadap median kompetitor sektor sejenis.

---

## 2. Algoritma Pemilihan Emiten Pembanding (Peers)

Ketika sebuah saham dianalisis via `GET /api/stocks/[ticker]`:
1. **Spesifikasi Sub-Sektor**: Mencari emiten aktif yang tidak delisting dengan nilai `subSector` yang sama (misal: `bank`, `coal mining`, `telecommunication`).
2. **Pembobotan Likuiditas & Turnover**: Mengurutkan kandidat berdasarkan nilai transaksi harian (`turnover: 'desc'`) agar perbandingan dilakukan terhadap pemimpin pasar yang likuid.
3. **Penyempurnaan Sektor**: Jika sub-sektor memiliki kurang dari 3 emiten, sistem melengkapinya dengan saham berlikuiditas tertinggi dari `sector` induk.
4. **Normalisasi Data**: Mengabaikan PER negatif (emiten merugi) dari pemeringkatan valuasi murah agar perusahaan merugi tidak disalahartikan sebagai saham berharga diskon.

---

## 3. Metrik yang Dievaluasi & Kriteria Best-in-Class

| Metrik | Kode | Kriteria Terbaik (*Best-in-Class*) | Alasan Finansial |
|---|---|---|---|
| **PER (TTM)** | `per` | PER positif terendah ($\min_{s > 0}$) | Kelipatan laba paling murah terhadap laba bersih saat ini. |
| **PBV** | `pbv` | PBV positif terendah ($\min_{s > 0}$) | Diskon terdalam terhadap nilai buku aset bersih. |
| **ROE (%)** | `roe` | ROE tertinggi ($\max$) | Efisiensi laba bersih maksimal per Rupiah ekuitas investor. |
| **NPM (%)** | `npm` | Net Profit Margin tertinggi | Efisiensi biaya operasional dan kekuatan penetapan harga (*pricing power*). |
| **Dividend Yield** | `dividendYield` | Yield dividen tertinggi ($\max$) | Distribusi arus kas dividen pasif paling menguntungkan. |
| **DER** | `der` | Debt-to-Equity terendah | Beban utang dan risiko gagal bayar paling minimal. |
| **Graham MoS** | `marginOfSafety` | MoS positif tertinggi | Margin keamanan terbesar di bawah Nilai Wajar Graham. |
| **Skor Komposit** | `score` | Skor tertinggi (0–100) | Keseimbangan faktor fundamental dan tren teknikal terbaik. |

---

## 4. Rangkuman Komparasi Otomatis

Komponen ini secara dinamis merangkum simpulan riset institusional dalam bahasa alami:
- **Keunggulan ROE**: Menyoroti ketika saham target melampaui seluruh pesaingnya dalam efisiensi modal.
- **Valuasi terhadap Median**: Menilai apakah PER saham target lebih murah dari median kompetitor:
  $$\text{Undervalued Relatif} = \text{PER}_{\text{target}} < \text{Median}(\text{PER}_{\text{peers}})$$
- **Keunggulan Dividen**: Menandai saham dengan yield dividen tertinggi di antara pesaingnya.

---

## 5. Integrasi Antarmuka & Jembatan Komparasi

Komponen ditampilkan pada `StockExplorer.jsx`:
- **Navigasi Langsung**: Mengklik kode ticker kompetitor akan langsung membuka dossier analisis lengkap untuk saham tersebut.
- **Jembatan Komparasi Lengkap**: Mengklik tombol `⚖️ Buka Komparasi Lengkap` akan secara otomatis memasukkan seluruh saham pembanding ke dalam tab komparasi *head-to-head*.

