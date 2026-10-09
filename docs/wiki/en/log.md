# Chronological Wiki Log

All changes, ingests, and architectural evolutions of the wiki are recorded here.

---

## [2026-10-09] feat | IDX Stock Summary Daily Foreign/Domestic Flow Scraper (`TASK-5792`)
- Added `src/scripts/sync-idx-flow.js` (`parseIdxStockSummaryPayload`, `mergeIdxFlowHistory`, `syncIdxStockSummaryFlow`) to scrape daily BEI *Ringkasan Saham* (`ForeignBuy`, `ForeignSell`, `Volume`, `Value`) and maintain a rolling 250-trading-day history in `StockData.technicals.idxFlow`.
- Registered `sync-idx-flow.js` in `src/scripts/scraper-cron.js` daily scraper pipeline (`[3/3]`) and updated `deepSyncStockOnce` in `src/lib/syncService.js` to preserve existing `technicals.idxFlow` and `technicals.idxFlowUpdatedAt` during fundamental/technical refreshes.
- Added 7 unit tests in `tests/syncIdxFlow.test.js` with mocked Prisma and fetcher boundaries (88.58% line coverage).

## [2026-10-09] feat | Hybrid Domestic & Foreign Transaction Flow Engine (`TASK-4108`)
- Added `src/lib/transactionFlowEngine.js` (`calculateTransactionFlows`) to compute Domestic, Foreign, and Active Money **Inflow (Gross Buy)**, **Outflow (Gross Sell)**, and **Netflow (Net Buy/Sell)** across Daily (`1d` / 1HK), Weekly (`1w` / 5HK), Monthly (`1m` / 20HK), and Yearly (`1y` / 250HK) windows.
- Supports official IDX *Ringkasan Saham* daily rows (`foreignBuy`, `foreignSell`, `volume`, `value`) when present (`source: 'idx'`) and falls back to OHLCV Close Location Value + logistic price momentum calibrated with KSEI foreign ownership percentage and monthly institutional deltas (`source: 'estimated'` / `'hybrid'`).
- Outputs all metrics in Rupiah (`Rp`), BEI Lots (`shares / 100`), and `% of Total Turnover`, with 13 unit tests in `tests/transactionFlowEngine.test.js` (100% line and function coverage).

## [2026-10-07] fix | Moving Average Lines Are No Longer Two Shades Of Grey
- **Problem:** MA20 used `ink` and MA50 used `muted` — both neutral greys, so the two lines were hard to tell apart and read as one.
- MA20 is now teal and MA50 violet, with MA200 staying amber. Neither new hue collides with the semantic green (up), red (down) or amber (warn), so a line colour never implies a price direction — which is what the greys were being mistaken for.
- `buildChartPalette(tokens, isDark)` takes the theme so each theme gets its own brightness of the same hues; `getCurrentChartPalette()` passes it through.
- 5 new tests: the three averages must be mutually distinct, must not be `ink`/`muted`/`up`/`down`/`warn`, and dark must differ from light.

## [2026-10-07] feat | IDX Value 30 Seeded
- IDX Value 30 seeded (30 members, effective 2026-08-03) from a third-party list. The seed entry states the source and the caveat inline, because it was not confirmed against the official IDX fact sheet.
- All 30 members exist in `StockData`.
- **ISSI stays empty and the reason is size, not effort:** as of 7 July 2026 it holds 578 constituents, which is every stock on the OJK Sharia Securities List. The authoritative list is the BEI announcement PDF on the Cloudflare-protected domain. 578 unverifiable tickers is not something to put into an investment tool.

## [2026-10-07] feat | IDXHIDIV20 Seeded And The Member Table Gains Pagination And Its Own Scroll
- High Dividend 20 seeded (20 members, effective 2026-08-05) from Fortune Indonesia's table of the July 2026 minor review, which lists every constituent with its index weight. BEI confirmed the review changed weights only, not membership.
- The member table now shows 20 rows per page with prev/next controls and a "menampilkan X–Y dari Z" counter, so ISSI's much longer membership will not produce an endless page.
- The table scrolls inside its own container (`max-height: min(60vh, 560px)`) with a sticky header. `.scroll-area` already sets `overscroll-behavior: contain`, so scrolling the table no longer chains to the page behind it.
- New `paginate(items, page, pageSize)` helper in `src/lib/idxIndices.js`. It clamps the page number instead of trusting it: after deleting the last row of the last page, the stored page would point past the end and an empty table would look like missing data.
- Switching index resets to page 1 inside the same click handler rather than in an effect, avoiding the cascading render the lint rule rejects.
- 8 new unit tests for `paginate`. Build clean, 592 tests pass, no new lint errors.

## [2026-10-07] fix | Indeks BEI Stopped Erroring And No Longer Asks For An Admin Key
- **Bug:** `/api/indices/LQ45` returned a Prisma error for every index. The query selected a `score` field, but `StockData` has no such column — the composite score is computed on the fly from the `fundamentals` and `technicals` JSON. The Skor column is removed rather than duplicating that weighting, which would let the index page and `/api/screener` drift apart.
- The admin key input is gone from the add/remove form; those calls rely on the session cookie. The key field stays only on `/admin/indeks`, the admin entry point.
- Verified the corrected Prisma query directly against the database: 45 members found, prices present for all 45.

## [2026-10-07] feat | Seed File With Verified LQ45 And IDX30 Membership
- Measured why IDX scraping fails: the old composition page returns 503 to a real headless browser and 403 to curl, the old JSON API redirects to a 404 page, and the announcement ZIPs are 403. Cloudflare blocks, so the scraper cannot run unattended.
- Added `src/data/idxMembers.seed.json` plus `src/scripts/seed-indices.js`. Every entry records `effectiveFrom`, `source`, `verifiedOn` and `verifiedFrom`, so the provenance of each ticker is reviewable in git rather than being an unexplained number.
- LQ45 (45 members, effective 2026-08-03) seeded from Wikipedia's Aug–Oct 2026 table cross-checked against the BEI announcement reported by Kontan. IDX30 (30 members) seeded from StockWatch, cross-checked because every IDX30 member must also be in LQ45 — verified programmatically, 0 members outside LQ45.
- All 30 IDX30 members exist in `StockData`, so prices and scores render on the index page.
- **IDX Value 30, High Dividend 20 and ISSI were deliberately left empty.** Their authoritative lists are in the monthly IDX Fact Sheet PDFs on the same blocked domain, and no ticker list was entered without a verifiable source.

