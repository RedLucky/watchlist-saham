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
