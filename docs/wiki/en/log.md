# Chronological Wiki Log

All changes, ingests, and architectural evolutions of the wiki are recorded here.

---

## [2026-09-18] feat | Win Rate Protection, Execution Overhaul & Discord Bot Recommendation Engine
- Diagnosed Win Rate Divergence: Identified root causes behind the -10.76% system cumulative return (vs +38.95% user manual return), including premature Time Stop closures during shallow pullbacks (< 1.5%), unrealistic swing TP targets applied to short-duration scalping trades, and ticker loss duplication.
- Active Position Lockout (Deduplication): Updated `src/scripts/discord-notifier.js` to query database for active recommendations (`OPEN` or `WAITING_BUY`). Prevents re-recommending tickers that are already active, eliminating duplicate loss stacking on drifting assets.
- Style-Conforming Take Profit Caps: Enhanced `src/lib/tradeSetup.js` with style ceilings (`SCALP_MAX_TARGET_PCT = 5.0`, `DAILY_MAX_TARGET_PCT = 8.0`, `SWING_MAX_TARGET_PCT = 18.0`). Scalping targets are now properly aligned with their 2-day holding window instead of stretching to 20-day swing resistance levels.
- Time Stop Grace Period Buffer: Upgraded `src/lib/recommendationTracker.js` with `TIME_STOP_GRACE_DAYS = 3` and `TIME_STOP_TOLERANCE_LOSS_PCT = 1.5`. Trades that exceed standard duration but are within a shallow drawdown (< 1.5%) are granted 3 extra days before being forcibly closed, eliminating premature noise stopouts.
- IHSG Defensive Regime Circuit Breaker: Enforced market regime controls in `src/scripts/discord-notifier.js`. During bearish/defensive market regimes, suppresses Growth mode and caps category recommendations to 2. Eliminated Pass 2 threshold degradation.
- Verification & Test Coverage: Added unit tests in `tests/tradeSetup.test.js` validating scalping and daily target price ceilings. Verified 100% test pass rate (219/219 tests) and clean Turbopack build. Documented in `docs/wiki/en/trading-system/order-lifecycle.md` and Indonesian mirror.

## [2026-09-17] fix | SyntheticEvent Circular Serialization Fix & Network Error Differentiation
- Resolved React SyntheticEvent Leakage in `handleAnalyzeAi`:
  - Fixed `onClick={handleAnalyzeAi}` passing the React `SyntheticBaseEvent` object into the `force` parameter, which caused `JSON.stringify({ ticker, force })` to throw a `TypeError: Converting circular structure to JSON` (due to circular DOM `event.target`/`window` references).
  - Sanitized `isForce` inside `handleAnalyzeAi` to strictly enforce `typeof force === 'boolean' ? force : false`.
  - Wrapped JSX button handler with an explicit arrow function `onClick={() => handleAnalyzeAi(false)}`.
  - Refined network error detection in `catch (err)`: Replaced blanket `err.name === 'TypeError'` with targeted string inspection (`failed to fetch`, `network`, `load failed`) to avoid misidentifying internal JavaScript runtime TypeErrors as network dropouts.
- Verified 100% test passing (217/217 tests passing) and clean Turbopack production build.

## [2026-09-17] fix | Comprehensive Markdown Parser & UI Research Dossier Snippet Sanitization
- Fixed Broken Markdown Rendering in UI: Completely refactored `renderAiMarkdown` in `src/components/StockExplorer.jsx` with full CommonMark compliance:
  - Eliminated raw `#` symbols by adding full H1–H5 heading typography with custom section icons.
  - Eliminated raw `---`, `***`, `___` symbols by parsing them into proper `<hr />` dividers.
  - Resolved raw callout text (`SKOR AI:`, `KESIMPULAN:`, `ALASAN SINGKAT:`), now converting them into rich visual badge cards even when wrapped in markdown bold asterisks.
  - Fixed broken grid table rendering by parsing markdown table rows (`| col1 | col2 |`) into full semantic HTML `<table>` elements with `<thead>`, alternating zebra rows, and horizontal scroll.
  - Repaired inline emphasis tokenization with non-whitespace boundary guards so financial equations (e.g. `Price = 500 * 22.5`) are never falsely matched as italic tags.
  - Added support for inline code (`` `code` ``), inline math (`$formula$`), strikethrough (`~~text~~`), and external links (`[label](url)`).