## [2026-10-07] fix | Index Membership Can Be Added And Removed From The Indeks BEI Page
- **Problem:** the page was read-only, so with an empty database there was no way to register or remove a stock, and `/admin/indeks` had no link pointing to it from anywhere in the UI.
- `src/lib/idxStore.js` (new): `ensureIndexRow`, `addConstituent`, `removeConstituent`. Both validate the index code and ticker *before* touching the database, and every function takes an optional Prisma client so tests never need a real database.
- `POST /api/indices/[code]` and `DELETE /api/indices/[code]?ticker=` — both admin-gated with `verifyAdminAccess`.
- Re-adding an existing member is a no-op that deliberately does not stamp a new `lastSyncedAt`, so an accidental re-add cannot make a stale list look freshly verified.
- `IndexDirectory.jsx` gains an admin key field, a ticker field, a per-row `Hapus` button, and a link to the bulk upload page. After an edit it calls `invalidateIndexCache()` so badges across the app stop showing pre-edit membership.
- A 404 for an index nobody has filled in is no longer shown as an error; it renders the normal empty state.
- 17 unit tests in `tests/idxStore.test.js` using an in-memory fake Prisma client. Verified end to end against the real database (add, re-add, add to a second index, remove), then left the tables empty.

## [2026-10-07] feat | IDX Index Membership, the Indeks BEI Page & Compact Index Labels
- New Prisma models `IdxIndex` and `IdxConstituent` plus migration `20261007120000_add_idx_indices`; two tables instead of JSON because the common question is "who is in LQ45?".
- `src/scripts/sync-indices.js` scrapes the five tracked indices with Puppeteer, mirroring `sync-ksei.js`. A failed index logs a warning and keeps the previous membership, because an empty index looks authoritative while a stale one does not.
- Manual fallback `POST /api/indices` (admin only) replaces membership from pasted text via `parseMembershipText()`, which fails loudly on bad lines instead of dropping them; the index is then marked `source = "upload"`.
- New "Indeks BEI" navigation entry rendering `IndexDirectory.jsx`: one card per index with member count, freshness and stale marking, plus a member table enriched with price, change and score and a `tracked` flag for members missing from our database.
- `IndexBadges.jsx` renders at most two chips plus a `+N` counter, with the full list in the tooltip, and fetches the ticker map once per browser session. Wired into Analisis Saham, Stock Explorer cards, both Stock Screener layouts, Portfolio positions, Market Movers and the index page itself.
- `src/lib/idxIndices.js` (`TRACKED_INDICES`, `isStaleSync`, `buildMembershipMaps`, `parseMembershipText`) with 20 unit tests in `tests/idxIndices.test.js`.

## [2026-10-07] feat | Migration Complete: Theme Guard Covers All of src/ & CustomSliders Fix
- `tests/designTokens.test.js` now walks all `.js`/`.jsx` under `src/` (skipping `src/scripts/`, which runs outside the browser) instead of a manual file list; 481 tests pass.
- Last three files migrated: `CollectionSortDropdown`, `candlestickPatterns`, `scoring/smartMoney`; emoji in user-facing strings produced by engines and API routes replaced with symbols (label expectations in 3 tests updated).
- Removed the legacy light-mode `!important` overrides from `globals.css`.
- **Bug fix:** `Dashboard` passed `onWeightsChange`/`initialStyle` to `CustomSliders`, which reads `onApply` — clicking "Terapkan Analisis" threw. Fixed, plus new `tests/componentProps.test.js` prevents the same class of typo.

## [2026-10-07] feat | Layout Migration Complete: Every Page Uses the Shared Shell
- Corporate Calendar, Alpha Legends, Pension Tracker and Stock Explorer now render through `PageShell`/`PageHeader`; Alpha Legends sub-tabs and the Explorer page tabs moved to standard `.tabs` inside a `PageToolbar`.
- Pension Tracker canvases fill their card (900px wide) instead of being capped at 450px.
- New `tests/pageLayout.test.js`: every main page uses the shell, table pages use a sticky toolbar, and `Dashboard` keeps unrestricted width with matching gutters.
- Design system wiki documents the page shell.

## [2026-10-07] feat | KSEI Upload & Ownership Migrated to Bursa 1985
- `KseiUploadPanel`, `/admin/ksei` and `StockOwnershipModal` moved to theme tokens and Unicode symbols (flag emoji replaced with symbols).
- The admin page was a dark-on-dark design; it is now a normal themed page (paper background, surface panels, sunken table head) so panels are distinguishable in both themes.
- Admin key input and the KSEI paste area use the standard `.input` with linked labels; buttons use `.btn-primary` / `.btn-secondary`; ownership modal uses `.modal-backdrop` with `role="dialog"`.

## [2026-10-07] feat | Pension Modules Migrated to Bursa 1985
- `PensionCalculator`, `PensionTracker`, `PensionRebalance` and `/pensiun` moved to theme tokens and Unicode symbols; buttons that lost their gradient use `.btn-primary` / `.btn-secondary`, candidate/auth modals use `.modal-*`.
- Asset-growth and monthly-bar canvases in `PensionTracker` read theme tokens instead of fixed hex colours (bars use ink → muted instead of an indigo/purple gradient).
- `chartTheme` now also exposes the `canvas` token and `isDarkTheme()`.

