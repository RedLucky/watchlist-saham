---
title: "Model Valuasi & Nilai Wajar"
description: "Formulasi matematis Nilai Wajar Benjamin Graham, Altman Z-Score, Piotroski F-Score, dan pembatasan CAGR"
category: "financial-engine"
tags: ["graham", "altman-z", "piotroski", "cagr", "nilai-wajar"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Model Valuasi & Nilai Wajar

Aplikasi mengintegrasikan rumus-rumus value investing klasik yang disesuaikan dengan karakteristik pasar modal negara berkembang (BEI).

---

## 📐 1. Nilai Wajar Intrinsik Benjamin Graham

Rumus revisi Graham yang mempertimbangkan proyeksi pertumbuhan laba serta imbal hasil obligasi pemerintah:

$$\text{Nilai Wajar} = \frac{\text{EPS} \times (8.5 + 2 \times g) \times 4.4}{Y}$$

Keterangan variabel:
* $\text{EPS}$: Laba Bersih per Saham 12 Bulan Terakhir (Trailing 12 Months).
* $g$: Pertumbuhan laba tahunan majemuk (CAGR) 3–5 tahun, **dibatasi secara ketat maksimal 25.0%** untuk menghindari distorsi spekulatif.
* $4.4$: Baseline historis imbal hasil obligasi korporasi AAA era Benjamin Graham.
* $Y$: Imbal hasil acuan Surat Utang Negara 10 Tahun (SUN 10Y ~6.5%–7.0%). Memiliki hubungan terbalik: semakin tinggi yield obligasi, semakin rendah nilai wajar saham.

### Margin of Safety (MoS)
$$\text{MoS (\%)} = \frac{\text{Nilai Wajar} - \text{Harga Pasar}}{\text{Nilai Wajar}} \times 100\%$$

* $\text{MoS} \ge 30\%$: Sangat Murah (Diskon tinggi / Undervalued).
* $0\% < \text{MoS} < 30\%$: Valuasi Wajar.
* $\text{MoS} \le 0\%$: Mahal / Overvalued.

---

## 🏛️ 2. Angka Benjamin Graham (Graham Number)
$$\text{Graham Number} = \sqrt{22.5 \times \text{EPS} \times \text{BVPS}}$$
Di mana $\text{BVPS}$ adalah Nilai Buku per Saham ($\frac{\text{Harga}}{\text{PBV}}$).

---

## 🛡️ 3. Altman Z-Score (Pendeteksi Risiko Kebangkrutan)
Disesuaikan untuk korporasi non-manufaktur di pasar berkembang:
* $Z > 2.90$: **Zona Aman** (Struktur keuangan sangat sehat).
* $1.23 \le Z \le 2.90$: **Zona Abu-Abu** (Risiko tekanan finansial moderat).
* $Z < 1.23$: **Zona Bahaya** (Rentan terhadap gagal bayar utang).
* *Catatan Sektor Perbankan*: Altman Z-score dinonaktifkan untuk bank (diberi nilai netral 3.0) karena karakteristik neraca bank berbasis simpanan nasabah.

---

## 📋 4. Piotroski F-Score (Skala 0–9)
Menilai perbaikan atau penurunan kondisi fundamental emiten:
* **Skor 8–9**: Fundamental Sangat Kuat (Kandidat Super Compounder).
* **Skor 5–7**: Kondisi Finansial Stabil / Netral.
* **Skor 0–4**: Fundamental Memburuk (Risiko tinggi).