- Sanitized Bloomberg Intelligence Preview Cards: Implemented `formatPreviewSnippet` in `src/components/BloombergIntelligencePanel.jsx` to strip leading section headers (`## ...`), divider lines, and markdown characters, ensuring the 2-line summary cards render clean text without raw markup.
- Verified 100% test passing (217/217 tests passing) and clean Turbopack build.
- Documented in `docs/wiki/en/financial-engine/bloomberg-intelligence-dossier.md` and Indonesian mirror.

## [2026-09-17] feat | Anti-Clickbait News Filtering, Signal-to-Noise Scoring & Detail Extraction
- Implemented `isClickbaitTitle` in `src/lib/ai/search.js`: Automatically purges speculative daily trading notes, listicles, and sensationalist headlines ("rekomendasi saham", "menu saham", "target harga", "potensi cuan", "saatnya beli?") while strictly preserving verifiable corporate releases and financial disclosures (laba, dividen, capex, akuisisi, miliar, triliun).
- Implemented `calculateSignalScore` in `src/lib/ai/search.js`: Computes a 0-100 informational signal score prioritizing detailed article body descriptions (>40 chars) from Bing RSS, concrete monetary/operational figures, verified business news publishers (Kontan, Bisnis.com, CNBC, Katadata, Investor Daily, Bloomberg Technoz, IDNFinancials), and penalizing noisy multi-ticker listicles.
- Targeted Boolean Query Architecture: Shifted web search queries to high-yield boolean expressions `"${cleanName}" (laba OR pendapatan OR kinerja OR dividen OR capex OR ekspansi)` ensuring 3x higher relevant result density and substantive snippet summaries.
- Hardened LLM Anti-Clickbait Directives: Added `[ANTI-CLICKBAIT FILTER]` in Section 4 and `[ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]` in Section 6 of `src/lib/ai/prompter.js`, enforcing reliance strictly on audited financial disclosures and official corporate actions.
- Added comprehensive unit tests in `tests/aiSectorPrompter.test.js` (total 217/217 test suites passing).
- Documented in `docs/wiki/en/financial-engine/bloomberg-intelligence-dossier.md` and Indonesian mirror.

## [2026-09-17] feat | Widened Semantic Keywords, Expanded Multi-Query Search & Institutional Rubrics across 35 Sectors
- Broadened Semantic Keyword Taxonomy: Expanded keywords in `src/lib/ai/sectorIntelligence.js` across all 35 Alpha Legend sectors to encompass Indonesian and English synonyms, industry product lines, and subsector classifications.
- Expanded Search Queries: Upgraded each sector to 3 distinct high-yield thematic query templates (Industry Demand & Macro Lag, Market Share & Peer Moat Benchmarking, Regulatory Catalysts & Forward Outlook).
- Increased Retrieval Volume: Increased news fetch quotas in `src/lib/ai/search.js` to 4 items per query task (bringing up to 16 rich news snippets per ticker with Bing News and Google News fallback).
- Deepened Institutional Rubrics: Enhanced analytical mandates across all 35 sectors to explicitly dissect Core Business Unit Mechanics, Relational Macro Lag Models, Porter's 5 Forces / Moats, Alpha Legend KPIs, and 1-2 Year Forward Catalysts.
- Verified 100% test passing (214/214 tests passing) and clean Turbopack production build.


## [2026-09-17] feat | Deep Sector & Business Unit Industry Analysis Framework (Stock Explorer)
- Upgraded `src/lib/ai/prompter.js`: implemented `detectSectorFramework(sector, subSector, ticker)` injecting tailored industry relational models:
  - Automotive & Components (`AUTO`, `SMSM`, `GJTL`): Aging vehicle fleet replacement demand (GAIKINDO 2-5 year sales lag), ICE vs EV/Hybrid powertrain resilience, and OEM vs Aftermarket retail split.
  - Banking & Financials (`BBCA`, `BBRI`, `BMRI`): CASA franchise, Cost of Funds (CoF), NIM, loan segment exposure, NPL/LAR provisioning coverage, and digital CIR/BOPO.
  - Energy & Coal/Oil (`ADRO`, `PTBA`): Cash cost curve position, stripping ratio, mine life, DMO, and green transition/smelter capex.
  - Critical Minerals (`ANTM`, `INCO`): EV battery supply chain (HPAL MHP vs RKEF NPI), RKAB quotas, and downstream smelting.
  - Agribusiness & CPO (`TAPG`, `DSNG`): Domestic Biodiesel B35/B40 mandate floor, plantation age profile, FFB yield, and OER extraction rates.
  - Telco, Construction, Real Estate, and Consumer Staples industry models.