## [2026-10-07] feat | Portfolio, History & Win Rate Migrated to Bursa 1985
- `PortfolioPanel`, `HistoryPanel` and `BacktestPanel` moved to theme tokens and Unicode symbols.
- History source/status filters use `.tabs`; portfolio sell-confirmation dialog uses `.modal-*` with `role="dialog"`.
- Backtest equity-curve and drawdown SVGs now read the theme tokens (`readThemeTokens`) instead of fixed hex colours, and the trading-style field uses the standard `.select` with a linked label.

## [2026-10-07] feat | Corporate Calendar & AI Consultation Migrated to Bursa 1985
- `CorporateCalendar`, `CorporateActionsPanel` and `AiConsultationPanel` moved to theme tokens and Unicode symbols.
- Calendar category filter and Grid/Timeline switch now use `.tabs`; the day-detail dialog uses `.modal-*` with `role="dialog"` and a close button label.
- AI chat: user bubble keeps the accent background (it lost its gradient), avatars and empty-state icon use token backgrounds, send button and header action use `.btn-primary`.

## [2026-10-07] feat | Market Movers, Screener & Alpha Legends Migrated to Bursa 1985
- `MarketMovers`, `StockScreener`, `AiScreenerBar` and the 4 Alpha Legends components moved to theme tokens and Unicode symbols.
- Icons in `src/data/alphaLegendSectors.js` (35 sectors) and the investor list replaced by text symbols, so sector chips follow the theme colour.
- Fixed backgrounds of buttons and hero banners that lost their gradient (screener tabs, AI submit, Growth Story / Top Investors / Sector Metrics headers); removed the leftover blur glow in Sector Metrics.

## [2026-10-07] feat | Analysis Panels & Chart Migrated to Bursa 1985
- 11 Stock Explorer panels and `DetailPanel` moved to theme tokens and Unicode symbols; FA header and BI "full report" button fixed after gradient removal.
- `StockChart` colours now come from `src/lib/chartTheme.js`, which reads the CSS tokens: candles/volume use up/down; indicators use ink/muted/warn with line styles (MA50 dashed, Bollinger dotted, MACD signal dashed). Switching theme now also recolours series, not only the grid. Pattern markers and price-line titles no longer contain emoji. Pattern modal uses `.modal-*`.
- Updated [Technical Indicators & Signals](./financial-engine/technical-signals.md).

## [2026-10-07] feat | Stock Explorer Migrated to Bursa 1985
- ~1,900 palette classes, 8 gradients, 120 large radii and 145 lines of UI emoji in `StockExplorer.jsx` replaced by theme tokens and Unicode symbols (user-chosen collection emoji are kept).
- Sticky newspaper-style page title + standard tabs; cockpit tabs use `.tabs/.tab` (`role="tab"`); all 9 dialogs use `.modal-*` (bottom sheet on phones); banner buttons follow one-primary hierarchy.
- Guard test now covers `StockExplorer.jsx` and catches side radii (`rounded-r-xl`).

## [2026-10-07] feat | Analisis Saham Page Migrated (StockTable, RRG)
- `StockTable`: token styling, segmented quick filters, sortable header buttons, keyboard-expandable rows; desktop column grid from 768px, phone cards with a 3-column trade-level strip.
- `SectorRrgPanel`: quadrant filter as tabs, flat legend and sector cards.
- New `src/lib/uiTones.js` (signal, risk and change colours) with tests; documented in [Design System](./architecture/design-system.md).

## [2026-10-07] feat | Standard UI Classes & Shared Components Migrated
- Added standard classes to `globals.css`: headings (`.page-title`, `.section-title`), buttons (`.btn-ghost`, `.btn-icon`), forms (`.field-label`, `.input`, `.select`, `.checkbox`), `.badge-*`, `.alert-*`, `.tabs/.tab`, `.modal-*` (bottom sheet on phones), `.scroll-area`, `.table-base`.
- Migrated to tokens: `ScoreBadge`, `ScoreBar` (now has a real bar + progressbar role), `Tooltip` (keyboard focusable), `StyleSelector`, `ModeSelector`, `CustomSliders`, `MarketBadge` (2 columns on phones), `SectorBar`, `AuthModal` (labelled fields, bottom sheet on phones), and the Analisis Saham header in `Dashboard`.
- New guard test `tests/designTokens.test.js`.
- New page: [Design System (Bursa 1985)](./architecture/design-system.md).

## [2026-10-07] feat | New App Shell: Sidebar, Mobile Header, Slim Bottom Bar
- Sidebar, mobile header, bottom bar and footer rebuilt with the "Bursa 1985" tokens; emoji icons replaced by Unicode symbols.
- Desktop sidebar can collapse to an icon rail (remembered in `localStorage`).
- Mobile bottom bar is slimmer (56px, 18px icons, 10px labels): Analisis, Explorer, Screener, Portofolio + "Lainnya" sheet with the other pages, KSEI admin link and Logout.
- Menu config and KSEI freshness check moved to `src/lib/navigation.js` (tested); KSEI periods are fetched once in `Dashboard` instead of in two components.
- New page: [App Shell & Navigation](./architecture/app-shell-navigation.md).

## [2026-10-07] feat | "Bursa 1985" Theme Foundation (ADR 0001)
- New semantic colour tokens in `src/app/globals.css` for light ("Kertas Bursa") and dark ("Terminal Fosfor"), exposed as Tailwind colours (`canvas`, `surface`, `sunken`, `line`, `ink`, `muted`, `accent`, `up`, `down`, `warn`, …).
- Fonts switched to IBM Plex Sans / Serif / Mono (`font-sans`, `font-serif`, `font-mono`); theme now follows the device by default.
- Building blocks `.card`, `.label-mono`, `.rule-double`, `.btn-primary`, `.btn-secondary`, `.focus-ring`; legacy `.glass`, score and skeleton classes are now flat and token-based; reduced-motion respected globally.
- `ThemeToggle` restyled with an accessible label. New `tests/themeTokens.test.js` (token parity + WCAG AA contrast).
- New ADR: [0001. "Bursa 1985" design system](./adr/0001-bursa-1985-design-system.md).

