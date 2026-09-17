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

## 3. Deep Sector & Business Unit Industry Analysis Framework

To eliminate generic or shallow qualitative summaries, the AI Research Engine employs a **Dynamic Sector-Specific Intelligence Framework** (`src/lib/ai/prompter.js`) paired with **Thematic Multi-Query Web Search** (`src/lib/ai/search.js`):

### A. Sector Relational Rubrics:
- **Automotive & Components (e.g. `AUTO`, `SMSM`, `GJTL`)**:
  - *Aging Vehicle Fleet Model*: Historical vehicle sales (GAIKINDO 2–5 years prior) driving predictable replacement cycles (shock absorbers, brake pads, filters, batteries) for 3–7 year old vehicles.
  - *ICE vs EV/Hybrid Powertrain Resilience*: Delineating between powertrain-agnostic components (chassis, suspension, braking, wiring) vs ICE-vulnerable parts (spark plugs, exhaust).
  - *Revenue Channel Split*: OEM (cyclical new car assembly) vs Aftermarket / OES (defensive recurring cash flows via retail chains like Shop&Drive).
- **Banking & Financials (e.g. `BBCA`, `BBRI`, `BMRI`)**:
  - CASA franchise vs Cost of Funds (CoF), segment loan growth (wholesale vs SME/micro), NPL/LAR provisioning coverage, and digital CIR/BOPO.
- **Energy & Mining (e.g. `ADRO`, `PTBA`, `ANTM`, `INCO`)**:
  - Cash cost curve position, stripping ratio, mine life, DMO regulations, and green transition / downstream smelter capex (HPAL/RKEF).
- **Agribusiness & CPO (e.g. `TAPG`, `DSNG`, `AALI`)**:
  - Domestic Biodiesel B35/B40 mandate floor, plantation age profile (prime vs replanting), FFB yield, and OER extraction rates.
- **Telco, Construction, Property, & Consumer Staples**:
  - Data traffic monetization/ARPU, order book burn rates, KPR interest rate sensitivity, raw material inflation pass-through, and brand equity moats.

### B. Mandatory 7-Section Institutional Report Structure:
1. `## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan`
2. `## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit`
3. `## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor`
4. `## 4. Analisis Fundamental & Valuasi Saham`
5. `## 5. Arah Tren & Momentum Teknikal`
6. `## 6. Analisis Sentimen Berita & Katalis Terkini`
7. `## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir` (with `SKOR AI: [0-100]`, `KESIMPULAN: [BELI/HOLD/JUAL]`, and `ALASAN SINGKAT`)

---

## 4. UI Integration & Real-time Action Flow
- **Panel**: `src/components/BloombergIntelligencePanel.jsx` & `src/components/StockExplorer.jsx`.
- **Thematic Header Icons**: Dynamic section badges (🏢 Unit Bisnis, 🔄 Siklus Pasar, 🛡️ Moat & Kompetitor, 📊 Valuasi, 📈 Teknikal, 📰 Berita, 🎯 Prospek).
- **Summary Cards**: At-a-glance view of consensus verdict, valuation commentary, and trend insights.
- **Interactive Deep Dive**: One-click action button (`onOpenFullResearch` / `Lihat Riset AI`) instantly pops open the full `aiResearch` markdown dialog without leaving the Stock Explorer interface.