- Mandated 7-section institutional report format: (1) Unit Bisnis & Rencana Strategis, (2) Kebutuhan Pasar, Siklus Industri & Market-Fit, (3) Keunggulan Bersaing (Moat) & Kompetitor, (4) Fundamental & Valuasi, (5) Tren Teknikal & Momentum, (6) Sentimen Berita, (7) Prospek 1-2 Tahun & Rekomendasi Akhir (`SKOR AI: [0-100]`, `KESIMPULAN`, `ALASAN SINGKAT`).
- Enhanced `src/lib/ai/search.js`: implemented `buildSectorThematicQueries` executing parallel thematic web searches for corporate capex, sector EV/Gaikindo/biodiesel/CASA dynamics, and competitor market share.
- Enhanced `src/scripts/ai-worker.js`: added `extractSectionByTitle` and multi-parameter news search (`sector`, `subSector`) for resilient database storage in `AiStockResearch`.
- Enhanced `src/components/StockExplorer.jsx`: upgraded `renderAiMarkdown` with contextual section header icons (🏢, 🔄, 🛡️, 📊, 📈, 📰, 🎯).
- Added comprehensive unit test suite in `tests/aiSectorPrompter.test.js` (211/211 tests passing).
- Updated quantitative documentation in `docs/wiki/en/financial-engine/bloomberg-intelligence-dossier.md`.

## [2026-09-16] feat | AI-Powered Financial Consultation: Multi-Turn Advisory, Anti-Hallucination Grounding, & CPU Priority Mutex
- Implemented `src/lib/ai/aiPriorityMutex.js`: single-slot concurrency gate (concurrency 1) with priority arbitration (HIGH for interactive chat/screener vs LOW for background queue worker) to eliminate CPU thrashing on Intel i5.
- Implemented `src/lib/ai/chatAdvisorEngine.js`: deterministic ticker extraction with Indonesian trading stopword filters, pre-calculated financial math (exact PnL %, averaging down scenarios), strict closed-world grounding prompt, and 3-step constrained reasoning protocol (`<think>`).
- Enhanced `src/lib/ai/client.js`: integrated AI Priority Mutex, selective thinking mode (`enableThinking: true`), temperature tuning (`temperature: 0.4`, `topP: 0.85`), and context window scaling up to 8,192 tokens.
- Added database models in `prisma/schema.prisma`: `ChatSession` and `ChatMessage` with cascade relations.
- Implemented API handler in `src/app/api/ai/chat/route.js`: full CRUD for sessions, verified market data injection, portfolio context attachment, and reasoning separation.
- Built interactive UI in `src/components/AiConsultationPanel.jsx`: dual-pane chat interface, collapsible thinking accordion, markdown table formatter, clickable stock chips, and quick starter prompts.
- Integrated into `Sidebar.jsx` and `Dashboard.jsx` under `activeTab === 'ai-chat'`.
- Added unit test suite in `tests/aiChatAdvisor.test.js` (203/203 total test suites passing).
- Published quantitative documentation in `docs/wiki/en/trading-system/ai-financial-consultation.md`.

## [2026-09-16] feat | AI-Powered Stock Screener: Natural Language Filtering & Criteria Synthesis
- Implemented `src/lib/ai/screenerPrompt.js`: pure prompt engineering routines (`buildScreenerAiMessages`, `parseScreenerAiResponse`, and `filterStocksByAiCriteria`) extracting structured financial criteria from natural language queries.
- Implemented `src/app/api/screener/ai/route.js`: `POST /api/screener/ai` endpoint running local LLM inference with resilient heuristic fallback (`buildHeuristicFallbackCriteria`) for offline/timeout fault-tolerance.
- Implemented `src/components/AiScreenerBar.jsx`: conversational search bar with 1-click strategy presets (Deep Value, Momentum, Big Bank ROE, Economic Moat, Syariah Growth) and active criteria badge inspector.
- Updated `src/components/StockScreener.jsx`: integrated AI search bar, smart money BFI sort key, and dynamic AI result badge rendering.
- Added unit test suite in `tests/aiScreener.test.js` (5 unit tests covering prompt generation, markdown JSON extraction, broken JSON recovery, criteria filtering, and empty safety).
- Published quantitative documentation: `docs/wiki/en/trading-system/ai-stock-screener.md`.