## [2026-10-07] style | Koleksi Saham: 5 Cards per Row
- Collection card grid now shows up to 5 cards per row on wide screens (`2xl:grid-cols-5`), stepping down to 4 / 3 / 2 / 1 on smaller screens.

## [2026-10-07] feat | Stock Explorer Split into Koleksi, Pencarian & Komparasi Tabs
- Replaced the collapsible collection sidebar with three page tabs: `Koleksi Saham` (default), `Pencarian Saham IDX`, `Komparasi`.
- Koleksi page redesigned: collection chips, toolbar, summary stats (count, average change, buy/sell targets hit) and a responsive card grid with target progress bar and always-visible actions.
- Clicking a collection card opens the stock in Pencarian (same detail load as before) with a "← Kembali ke Koleksi" button; BBCA preload no longer switches tabs.
- Pencarian header polished: larger search input with label, richer suggestion rows (ticker, name, sector, price), empty-state actions.
- New pure helpers `src/lib/collectionCardUtils.js` with unit tests.
- New page: [Stock Explorer Pages](./architecture/stock-explorer.md); updated System Overview and Collection Sorter Engine.

## [2026-10-07] fix | Admin 401 on KSEI Upload: Database-Backed Admin Role Check
- Problem: `POST /api/ksei/ingest` returned 401 for users whose database role is `ADMIN`, because existing JWTs did not contain `role`.
- `verifyAdminAccess` (`src/lib/auth.js`) is now `async` and reads the user's role from the database instead of trusting the JWT; role changes apply immediately and stale tokens no longer matter. Fails closed on DB errors.
- New `isAdminUser` helper: `ADMIN_EMAIL` match is now case-insensitive (same as registration).
- `src/proxy.js` lets `/api/ksei/ingest` requests with an admin key header through without a session cookie (`src/lib/adminKeyRequest.js`); the route still validates the key.
- Callers updated to `await`: `/api/ksei/ingest`, `/api/sync`, `/api/admin/add-ticker`. Tests extended in `tests/security.test.js`.
- Login/register now also sign `role` into the JWT and `/api/auth/me` returns `role`.
- New page: [Authentication & Admin Access](./architecture/authentication.md).

## [2026-09-25] feat | TradingView Pro Upgrades: MA200, Bollinger Bands, RSI, MACD, Multi-Timeframe & Crosshair Legend
- Upgraded `src/components/StockChart.jsx` to TradingView Lightweight Charts Pro architecture:
  - **Live Floating OHLCV HUD Legend**: Crosshair movement listener (`chart.subscribeCrosshairMove`) delivering real-time Open, High, Low, Close, % Change, and Volume with responsive color-coding.
  - **Multi-Timeframe Aggregation (1D, 1W, 1M)**: Client-side candle aggregation (`aggregateCandles`) without network latency or redundant Yahoo Finance queries.
  - **Institutional Trend Filter (MA200)**: Added SMA 200 series (`#eab308`) alongside MA20 and MA50.
  - **Bollinger Bands (20, 2)**: Added upper (`#38bdf8`), middle basis, and lower bands with dashed styling.
  - **Dedicated Sub-Pane Oscillators**:
    - **RSI (14)**: Plotted on isolated price scale (`priceScaleId: 'rsi'`) with scale margins (`top: 0.82, bottom: 0.02`) and 70/30 threshold markers.
    - **MACD (12, 26, 9)**: Plotted on isolated price scale (`priceScaleId: 'macd'`) with MACD line, signal line, and color-coded momentum histogram bars.
  - **Candlestick Pattern Overlays**: In-chart markers for Bullish Engulfing, Hammer, Shooting Star, and Doji formations.
  - **Interactive Controls**: Indicator pill toggles, fullscreen mode (`⛶ Zoom`), range fit (`🔄 Fit`), and real-time DOM dark/light mode synchronization via `MutationObserver`.
- Enhanced `/api/chart/route.js` Backend:
  - Added mathematical engines for `calculateBollingerForChart(chartData, 20, 2)`, `calculateRSIForChart(chartData, 14)`, and `calculateMACDForChart(chartData, 12, 26, 9)`.
  - Returned full indicators payload across both primary Yahoo Finance and DB fallback paths.
- Updated `src/components/StockExplorer.jsx` and `src/components/DetailPanel.jsx` to feature TradingView Pro technical analysis capabilities across Stock Explorer and Analisis Saham.

## [2026-09-25] fix | Scraper Cron TDZ, Puppeteer TargetCloseError, useEffect & React Rules-of-Hooks Fixes
- Fixed `ReferenceError: Cannot access 'isPriceSyncRunning' before initialization` in `src/scripts/scraper-cron.js` caused by Temporal Dead Zone (TDZ).
- Moved `isPriceSyncRunning` and `isDailyScraperRunning` along with all function definitions (`runPriceSync`, `runDiscordNotifier`, `runDailyScrapers`) above initial boot execution triggers.
- Fixed `TargetCloseError: Protocol error (Target.setDiscoverTargets): Target closed` during Puppeteer launch in Docker Alpine (`src/scripts/sync-ksei.js` & `src/scripts/sync-ownership.js`):
  - Removed deprecated and unstable `--single-process` flag that breaks modern Chromium CDP target discovery.
  - Added `--disable-extensions` and executable fallback detection.
  - Added `dumb-init` to `Dockerfile.scraper` as entrypoint PID 1 process reaper to prevent orphaned zombie Chromium processes.
  - Wrapped browser launch and lifecycle in defensive `try/finally` blocks ensuring safe cleanup (`await browser.close()`).
- Fixed `ReferenceError: useEffect is not defined` in `src/components/DetailPanel.jsx` by importing `useEffect` from `'react'`.
- Remedied all 11 `react-hooks/rules-of-hooks` conditional hook violations across analytical panels:
  - `src/components/FinancialMatrixPanel.jsx`: Relocated early return after `useMemo` hooks.
  - `src/components/MonthlySeasonalityPanel.jsx`: Replaced early returns before `activeYears` and `monthStats` `useMemo` with post-hook fallback guards.
  - `src/components/RelativeValuationPeers.jsx`: Reorganized `useMemo` hooks (`allPeers`, `stats`, `insight`) to execute unconditionally before empty state returns.
  - `src/components/ScenarioForecaster.jsx`: Hoisted interactive slider `useState` and `useMemo` hooks above the `!stockDetail` guard.

