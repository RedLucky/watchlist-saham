---
title: "Pension Portfolio Optimization & Knapsack Lot Engine"
description: "Mathematical formulation and AI-driven architecture for multi-asset FIRE retirement planning, stock selection, and bounded discrete knapsack lot allocation."
category: "financial-engine"
tags: ["pension", "fire", "knapsack-optimizer", "lot-allocation", "ai-generation", "dividend-compounding"]
last_updated: "2026-09-16"
version: "1.0.0"
---

# Pension Portfolio Optimization & Knapsack Lot Engine

## 1. Overview & Objective

The **Pension Calculator (FIRE Planner)** empowers investors to systematically accumulate wealth towards Financial Independence and Early Retirement. It balances three asset classes based on the user's risk tolerance:
- **Government Bonds (SBN)**: Fixed, risk-free baseline yield (~6.5% p.a.).
- **Equities (Saham)**: High-conviction compounders delivering dividend cashflow and capital growth.
- **Money Market Funds (RDPU)**: Highly liquid cash buffer absorbing residual monthly savings.

Asset allocation breakdown per profile:
- **Conservative**: 60% SBN / 20% Saham / 20% RDPU
- **Moderate**: 50% SBN / 35% Saham / 15% RDPU
- **Aggressive**: 30% SBN / 60% Saham / 10% RDPU

---

## 2. The Discrete Lot Problem in Indonesian Equities (BEI)

In the Indonesia Stock Exchange, equities trade strictly in integer lots of 100 shares:
$$\text{Lot Cost}_i = \text{Price}_i \times 100$$

Standard percentage rebalancing creates fractional share recommendations (e.g. 1.4 lots) that cannot be executed in the market. Naive rounding produces:
1. **Budget Overspending**: Total purchases exceed the user's monthly savings budget.
2. **Capital Underutilization**: Significant cash remains uninvested because rounding down leaves large idle sums.

---

## 3. AI-Directed Knapsack Lot Optimization (`src/lib/lotOptimizer.js`)

To guarantee maximum capital efficiency, the system pairs qualitative AI stock picking with a **Bounded Integer Knapsack Solver**:

```mermaid
flowchart TD
    AI["AI Local Engine (Qwen GGUF)"] -->|"1. Selects 4-5 Stocks\n2. Assigns Target Weights (%)\n3. Ranks Priority (1 to 5)"| Solver["optimizeDiscreteLots(stocks, equityBudget)"]
    
    subgraph KnapsackSolver ["Deterministic Solver Pipeline"]
        Solver --> P1["Phase 1: Proportional Allocation\nFloor(Budget * TargetWeight / LotCost)"]
        P1 --> Residual["Calculate Residual Idle Cash\nremainingCash = Budget - TotalCost"]
        Residual --> P2{"Is TotalLots == 0?"}
        P2 -->|Yes (Small Budget)| MinLot["Allocate 1 Lot to Most Affordable Top-Priority Stock"]
        P2 -->|No| P3["Phase 3: Greedy Cash Absorption\nPrioritize highest return / priority rank"]
        MinLot --> P3
        P3 --> Final["Final Output: Discrete Lots\nZero Overbudget + 98-99.9% Utilization"]
    end
```

### Mathematical Constraints & Guarantee:
1. **Zero Overspend Guarantee**:
   $$\sum_{i=1}^{N} (\text{Lots}_i \times \text{Price}_i \times 100) \le \text{Equity Budget}$$
2. **Minimal Idle Cash**:
   $$\text{Residual Cash} < \min_{i \in \text{Affordable}} (\text{Lot Cost}_i)$$
   Total budget utilization regularly reaches **98.0% to 99.9%**.

---

## 4. AI Stock Selection Endpoint (`POST /api/pension/ai-generate`)

The endpoint accepts:
- User inputs: `riskProfile`, `currentAge`, `targetAge`, `totalBudget`, `monthlyExpense`, `sbnAvailable`.
- Flow:
  1. Queries top 25 fundamentally sound, dividend-paying stocks from the database (filtering out delisted, negative FCF, or high retail concentration $>50\%$).
  2. Prompts the local `llama.cpp` model acting as a Senior Certified Financial Planner (CFP) & FIRE Specialist.
  3. Returns a structured JSON response containing:
     - `portfolioThesis`: Overarching investment narrative tailored to the user's retirement horizon.
     - `strategyAdvice`: Execution and dividend reinvestment guidance.
     - `stocks`: Array of 4–5 stocks with `targetWeightPct`, `role` (e.g. *Bedrock Core Compounder*, *High Yield Anchor*), and `priorityRank`.
  4. Feeds the AI weights into `optimizeDiscreteLots` to generate exact lot counts.
  5. Provides a **Graceful Fallback**: If the local AI server is offline, the system automatically falls back to deterministic multi-factor scoring without UI interruption.

---

## 5. Security Proxy Exemption & Inference Telemetry

### Proxy Exemption (`src/proxy.js`)
To enable prospective and unregistered investors to use the Pension FIRE Calculator and generate AI-optimized portfolios without authentication friction:
- `/api/pension/preset` and `/api/pension/ai-generate` are explicitly exempted from Edge JWT verification.
- Personalized tracker storage mutations (`POST /api/pension`) remain strictly authenticated to prevent unauthorized data access.

### Concise Prompt Engineering & Token Budget
Reasoning models (such as Qwen 4B / DeepSeek) can exhaust completion token limits if unconstrained:
- The system prompt explicitly bans `<think>` reasoning tags and enforces concise output (thesis $\le$ 2 sentences, advice $\le$ 1 sentence, rationale $\le$ 10 words).
- `maxTokens` is calibrated to **850**, keeping generation at ~350-450 tokens to guarantee clean, un-truncated JSON with zero parse errors.
- Every inferencing event is recorded in the `AiAuditLog` table with model name, latency, prompt tokens, and completion tokens for operational observability.