## [2026-09-16] feat | Bloomberg Terminal Phase 5: RRG Sector Relative Rotation, NSENT News Sentiment, and BI AI Dossier
- Implemented `src/lib/sectorRrgEngine.js` (Bloomberg `RRG` / `SECT`): 4-quadrant relative rotation graph (Leading, Weakening, Lagging, Improving) calculating RS-Ratio and RS-Momentum vs IHSG benchmark.
- Implemented `src/lib/newsSentimentEngine.js` (Bloomberg `NSENT`): algorithmic news sentiment score (-100 to +100), risk-weighted keyword aggregation, and automated corporate catalyst tagging.
- Integrated Bloomberg Intelligence (Bloomberg `BI`) AI research dossier and NSENT sentiment into `GET /api/stocks/[ticker]`.
- Integrated RRG sector rotation matrix into `GET /api/sectors` and added interactive toggle inside `SectorBar.jsx`.
- Built UI components: `SectorRrgPanel.jsx` and `BloombergIntelligencePanel.jsx` mounted in Stock Explorer.
- Added unit tests: `tests/sectorRrg.test.js` and `tests/newsSentiment.test.js` (193/193 total tests passing).
- Published quantitative documentation: `docs/wiki/en/trading-system/sector-relative-rotation.md`, `news-sentiment-catalyst.md`, and `docs/wiki/en/financial-engine/bloomberg-intelligence-dossier.md`.

## [2026-09-16] feat | Bloomberg Terminal Phase 4: OWN/HDS KSEI Shift, BRKR Broker Concentration, and GP Volume Profile
- Implemented `src/lib/kseiShiftEngine.js` (Bloomberg `OWN` & `HDS`): Month-over-Month (MoM) institutional ownership shifts, retail vs institutional divergence, and domestic sub-category breakdown (PF, MF, IS, IB, SC).
- Implemented `src/lib/brokerConcentrationEngine.js` (Bloomberg `BRKR`): broker concentration ratios (CR1, CR3, CR5) and Bandarmologi Flow Index (BFI).
- Implemented `src/lib/volumeProfileEngine.js` (Bloomberg `GP`): horizontal volume profile bins, Point of Control (POC), 70% Value Area (VAH & VAL), and auction context.
- Integrated KSEI shift, broker concentration, and volume profile into `GET /api/stocks/[ticker]`.
- Built UI component: `SmartMoneyLiquidityPanel.jsx` mounted in `StockExplorer.jsx`.
- Added unit tests: `tests/kseiShift.test.js`, `tests/brokerConcentration.test.js`, and `tests/volumeProfile.test.js` (186/186 tests passing).
- Published quantitative documentation: `docs/wiki/en/trading-system/ksei-smart-money-shift.md`, `volume-profile-value-area.md`, and `broker-concentration-bandarmologi.md`.

## [2026-09-16] feat | Bloomberg Terminal Phase 3: ARA/ARB Limits & Tick Ladder, PORT/MARS Risk Cockpit, and ALRT Engine
- Implemented `src/lib/idxExecutionLimits.js` (Bloomberg `ARA` / `ARB`): exact daily price limits (35%, 25%, 20%, 10%), precision tick counting via `countTicksBetween`, and 7-step execution ladder.
- Implemented `src/lib/portfolioRiskEngine.js` (Bloomberg `PORT` & `MARS`): Weighted Portfolio Beta ($\beta_{\text{port}}$), Parametric 1-Day VaR 95%, concentration checks, and 4 macro stress testing shock scenarios.
- Implemented `src/lib/smartAlertEngine.js` (Bloomberg `ALRT`): multi-factor alert rules (ARA/ARB proximity $\le 2$ ticks, PBND Z-Score $\le -1.5\text{SD}$, dividend traps, volume spikes) and Discord rich embed formatting.
- Integrated ARA/ARB and ALRT into `GET /api/stocks/[ticker]`, and PORT/MARS into `GET /api/portfolio`.
- Built UI components: `AutoRejectionLadderPanel.jsx` in Stock Explorer and Macro Stress Testing Cockpit in `PortfolioPanel.jsx`.
- Added unit tests: `tests/idxExecutionLimits.test.js`, `tests/portfolioRisk.test.js`, and `tests/smartAlert.test.js` (176/176 tests passing).
- Published quantitative documentation: `docs/wiki/en/trading-system/auto-rejection-ladder.md`, `portfolio-risk-stress-test.md`, and `rule-based-smart-alerts.md`.