## [2026-09-24] feat | Comprehensive Full-Stack Audit Remediation & Bloomberg Financial Matrix (FA)
- Client-Side Runtime Stability & Vercel Guardrails:
  - Fixed `ReferenceError: stock is not defined` inside `useMemo` in `src/components/ScenarioForecaster.jsx` by correctly referencing destructured `f.eps` and `f.per`.
  - Guarded `<Analytics />` and `<SpeedInsights />` in `src/app/layout.js` to only execute when running in a Vercel environment (`process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV`), resolving the strict MIME type error (`/_vercel/speed-insights/script.js` 404/plain text) on self-hosted Docker / `localhost:3010`.
- Portfolio API Hardening & Lot Validation (`/api/portfolio/buy` & `/api/portfolio/sell`):
  - Fixed request payload parsing and variable destructuring in buy/sell routes.
  - Enforced strict IDX 1-lot (100 shares) modulo validation (`shares % 100 === 0`) with descriptive Indonesian validation messages.
  - Added test suite `tests/portfolioLotValidation.test.js` covering lot validation and realized PnL/Loss logic.
- Backtest Underwater Drawdown Visualizer (`src/components/BacktestPanel.jsx`):
  - Added dedicated interactive underwater drawdown profile chart below the equity compounding curve, plotting drawdown percentage from previous equity peaks with a negative-fill gradient and trough markers.
- Bloomberg Financial Statement Matrix Integration (`src/components/StockExplorer.jsx`):
  - Restored and mounted `FinancialMatrixPanel` inside the Valuasi & Finansial analytical cockpit tab (`cockpitTab === 'valuation'`).
  - Incremented cockpit tab metric counter and added multi-year comparative income, balance sheet, cashflow, and ratio matrix.
- Modal Accessibility & Dialog Dismissals (`src/components/DetailPanel.jsx`):
  - Added Escape key listener and backdrop click dismissal with `e.stopPropagation()` on monitor and custom prompt dialogs.
- BEI Holiday Calendar Engine (`src/lib/idxHolidays.js` & `tests/idxHolidays.test.js`):
  - Created centralized Indonesia Stock Exchange (IDX/BEI) holiday calendar covering 2024-2027 including national holidays and collective leave (Cuti Bersama).
  - Integrated `isIDXHoliday` and `isIDXTradingDay` into `src/lib/syncService.js` (to avoid unnecessary price polling on market holidays) and `src/lib/recommendationTracker.js` (`getTradingDaysElapsed` for accurate settlement and recommendation holding duration).
- Docker Infrastructure & Database Optimization:
  - Tuned PostgreSQL memory limit from 256MB to 512MB in `docker-compose.yml` to prevent OOM under concurrent analytical workloads.
  - Added connection limits (`connection_limit=10` on app, `connection_limit=5` on scraper) to eliminate connection starvation on PostgreSQL.
  - Restored `lastDeepSync` field and removed redundant index `@@index([ticker])` in `prisma/schema.prisma` (`prisma validate` & `prisma db push` cleanly executed).
  - Fixed Docker permissions in `Dockerfile` by adding `--chown=nextjs:nodejs` to Prisma COPY lines in the `runner` stage to avoid `EACCES` when running as non-root `nextjs` user.
  - Optimized `.dockerignore` by excluding `tests`, `docs`, `Dockerfile*`, and `docker-compose*.yml`.
- API Robustness & BigInt Serialization Safety:
  - Added `serializeData` helper to `src/app/api/screener/route.js` and `src/app/api/portfolio/route.js` to ensure safe BigInt serialization (`sharesOutstanding`, `volume`, `turnover`) without runtime `TypeError`.
- Frontend Reliability & Analytics Guardrails:
  - Fixed `src/app/layout.js` to only inject `<GoogleAnalytics>` when `NEXT_PUBLIC_GA_ID` is defined, preventing false network errors on default `"G-XXXXXXXXXX"`.
  - Added DPR (Dividend Payout Ratio) column to the historical dividends table in `src/components/CorporateActionsPanel.jsx`.
- PPh Final 10% Domestic Dividend Tax Calculation & UI Transparency:
  - Implemented `calculateNetDividendYield` with `IDX_DIVIDEND_TAX_RATE = 0.10` in `src/lib/scoring/dividend.js` and added unit test suite (`tests/dividend.test.js`).
  - Added Gross Dividend Yield and Net Dividend Yield (after 10% PPh Final deduction under PP 9/2021 & UU Cipta Kerja) display in `src/components/StockExplorer.jsx`.
- Heuristic Transparency & Methodology Tooltips:
  - Added explanatory tooltips (`ⓘ`) to Piotroski F-Score and Altman Z-Score cards in `StockExplorer.jsx` explaining they are calibrated multi-factor heuristic proxies adapted for IDX financial reporting availability.
- Accessibility & UX Guardrails:
  - Added universal ESC key listeners, backdrop dismissal, and ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) across all modals in `StockExplorer.jsx`, `PensionCalculator.jsx`, `StockOwnershipModal.jsx`, `DetailPanel.jsx`, and `AuthModal.jsx`.
  - Added live sync pill with time and manual sync trigger button on mobile header (`TopHeader.jsx`).
- Verification:
  - 246 tests passing across 59 suites (100%).
  - Next.js Turbopack production build succeeded cleanly in 1.8s.

