---
title: "Smart Money Flow & KSEI Analysis"
description: "Bandarmologi mechanics, KSEI scriptless holding analysis, and volume spike detection"
category: "trading-system"
tags: ["smart-money", "ksei", "bandarmologi", "institutional-flow"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Smart Money Flow & KSEI Analysis

Evaluates whether big institutions (Smart Money) are accumulating or distributing shares before significant price movements occur.

---

## 🏛️ 1. KSEI Scriptless Distribution Metrics
Located in `src/lib/scoring/smartMoney.js` and `src/scripts/sync-ksei.js`.

* **Institutional Ownership Ratio**:
  - Banks, Mutual Funds (Reksadana), Insurance (Asuransi), and Pension Funds (Dana Pensiun).
  - A persistent rise in institutional share count while retail share count drops indicates **Accumulation**.
* **Foreign Flow (Asing)**:
  - Net buy / net sell by foreign institutional participants over 5, 20, and 60 trading days.

---

## 📊 2. Volume Spike & Anomaly Detection
Located in `src/lib/scoring/technical.js`.

* **Baseline Calculation**: Computes 5-day average volume strictly **before** the current day to avoid volume self-inclusion bias:
  $$\text{Baseline Vol} = \text{Average}(\text{Volumes}[-6 \dots -1])$$
* **Accumulation Spike**: When $\text{Today's Volume} \ge 2.0 \times \text{Baseline Vol}$ with price closing in the upper 40% of the daily candle range.