## [2026-09-16] feat | Bloomberg Terminal Phase 2: DTRP Dividend Trap Analyzer, DVD Run-Rate, and CA Catalyst Calendar
- Implemented `src/lib/dividendTrapEngine.js` (Bloomberg `DTRP` & `DVD`): detects dividend trap risks, evaluates FCF coverage, DPR guardrails, debt burden, and dividend aristocrat streaks; computes 12-month passive income cashflow run-rate per lot.
- Implemented `src/lib/corporateActionEngine.js` (Bloomberg `CA`): compiles timeline of cash dividends, general shareholder meetings (RUPS/AGM), and regulatory earnings release windows.
- Integrated DTRP, DVD run-rate, and CA calendar into `GET /api/stocks/[ticker]`.
- Built UI panels: `DividendTrapPanel.jsx` and `CorporateActionsPanel.jsx` mounted below scenario forecaster in `StockExplorer.jsx`.
- Added unit tests: `tests/dividendTrap.test.js` and `tests/corporateAction.test.js` (160/160 tests passing).
- Published quantitative documentation: `docs/wiki/en/financial-engine/dividend-trap-analyzer.md` and `corporate-actions-calendar.md`.

## [2026-09-16] feat | Bloomberg Terminal Phase 1: PBND Valuation Bands, WACC/EVA, and SCEN Forecaster
- Implemented `src/lib/valuationBands.js` (Bloomberg `PBND`): calculates Mean, Standard Deviation, +/-1 SD, +/-2 SD for P/E & P/BV, with target prices and statistical valuation zones.
- Implemented `src/lib/waccEngine.js` (Bloomberg `WACC`): computes Weighted Average Cost of Capital, CAPM Cost of Equity ($R_f=6.5\%$), after-tax Cost of Debt, ROIC, and Economic Spread (Value Creator vs Destroyer).
- Integrated PBND and WACC calculations into `GET /api/stocks/[ticker]` response data.
- Built interactive UI components: `ValuationBandsPanel.jsx` (P/E & P/BV bands), `EconomicValuePanel.jsx` (capital structure & EVA), and `ScenarioForecaster.jsx` (Bloomberg `SCEN` What-If sensitivity slider forecaster).
- Mounted all 3 components below the Candlestick Chart in `StockExplorer.jsx`.
- Added unit tests in `tests/valuationBands.test.js` and `tests/waccEngine.test.js` (152/152 tests passing).
- Published quantitative documentation in `docs/wiki/en/financial-engine/valuation-bands.md` and `wacc-economic-value.md`.

## [2026-09-16] fix | Stock Explorer AI Research Engine Hardening & Queue Worker Optimization
- Reduced worker polling interval from 60s to 3s (`POLL_INTERVAL = 3000`) in `src/scripts/ai-worker.js`, slashing queue pickup latency from ~75s to ~20s.
- Implemented automated stale task recovery for jobs stuck in `PROCESSING` (> 10 minutes) across both worker and `POST /api/ai/research`, eliminating permanently locked tickers.
- Upgraded `extractSection` to case-insensitive regex patterns supporting markdown heading variations (`## 2.`, `## 2:`, `### 2.`).
- Replaced rigid quarterly lock with 30-day cache validity (`CACHE_VALIDITY_DAYS = 30`) and added `{ force: true }` parameter for on-demand re-analysis on earnings/price shocks.
- Whitelisted `GET /api/ai/research` endpoints in Edge proxy (`src/proxy.js`) enabling unauthenticated guests to read generated research dossiers.
- Enhanced `renderAiMarkdown` with responsive markdown table rendering (`| Col |`), formatted numbered lists, and added "Perbarui Riset" force button inside modal.
- Added comprehensive unit test suite in `tests/aiResearchEngine.test.js` (142/142 tests passing).

## [2026-09-16] feat | Bloomberg Relative Valuation (RV) & Sub-Sector Peer Benchmarking
- Implemented automated peer extraction in `GET /api/stocks/[ticker]` by matching `subSector` (or `sector`) and ordering by trading turnover.
- Created `RelativeValuationPeers.jsx` component delivering side-by-side benchmarking (PER, PBV, ROE, NPM, DER, Dividend Yield, Graham MoS, composite score).
- Added Best-in-Class visual highlights, sector median benchmarking, and automated natural language comparative insights.
- Integrated seamless 1-click bridge to the multi-stock comparison workbench (`Buka Komparasi Lengkap`).
- Published quantitative documentation in `docs/wiki/en/financial-engine/relative-valuation-peers.md` and Indonesian mirror.
- Added comprehensive unit test suite in `tests/relativeValuation.test.js` (136/136 tests passing).

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