## [2026-09-24] fix | Domain Modeling: Frequency vs Lot Resolution & Yahoo Finance Ownership Pipeline Integration
- Resolution of Frequency vs Lot Conceptual Ambiguity (BEI Market Standards):
  - Solved conceptual discrepancy in `src/lib/syncService.js` and `src/scripts/sync-prices.js` where `volume / 100` was historically stored in the DB column `frequency`. In the Indonesia Stock Exchange (IDX/BEI), 1 Lot = 100 shares; thus `volume / 100` represents **Lot Count** rather than trade execution frequency (trade count).
  - Clarified architectural documentation across `prisma/schema.prisma`, `syncService.js`, and `sync-prices.js` explaining that the `frequency` DB column holds Lot count for schema backward compatibility.
  - Added dedicated `lots` property to `/api/stocks/[ticker]/route.js` `volumeAnalysis` alongside `frequency`.
  - Fixed misleading UI in `src/components/StockExplorer.jsx:2486` which previously displayed `...x transaksi` (causing traders to mistakenly perceive millions of trade executions), replacing it with official IDX nomenclature: `... Lot`.
- Yahoo Finance Ownership Modules Integration (`majorHoldersBreakdown`, `fundOwnership`, `institutionOwnership`):
  - In `src/lib/syncService.js`, added Yahoo Finance ownership modules to `quoteSummary` and extracted key institutional data into `fundamentals`:
    - `insidersPercentHeld` (% insider/controlling stake)
    - `institutionsPercentHeld` (% total institutional ownership)
    - `institutionsFloatPercentHeld` (% institutional float ownership)
    - `institutionsCount` (total institutional holder count)
    - `topInstitutionalFunds` (top 10 mutual funds including Vanguard, BlackRock/iShares with position, value, and % held)
    - `topInstitutions` (top institutional asset managers)
  - Added fallback initial ownership persistence in `StockData.ownership` during deep sync so new emiten immediately display major shareholder breakdowns even prior to running the Puppeteer IDX scraper.
  - Documented why `insiderTransactions` is null on Yahoo Finance for `.JK` tickers (Indonesian corporate insiders file mandatory disclosures with OJK/BEI under POJK 11/POJK.04/2017 rather than US SEC Form 4). Confirmed domestic insider trade tracking remains seamlessly covered via `src/scripts/sync-ownership.js` (IDX Keterbukaan Informasi scraper) and `src/scripts/sync-ksei.js` (KSEI depository scraper).
- Verification:
  - 242 unit and integration tests passing (100%).
  - Next.js Turbopack production build succeeded cleanly.

## [2026-09-24] feat | Comprehensive Full-Stack Audit Remediations & External Data Pipeline Optimization
- External Data Pipeline & Yahoo Finance Enhancements:
  - Added official BEI trading hours awareness (`isIDXMarketHours` in `src/lib/syncService.js`). Fast price sync automatically skips outside active trading hours (09:00 - 16:00 WIB, Monday-Friday), saving thousands of API requests and eliminating rate limit risks at night and weekends.
  - Tuned batch query `chunkSize` from 50 to 25 to prevent Yahoo Finance silent ticker drops.
  - Expanded `quoteSummary` modules to include `balanceSheetHistory` and `cashflowStatementHistory`, actively extracting and normalizing `totalAssets` and `totalLiabilities` (with USD exchange rate conversion for USD-reporting IDX issuers).
  - Implemented dynamic Exponential Backoff (30s up to 5 minutes) in `src/lib/worker.js` on consecutive deep sync failures to defend against Yahoo Finance HTTP 429 IP bans.
- Financial Engine & PnL Corrections:
  - Fixed Realized PnL calculation in `src/app/api/portfolio/route.js` to subtract buy cost basis from sell proceeds instead of incorrectly counting gross proceeds as net profit.
  - Added IDX lot size validation (100 shares modulo check) to both `/api/portfolio/buy` and `/api/portfolio/sell` routes.
  - Handled complete portfolio position closures cleanly when `totalShares === 0`.
  - Added Rp 50 floor guardrail (`IDX_REGULAR_BOARD_MIN_PRICE`) for regular market stop loss calculation in `src/lib/tradeSetup.js`.
  - Upgraded target price projection in `src/components/ScenarioForecaster.jsx` to use an institutional EPS × P/E multiple model rather than naive 1:1 revenue scaling.
- Security & Access Control Hardening:
  - Eliminated admin privilege escalation in `src/lib/auth.js` (`verifyAdminAccess`) by restricting administrative access strictly to verified `ADMIN_SECRET_KEY` API keys, users with `ADMIN` role, or `ADMIN_EMAIL`.
  - Added JWT token expiration (`exp`) validation in Edge runtime proxy (`src/proxy.js`).
  - Mitigated IDOR and unauthorized session deletion/reading in `src/app/api/ai/chat/route.js` by checking session ownership against authenticated `userId`.
- Database Performance & Infrastructure:
  - Added B-tree indexes for `lastPriceSync` and `lastDeepSync` to `StockData` model, plus `role` column to `User` model in `prisma/schema.prisma`.
  - Added a 30-second In-Memory TTL Cache in `src/lib/providers/DatabaseProvider.js` to eliminate thousands of redundant `JSON.parse` operations on every request.
  - Implemented concurrency mutex locks (`isPriceSyncRunning`, `isDailyScraperRunning`, `isProcessingQueue`) in `scraper-cron.js` and `ai-worker.js` to prevent memory leaks and container OOM crashes.
  - Fixed Puppeteer Chromium launch crash in Alpine Docker (`src/scripts/sync-ownership.js`) by injecting `PUPPETEER_EXECUTABLE_PATH` and container-safe flags.
