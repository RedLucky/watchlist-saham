# Bloomberg Intelligence (BI): AI Stock Research Dossier Engine

## 1. Overview & Core Architecture
The **Bloomberg Intelligence (BI)** module aggregates institutional-grade equity research summaries directly into the Stock Explorer workspace.

Mirroring Bloomberg's `BI` proprietary analysis, this engine integrates the application's offline LLM inference model (`aiStockResearch` via `llama.cpp`) to synthesize complex multi-dimensional company fundamentals, consensus recommendation (`BUY`, `HOLD`, `SELL`), intrinsic valuation models, and trend momentum into an executive dossier.

---

## 2. Dossier Attributes & Schema
Stored within PostgreSQL via Prisma (`model AiStockResearch`), each research record contains:
- **`ticker`**: Primary IDX ticker symbol (e.g. `BBCA`, `TLKM`).
- **`buyHoldSell`**: Quantitative consensus action recommendation (`BUY`, `HOLD`, or `SELL`).
- **`score`**: Composite rating index ($0 - 100$).
- **`valuation`**: Narrative summary of fair value, margin of safety, and multiple expectations.
- **`trend`**: Capital flow, smart money accumulation, and technical breakout commentary.
- **`content`**: Full institutional research memo (Markdown formatted).
- **`createdAt`**: Generation timestamp for recency validation.

---

## 3. UI Integration & Real-time Action Flow
- **Panel**: `src/components/BloombergIntelligencePanel.jsx`.
- **Summary Cards**: At-a-glance view of consensus verdict, valuation commentary, and trend insights.
- **Interactive Deep Dive**: One-click action button (`onOpenFullResearch`) instantly pops open the full `aiResearch` markdown dialog without leaving the Stock Explorer interface.
