# Chronological Wiki Log

All changes, ingests, and architectural evolutions of the wiki are recorded here.

---

## [2026-09-16] feat | AI-Driven Pension Portfolio Generation & Knapsack Lot Optimizer
- Developed Bounded Integer Knapsack Solver (`src/lib/lotOptimizer.js`) ensuring zero overbudget and 98–99.9% budget absorption into 100-share IDX lots.
- Created `POST /api/pension/ai-generate` endpoint integrating local `llama.cpp` CFP persona with multi-factor fundamental candidate filtering.
- Whitelisted `/api/pension/preset` and `/api/pension/ai-generate` in Edge proxy (`src/proxy.js`) to allow public unauthenticated retirement simulations.
- Calibrated Qwen token budget (`maxTokens: 850`, strict no `<think>` tags) to generate concise, un-truncated JSON in ~40-70 seconds on CPU.
- Upgraded `PensionCalculator.jsx` with `✨ Optimasi AI` gradient action button, interactive loading animation, and expandable AI Portfolio Thesis & Advice Card.
- Published architectural and quantitative knowledge pages: `docs/wiki/en/financial-engine/pension-portfolio.md` and Indonesian mirror.
- Added comprehensive unit tests in `tests/pensionAi.test.js` (132 passing tests total).

## [2026-09-16] feat | Local AI Research Engine, Interactive Discord Bot & Knowledge Wiki Ingest
- Integrated local `llama.cpp` inference engine (`docker-compose.ai.yml`, Qwen 4B GGUF) with hardware optimization for Intel 14th Gen P-Cores (6 threads, flash attention).
- Built asynchronous queue worker (`src/scripts/ai-worker.js`) utilizing `AiResearchQueue`, `AiStockResearch`, and telemetry audit logs in `AiAuditLog`.
- Implemented real-time dual-engine financial news aggregation (`src/lib/ai/search.js`: Bing News RSS + Google News RSS) with 90-day freshness filters.
- Launched two-way interactive Discord Bot (`src/scripts/discord-bot.js`) featuring natural language ticker extraction (NLP), 30-day smart research caching, and rich embed summaries.
- Published architectural knowledge pages: `docs/wiki/en/architecture/ai-engine.md` and `docs/wiki/en/trading-system/discord-bot.md`.

## [2026-09-08] feat | Fresh MACD Golden/Dead Cross & RSI Extreme Overbought Guard
- Enhanced `calculateMACD` in `src/lib/indicators.js` to compute `prevHistogram`, `isGoldenCross`, and `isDeadCross`.
- Integrated Fresh MACD Golden Cross (+10 setup bonus) and Dead Cross (-15 setup penalty) in `src/lib/scoring/technical.js`.
- Implemented RSI Extreme Overbought Guard ($\text{RSI} \ge 75$) in `src/lib/signals/styleSignal.js` and `src/lib/scoring/technical.js` to reject setups (`setup: 'none'`) and prevent retail FOMO buying at cyclical tops.
- Added comprehensive unit tests in `tests/indicators.test.js` and `tests/scoring.test.js` (82 passing tests).

## [2026-09-07] feat | Time Stop P/L Resolution & 100% Win Rate Measurement
- Eliminated ambiguous `CLOSED` status in `src/lib/recommendationTracker.js` (Solution 1).
- Time Stop exits beyond `maxHoldingDays` now evaluate realized P/L: $\text{exitPrice} \ge \text{entryPrice}$ resolves to `WIN (Time)`, while $\text{exitPrice} < \text{entryPrice}$ resolves to `LOSS (Time)`.
- Updated `src/components/HistoryPanel.jsx` status badges to distinguish `WIN (TP)` vs `WIN (Time)` and `LOSS (SL)` vs `LOSS (Time)`.
- Updated Discord rich embed alerts to notify on Time Stop profit or cut-balance events.
- Migrated legacy `CLOSED` database records into respective `WIN` / `LOSS` classifications.

## [2026-09-04] feat | Technical Precision, ATR Stop Loss, and Indicator Upgrades
- Added Volatility-Adaptive Stop Loss using $1.5 \times \text{ATR}_{14}$ & Supertrend bounds in `src/lib/tradeSetup.js`.
- Added 20-day swing high resistance-anchored Take Profit in `src/lib/tradeSetup.js`.
- Integrated Bollinger Bands Volatility Squeeze detection (`bandwidth <= 0.12`) with bonus setup scoring in `src/lib/scoring/technical.js`.
- Calibrated multi-tier dynamic turnover thresholds (Option B: Rp 250M for Scalping/Swing, Rp 1B for Defensive/Dividend, Rp 150M for Growth, Rp 50M for Custom).
- Expanded unit test coverage in `tests/tradeSetup.test.js` and `tests/scoring.test.js` to 76 passing tests.

## [2026-09-03] init | Initialized LLM Wiki Knowledge Base
- Created modular Wiki architecture (`docs/wiki/`) in English (`en/`) and Indonesian (`id/`).
- Documented system architecture (Next.js 16, Prisma, Postgres, Plus Jakarta Sans, RTK token killer).
- Documented quantitative models (Graham valuation, Altman Z, Piotroski F, Wilder RSI, Supertrend DEMA).
- Documented order lifecycle and waiting buy limit matching simulation.
- Configured mandatory loading directive in `AGENTS.md`.
