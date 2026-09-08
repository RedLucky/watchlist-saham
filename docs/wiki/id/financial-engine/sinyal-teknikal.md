---
title: "Indikator & Sinyal Teknikal"
description: "Formulasi dan penerapan indikator RSI Wilder 14, Supertrend ATR, DEMA, dan MACD"
category: "financial-engine"
tags: ["rsi", "supertrend", "dema", "macd", "indikator-teknikal"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Indikator & Sinyal Teknikal

Implementasi terdapat pada berkas `src/lib/indicators.js`. Seluruh indikator dihitung dari data harga penutupan harian historis murni tanpa bias masa depan (*no lookahead bias*).

---

## 📈 1. J. Welles Wilder's RSI (14 Periode)
Menggunakan penghalusan eksponensial khas Wilder ($\alpha = \frac{1}{14}$):

$$\text{RS} = \frac{\text{Rata-rata Kenaikan}}{\text{Rata-rata Penurunan}}$$
$$\text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$

* $\text{RSI} < 30$: Area Jenuh Jual (*Oversold* - peluang pantulan harga).
* $\text{RSI} > 70$: Area Jenuh Beli (*Overbought* - risiko koreksi).
* **Proteksi Jenuh Beli Ekstrim ($\text{RSI} \ge 75$)**: Untuk melindungi trader dari jebakan beli di puncak harga (*FOMO buying*), emiten dengan $\text{RSI} \ge 75$ otomatis digagalkan dari setup beli (`setup: 'none'`), memperoleh subskor RSI 0, dan penalti setup -20 poin dengan label peringatan `⚠️ Extreme Overbought`.

---

## 🚀 2. Supertrend + DEMA (Double Exponential Moving Average)

### Double EMA (20 Periode)
Memangkas keterlambatan (*lag*) secara signifikan dibandingkan SMA tradisional:
$$\text{DEMA} = 2 \times \text{EMA}(20) - \text{EMA}(\text{EMA}(20))$$

### Supertrend (Periode: 10, Multiplier: 3.0)
* $\text{ATR}$ (Average True Range) dihitung selama 10 periode.
* Pita Atas = $\frac{\text{High} + \text{Low}}{2} + (3.0 \times \text{ATR})$
* Pita Bawah = $\frac{\text{High} + \text{Low}}{2} - (3.0 \times \text{ATR})$
* **Sinyal Bullish (+1)**: Harga penutupan menembus dan bertahan di atas pita pembatas.
* **Pemicu Combo**: `STRONG_BUY` aktif saat Harga > Supertrend DAN Harga > DEMA 20 dengan konfirmasi lonjakan volume.

---

## 📊 3. MACD (12, 26, 9)
* $\text{Garis MACD} = \text{EMA}(12) - \text{EMA}(26)$
* $\text{Garis Sinyal} = \text{EMA}(\text{Garis MACD}, 9)$
* $\text{Histogram} = \text{Garis MACD} - \text{Garis Sinyal}$
* **Fresh Golden Cross ($\text{hist}_t > 0 \land \text{hist}_{t-1} \le 0$)**: Menandai momentum awal pembalikan tren naik (*early markup*), memberikan **bonus +10** pada skor setup teknikal.
* **Dead Cross ($\text{hist}_t < 0 \land \text{hist}_{t-1} \ge 0$)**: Menandai momentum melemah dan memotong sinyal ke bawah, memberikan **penalti -15** pada skor setup teknikal.

---

## 🎯 4. Bollinger Bands & Kompresi Volatilitas (Squeeze)
* $\text{Pita Tengah} = \text{SMA}(20)$
* $\text{Pita Atas / Bawah} = \text{SMA}(20) \pm (2.0 \times \sigma)$
* $\text{Bandwidth} = \frac{\text{Pita Atas} - \text{Pita Bawah}}{\text{Pita Tengah}}$
* **Pemicu Bollinger Squeeze**: Ketika $\text{Bandwidth} \le 0.12$ (12%), volatilitas mengalami kompresi ketat. Mesin skoring teknikal memberikan **bonus +10** untuk mendeteksi potensi ledakan breakout eksplosif.

---

## 🛡️ 5. Presisi Setup Trading & Manajemen Risiko

Implementasi terdapat pada `src/lib/tradeSetup.js`. Seluruh batasan harga mematuhi fraksi harga resmi Bursa Efek Indonesia (`getIDXPriceStep`).

### 1. Stop Loss Dinamis Berbasis Volatilitas (ATR & Supertrend)
Mencegah terjadinya *shakeout* prematur pada saham ber-beta tinggi dengan tetap menjaga modal secara disiplin:
$$\text{ATR Stop Loss} = \text{Entry Low} - (1.5 \times \text{ATR}_{14})$$
* **Batasan Dinamis**: $\text{Stop Loss} = \max(\text{Entry Low} \times 0.92, \, \min(\text{Fixed \% SL}, \, \text{ATR Stop Loss}))$
* **Penyangga Supertrend**: Jika pita bawah Supertrend tersedia dan $\ge \text{Entry Low} \times 0.92$, dijadikan level penopang struktural.
* **Aturan Baku**: Stop Loss wajib berjarak minimal 2 fraksi harga di bawah $\text{Entry Low}$ dan batas toleransi penurunan maksimal $-8\%$.

### 2. Target Price (Take Profit) Terjangkar Resisten Swing High
Bukan sekadar target persentase kaku, level ambil untung disinkronkan dengan resisten *swing high* 20 hari terakhir:
$$\text{Target} = \max(\text{Raw Target}, \, \text{Swing Resistance}_{20} - \text{Fraksi Harga})$$
* Memasang TP 1 tick tepat di bawah level resisten memastikan peluang *fill* order lebih tinggi sebelum tekanan jual memicu pembalikan arah.

