---
title: "Bloomberg ALRT: Rule-Based Smart Alert Engine & Discord Trigger"
description: "Real-time automated alert evaluation for ARA/ARB proximity, deep valuation discounts, dividend traps, and unusual volume spikes."
category: "trading-system"
tags: ["bloomberg", "alrt", "smart-alerts", "discord-webhook", "market-signals", "volume-spike"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Bloomberg ALRT: Rule-Based Smart Alert Engine & Discord Trigger

## 1. Overview & Institutional Rationale

Institutional trading desks deploy event-driven alerting engines to immediately detect market anomalies, extreme liquidity events, and high-probability valuation setups without manual chart surveillance.

The **Bloomberg ALRT (`ALRT <GO>`)** system synthesizes multi-factor conditions into prioritized actionable signals:
1. **Auto-Rejection (ARA / ARB) Proximity**: Sisa $\le 2$ ticks to ARA/ARB or locked limit hit.
2. **PBND Valuation Deep Discount**: Statistical P/E Z-Score $\le -1.5\text{SD}$ identifying rare accumulation zones.
3. **Dividend Trap Risk**: High dividend yield ($\ge 9.0\%$) coupled with low cash safety score ($< 45$).
4. **Volume Surge**: Volume spike exceeding $\ge 2.5\times$ the 5-day moving average.

---

## 2. Rule Triggers & Priority Levels

| Rule ID | Severity Level | Trigger Condition | Notification Message |
| :--- | :--- | :--- | :--- |
| **`NEAR_ARA`** | `CRITICAL` / `WARNING` | Ticks to ARA $\le 2$ or at ARA | Kenaikan maksimal mendekati atau menyentuh ARA |
| **`NEAR_ARB`** | `CRITICAL` / `WARNING` | Ticks to ARB $\le 2$ or at ARB | Tekanan jual ekstrem mendekati atau mengunci ARB |
| **`VALUATION_DISCOUNT`** | `INFO` | P/E Band Z-Score $\le -1.5\text{SD}$ | Valuasi diskon historis ekstrem (-2SD) |
| **`DIVIDEND_TRAP`** | `WARNING` | Yield $\ge 9\%$ and Safety $< 45$ | Waspada kejatuhan harga ex-date drop |
| **`VOLUME_SPIKE`** | `INFO` | Today's Volume $\ge 2.5\times \text{Avg}_5$ | Lonjakan volume transaksi di atas kebiasaan |

---

## 3. Implementation Details

- Pure evaluation engine: `src/lib/smartAlertEngine.js`.
- Payload formatter: `formatDiscordAlertEmbed` creating rich Discord embeds.
- API integration: Returned in `GET /api/stocks/[ticker]` as `stockDetail.smartAlerts`.
- Visual presentation: Live alert banners inside `src/components/AutoRejectionLadderPanel.jsx`.
- Unit test suite: `tests/smartAlert.test.js`.
