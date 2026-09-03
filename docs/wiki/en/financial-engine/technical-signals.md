---
title: "Technical Indicators & Signals"
description: "Formulas and implementations for Wilder RSI 14, Supertrend ATR, DEMA, and MACD"
category: "financial-engine"
tags: ["rsi", "supertrend", "dema", "macd", "bollinger"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Technical Indicators & Signals

Located in `src/lib/indicators.js`. All technical indicators are calculated from historical daily close prices without lookahead bias.

---

## 📈 1. J. Welles Wilder's RSI (14 Periods)
Uses exponential smoothing (Wilder's Smoothing Factor $\alpha = \frac{1}{14}$), not simple moving averages:

$$\text{RS} = \frac{\text{Smoothed Gain}}{\text{Smoothed Loss}}$$
$$\text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$

* $\text{RSI} < 30$: Oversold (Rebound opportunity).
* $\text{RSI} > 70$: Overbought (Correction risk).

---

## 🚀 2. Supertrend + DEMA (Double Exponential Moving Average)

### Double EMA (20 Periods)
Reduces lag significantly compared to traditional SMA:
$$\text{DEMA} = 2 \times \text{EMA}(20) - \text{EMA}(\text{EMA}(20))$$

### Supertrend (Period: 10, Multiplier: 3.0)
* $\text{ATR}$ (Average True Range) computed over 10 periods.
* Upper Band = $\frac{\text{High} + \text{Low}}{2} + (3.0 \times \text{ATR})$
* Lower Band = $\frac{\text{High} + \text{Low}}{2} - (3.0 \times \text{ATR})$
* **Bullish Signal (+1)**: Daily close breaks and holds above trailing upper band.
* **Combo Trigger**: `STRONG_BUY` when Price > Supertrend AND Price > DEMA 20 with expanding volume.

---

## 📊 3. MACD (12, 26, 9)
* $\text{MACD Line} = \text{EMA}(12) - \text{EMA}(26)$
* $\text{Signal Line} = \text{EMA}(\text{MACD Line}, 9)$
* $\text{Histogram} = \text{MACD Line} - \text{Signal Line}$