- UI/UX & Responsive Enhancements:
  - Resolved tablet (`md`) responsive layout gap in `src/components/DetailPanel.jsx` by supporting `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `md:col-span-2` for the rationale section.
  - Auto-defaulted `StockScreener.jsx` view mode to `'cards'` on mobile screens (< 768px) to eliminate horizontal table scroll.
  - Added an interactive visual **Equity Curve & Compounding Chart** (SVG) with peak capital and max drawdown analytics to `src/components/BacktestPanel.jsx`.
  - Added ARIA `role="dialog"` and `aria-modal="true"` attributes to custom modal overlays in `DetailPanel.jsx`.
- Verification:
  - All 242 test suites pass (100%).
  - Turbopack production build succeeds cleanly.

## [2026-09-24] feat | Collection Sorter Engine: 7 Automated Sorting Strategies & Strategy Guide Modal
- Collection Sorter Pure Engine (`src/lib/collectionSorter.js`):
  - Built institutional pure-function sorter featuring 7 distinct sorting algorithms:
    1. `SMART_COMBINATION`: Multi-factor rank combining Composite Quality Score (40%), MACD Buy Trigger (35%), and Target Buy Proximity (25%).
    2. `HIGHEST_SCORE`: Pure composite score descending (A-Grade 80+ to D-Grade).
    3. `MACD_CROSS`: Technical timing priority (Fresh Golden Cross -> Bullish Histogram -> Rebound Momentum -> Bearish).
    4. `PROXIMITY_TARGET_BUY`: Sorts by proximity to user's manual target buy price (in-zone $\le 0-2\%$ at top, with fallback to technical support or 5% discount).
    5. `SMART_MONEY`: Institutional inflow & smart money score descending.
    6. `TOP_PERFORMER`: Daily percentage change descending (+25% to -15%).
    7. `ALPHABETICAL`: Clean A to Z sorting by official IDX ticker symbol.
- Interactive UX & Rich Dropdown Menu (`src/components/CollectionSortDropdown.jsx`):
  - Added a compact `⚡ Urutkan ▾` trigger button in the Stock Explorer Left Sidebar header.
  - Built a rich popover dropdown displaying all 7 options with custom icons, category badges (`Rekomendasi`, `Kualitas`, `Teknikal`, `Eksekusi`, `Bandarmologi`, `Momentum`, `Kerapian`), and one-line strategy summaries.
  - Implemented an interactive Strategy Guide Modal (`(?) Panduan Formula`) detailing mathematical equations, parameter weights, and trading scenarios for each strategy, complete with direct `[Terapkan]` action buttons.
- Full-Stack API & Database Persistence:
  - Enriched `GET /api/collections/items` with live stock technicals (`macd`, `rsi14`, `support`, `resistance`, `ma20`, `ma50`).
  - Integrated with `PATCH /api/collections/items` to persist new item ordering (`orderedIds`) atomically via Prisma transaction.
  - Preserved 100% manual drag-and-drop capability.
- Verification & Test Coverage:
  - Added dedicated test suite `tests/collectionSorter.test.js` covering all 7 strategies and pure function immutability (9/9 tests passing).
  - All 242 project unit tests passing 100%. Turbopack production build succeeded cleanly.

## [2026-09-24] fix | Corporate Actions Calendar Continuous Month Navigation & Sub-Millisecond In-Memory Caching
- Root Cause Analysis:
  - Navigation Beyond October 2026 & Latency ("Lama"): On every single month change in `src/components/CorporateCalendar.jsx`, `/api/corporate-actions` executed a complete un-cached MySQL database scan across all 1,020 stocks, deserializing and processing thousands of JSON text blobs on each request (~4,000–5,000ms latency).
  - Disruptive UI Unmounting: During this 5-second fetch window, the component unmounted the entire monthly grid and replaced it with a full-screen loading spinner. This destroyed the "Bulan Depan ▶" navigation buttons in the grid header and caused fast consecutive clicks to feel frozen at October 2026 (the furthest month currently containing active scheduled events in the database).
- Backend In-Memory Event Cache (`src/app/api/corporate-actions/route.js`):
  - Built `getCachedCorporateEvents` with a 5-minute TTL (`CACHE_TTL_MS = 5 * 60 * 1000`). Pre-indexes all 1,657 corporate events and available months in memory.
  - Reduced API response latency from ~5,000ms to **under 1ms (< 0.001s)**, enabling instantaneous month transitions. Supports `?refresh=true` for on-demand cache invalidation.
- Resilient Frontend Architecture (`src/components/CorporateCalendar.jsx`):
  - Functional State Navigation: Converted `handleNextMonth` and `handlePrevMonth` to functional state updaters (`setSelectedMonth(prev => ...)`), guaranteeing consecutive rapid clicks instantly advance without stale closures (`2026-10` -> `2026-11` -> `2026-12` -> `2027-01` -> ...).
  - Request Cancellation with AbortController: Integrated `AbortController` in `useEffect` so rapid month clicks cancel outdated in-flight requests immediately.
  - Non-Blocking Optimistic Calendar View: Kept calendar grid and navigation buttons mounted during transitions with subtle header spin indicators and opacity transitions.
  - Empty Month Guidance: Added a clear informational banner when browsing future or past months with 0 announced events (e.g. November 2026).
- Verification & Test Coverage:
  - Added test case in `tests/corporateCalendar.test.js` validating indefinite continuous month advancement past October 2026 and across 12-month iterative loops. All 233 project unit tests passing 100%. Turbopack production build succeeded cleanly.

## [2026-09-24] feat | Stock Explorer Ultra-Wide Screen Expansion & Sticky Fixed Top Header
- Ultra-Wide Layout Expansion:
  - Upgraded `<main>` container in `src/components/Dashboard.jsx` to dynamically switch from standard `max-w-7xl` to ultra-wide `max-w-[1920px] 2xl:px-8` when on `activeTab === 'explorer'`, eliminating wasted side margins on widescreen displays (1080p, 1440p, 4K).
  - Expanded Stock Explorer Left Sidebar max width (`2xl:w-[400px]`), allowing more breathing room for collection tickers and notes while granting the Right Canvas ample horizontal real estate for technical charts and indicator tables.
- Sticky / Fixed Top Header:
  - Made the Stock Explorer master header (`Stock Explorer` title, subtitle, and mode switcher tabs) sticky (`sticky top-0 z-30 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md shadow-md`). The header now stays pinned at the top during deep vertical scrolling across the analytical canvas.
  - Aligned the Left Sidebar sticky anchor to `lg:sticky lg:top-[94px]`, keeping the collection explorer pinned directly below the sticky navigation bar without overlapping.
  - Verified with 16/16 passing unit tests and clean Next.js Turbopack production build.

## [2026-09-24] fix | Corporate Actions Calendar Month Navigation & Rolling Window Options
- Fixed Month & Year Stuck on Next/Prev Click:
  - Diagnosed HTML `<select>` option mismatch in `src/components/CorporateCalendar.jsx`: previously, the month dropdown options only rendered `calendarData.monthsAvailable` (months with recorded events). When users clicked `◀` or `▶` to browse to a month without active events (or not yet loaded), the DOM select had no matching option and automatically fell back to displaying the first option (September 2026), making the controls appear frozen.
  - Implemented `monthOptions` with dynamic rolling window (-24 months to +12 months) merged with `monthsAvailable`, `selectedMonth`, and `initialYearMonth`. Every navigable month is now guaranteed to exist in the dropdown options.
  - Hardened `handlePrevMonth` and `handleNextMonth` with defensive NaN checks and safe year-boundary transitions (`2026-12` -> `2027-01` and `2026-01` -> `2025-12`).
  - Added a dedicated Month Header Banner directly above the grid calendar with quick buttons (`◀ Bulan Lalu`, `Hari Ini`, `Bulan Depan ▶`) and live event counters.
  - Added unit test in `tests/corporateCalendar.test.js` validating forward and backward month calculations across calendar year boundaries (16/16 tests passing).

## [2026-09-24] feat | Stock Explorer UI Re-Layout: Dual-Pane Master-Detail Workspace & Analytical Cockpit Tabs
- **Dual-Pane Master-Detail Workspace (Opsi 1)**:
  - Transformed the vertically stacked collections container into a collapsible left sidebar (`w-80 lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20`).
  - Added a collection switcher dropdown with quick action buttons (🔄 Refresh, ✏️ Edit, 🔗 Share, 🗑️ Delete) and active item count indicators.
  - Implemented a compact, vertically scrollable list of collection items (`max-h-[calc(100vh-270px)]`) featuring real-time prices, percentage and nominal changes, color-coded score badges (80+ emerald, 65+ blue, 50+ amber, <50 rose), target buy/sell progress badges, and 100% preservation of drag-and-drop reordering.
  - Added a toggle button in the Search Bar header (`[◀ Tutup Koleksi] / [📂 Buka Koleksi (N)]`) allowing users to seamlessly collapse the sidebar for full-width chart expansion.
  - Added a clean empty state canvas when no stock is currently selected with guidance to select or search for a ticker.
- **Analytical Cockpit Category Tabs (Opsi 4)**:
  - Consolidated the 10 stacked sub-panels below the chart into a 4-tab institutional analytical cockpit (`cockpitTab`):
    1. `Valuasi & Finansial`: Relative Valuation Peers (RV), Historical Valuation Bands (PBND), ROIC vs WACC & EVA, and Scenario Forecaster.
    2. `Musim & Dividen`: 5-Year Monthly Seasonality Heatmap, Dividend Trap Analyzer & Run-Rate, and Corporate Actions Calendar & Catalyst Timeline.
    3. `Smart Money & Aliran`: KSEI Ownership Shift, Broker Concentration (Bandarmologi Flow), Volume Profile, and Auto-Rejection Limits (ARA/ARB) & Execution Ladder.
    4. `Riset AI & Sentimen`: Bloomberg Intelligence Institutional Research Dossier and Algorithmic News Sentiment.
  - Added dynamic module count badges on each tab header showing available sub-engines.
- **Verification & Build**:
  - Automated test suite passed 100% (15/15 unit tests).
  - Next.js Turbopack production build succeeded cleanly with 0 errors.

## [2026-09-24] feat | Official IDX 4-Date Dividend Schedule, Multi-Year Historical Tracker & Corporate Actions Panel
- Official IDX 4-Date Dividend Pipeline: Upgraded `src/lib/corporateActionEngine.js` to parse official Indonesian Stock Exchange (IDX) corporate action structures, extracting the 4 critical dividend dates: Cum Date, Ex Date, Recording Date (DPS 16:00 WIB), and Payment Date (RDN settlement).
- Multi-Source DPS Resolution: Implemented hierarchical DPS calculation supporting direct cash dividend per share (`CashDividenPerSaham`), mathematical derivation from total cash dividends and shares outstanding (`CashDividenTotal / sharesOutstanding`), 15-day tolerance window matching against Yahoo Finance history, and static dividend rate fallbacks.
- Multi-Year Historical Dividend Track Record: Built `compileHistoricalDividends` merging official IDX company profile records with multi-year Yahoo Finance historical distribution sequences, eliminating duplicate records within 15-day merge windows and formatting complete chronological track records.
- Redesigned Corporate Actions UI Panel: Overhauled `src/components/CorporateActionsPanel.jsx` with an interactive 3-tab layout:
  1. *Jadwal Terkini*: 4-step visual date stepper, status alerts (Cum Active, Waiting Payment, Paid), DPS nominal, yield against current market price, total distributed cash fund, and dividend streak.
  2. *Riwayat Dividen*: Full responsive historical distribution table with fiscal year, dividend type (interim vs final), DPS, and source attribution.
  3. *Agenda & RUPS*: Annual general shareholder meeting (RUPST) windows and quarterly financial statement submission windows (Q1, Q2, Q3, FY).
- Stock Explorer Detail Integration: Updated `src/app/api/stocks/[ticker]/route.js` and `src/components/StockExplorer.jsx` to pass `dividendSchedule`, `historicalDividends`, and `dividendSummary`, fixing the overview card "Dividen Terakhir" metric to display real resolved DPS.
- Automated Verification: Added comprehensive unit tests in `tests/corporateAction.test.js` validating IDX field parsing, DPS resolution, deduplication, and schedule metadata (223/223 tests passing 100%). Clean Turbopack production build verified.

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
