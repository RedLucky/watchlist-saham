---
title: "Order Lifecycle & Win Rate Tracking"
description: "Specification for Limit Order Waiting Buy queue, order execution matching, and Win Rate calculation"
category: "trading-system"
tags: ["order-lifecycle", "waiting-buy", "win-rate", "risk-reward"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Order Lifecycle & Win Rate Tracking

Located across `src/app/api/stocks/route.js`, `src/app/api/history/route.js`, and `src/components/HistoryPanel.jsx`.

---

## 🔄 The 3-State Execution Lifecycle

To prevent premature Win/Loss calculations before a stock is actually bought, the system supports real limit order queuing:

```
                       [ Input Entry Price ]
                                │
                 ┌──────────────┴──────────────┐
     Checkbox Checked                Checkbox Unchecked (Default)
     (Already Bought)                (Limit Order Simulation)
                 │                               │
                 ▼                               ▼
          Status: OPEN                   Status: WAITING_BUY
                 │                               │
                 │                ┌──────────────┴──────────────┐
                 │          Market price dips              Times out without
                 │       (currentPrice <= entry)             touching entry
                 │                │                               │
                 │                ▼                               ▼
                 └───────► Status: OPEN (Matched!)          Status: EXPIRED
                                  │                         (Zero Win Rate Penalty)
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
         [ currentPrice >= TP ]            [ currentPrice <= SL ]
                 │                                 │
                 ▼                                 ▼
             Status: WIN                       Status: LOSS
```

### 1. `WAITING_BUY` (Pending Limit Queue)
* Assigned by default when a user clicks "Pantau" with the "Sudah Beli di Harga Ini" checkbox left **unchecked**.
* System does NOT evaluate Win or Loss during this state.
* **Matching Trigger**: When daily market price dips to or below the entry price ($\text{currentPrice} \le \text{entryPrice}$), the order matches and moves to `OPEN`.
* **Expiry Trigger**: If market price does not touch the entry level within the strategy's `maxHoldingDays` (3–14 days), status becomes `EXPIRED`. It is excluded from the Win Rate divisor.

### 2. `OPEN` (Active Position)
* Assigned immediately if the user **checks** "Sudah Beli di Harga Ini", or automatically upon a `WAITING_BUY` match.
* Actively monitors daily price action against trading plan targets.

### 3. `WIN` vs `LOSS` vs `CLOSED`
* **`WIN`**: $\text{currentPrice} \ge \text{targetPrice}$ (Take Profit reached).
* **`LOSS`**: $\text{currentPrice} \le \text{stopLoss}$ (Cut Loss triggered).
* **`CLOSED`**: Position held beyond `maxHoldingDays` without hitting TP or SL (Time Stop exit at market price).

---

## 🎯 Win Rate Formula
The real win rate accurately evaluates completed trades:

$$\text{Win Rate} = \frac{\text{Total Trades WIN}}{\text{Total Trades WIN} + \text{Total Trades LOSS}} \times 100\%$$

*Unmatched orders (`WAITING_BUY`) and expired unreached queues (`EXPIRED`) do not distort the trading accuracy ratio.*
