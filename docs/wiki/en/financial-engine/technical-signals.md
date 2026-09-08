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
* **Extreme Overbought Guard ($\text{RSI} \ge 75$)**: To prevent retail FOMO buying at cyclical tops, any ticker with $\text{RSI} \ge 75$ is immediately rejected from actionable setups (`setup: 'none'`), receives an RSI subscore of 0, and incurs a -20 setup penalty with warning detail `⚠️ Extreme Overbought`.

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
* **Fresh Golden Cross ($\text{hist}_t > 0 \land \text{hist}_{t-1} \le 0$)**: Signals early markup and momentum reversal, awarding a **+10 bonus** to the technical setup score.
* **Dead Cross ($\text{hist}_t < 0 \land \text{hist}_{t-1} \ge 0$)**: Signals momentum breakdown and bear shift, triggering a **-15 penalty** to the technical setup score.

---

## 🎯 4. Bollinger Bands & Volatility Squeeze
* $\text{Middle Band} = \text{SMA}(20)$
* $\text{Upper / Lower Band} = \text{SMA}(20) \pm (2.0 \times \sigma)$
* $\text{Bandwidth} = \frac{\text{Upper Band} - \text{Lower Band}}{\text{Middle Band}}$
* **Bollinger Squeeze Trigger**: When $\text{Bandwidth} \le 0.12$ (12%), volatility has contracted into a tight coil. The technical scoring engine awards a **+10 bonus** for primed explosive breakout setups.

---

## 🛡️ 5. Precision Trade Setup & Risk Management

Located in `src/lib/tradeSetup.js`. All price boundaries strictly adhere to official Indonesia Stock Exchange (IDX) price ticks (`getIDXPriceStep`).

### 1. Volatility-Adaptive Stop Loss (ATR & Supertrend)
Prevents premature shakeouts on volatile mid/small caps while maintaining strict capital defense:
$$\text{ATR Stop Loss} = \text{Entry Low} - (1.5 \times \text{ATR}_{14})$$
* **Dynamic Bound**: $\text{Stop Loss} = \max(\text{Entry Low} \times 0.92, \, \min(\text{Fixed \% SL}, \, \text{ATR Stop Loss}))$
* **Supertrend Floor**: If Supertrend Lower Band is available and $\ge \text{Entry Low} \times 0.92$, it serves as structural support.
* **Hard Rule**: Stop Loss is capped at a minimum of 2 IDX price ticks below $\text{Entry Low}$ and cannot exceed $-8\%$ maximum drawdown.

### 2. Resistance-Anchored Target Price (Take Profit)
Instead of arbitrary percentage targets, take profit levels anchor directly to the 20-day swing high resistance:
$$\text{Target} = \max(\text{Raw Target}, \, \text{Swing Resistance}_{20} - \text{Tick Size})$$
* Placing TP 1 tick below resistance guarantees higher execution fill rates before selling pressure triggers reversal.

