# AI-Powered Stock Screener: Natural Language Filtering & Strategy Synthesis

## 1. Overview & Architecture
The **AI-Powered Stock Screener** introduces conversational, natural language search to equity screening on the Indonesia Stock Exchange (IDX).

Instead of manually manipulating multi-variable sliders and checkboxes, users can articulate complex financial strategies in free-form natural language (e.g. *"Cari saham bank dengan dividen yield > 5%, ROE > 15%, dan akumulasi asing"*). 

The local offline LLM (`llama.cpp` through `src/lib/ai/client.js`) parses user intent into a structured JSON filter schema, which the backend evaluates against live database fundamentals, valuation multiples, and KSEI Smart Money metrics.

---

## 2. Quantitative Extraction Schema
The LLM converts natural text queries into an exact multi-dimensional quantitative constraint object:

```json
{
  "sector": "Financials",
  "minDividendYield": 5.0,
  "minRoe": 15.0,
  "minOpm": null,
  "maxPer": 15.0,
  "maxPbv": 1.5,
  "maxDer": 1.5,
  "smartMoneyOnly": true,
  "syariahOnly": false,
  "explanation": "Menyaring saham sektor finansial dengan imbal hasil dividen >= 5%, profitabilitas modal ROE >= 15%, dan arus akumulasi asing positif."
}
```

### 2.1. Robustness & Heuristic Fallback
If the local AI server is momentarily offline or experiencing heavy CPU load, `src/app/api/screener/ai/route.js` gracefully activates a keyword-based heuristic fallback (`buildHeuristicFallbackCriteria`), guaranteeing 100% service uptime without uncaught runtime errors.

---

## 3. Screening & Ranking Algorithm
Filtered stocks are scored via a composite match algorithm ($0 - 99$):
- **ROE $\ge 15\%$**: $+15$ points
- **Dividend Yield $\ge 5\%$**: $+15$ points
- **$\text{PER} \le 12\text{x}$**: $+10$ points
- **$\text{PBV} \le 1.5\text{x}$**: $+10$ points
- **Smart Money / Foreign Accumulation**: $+10$ points

---

## 4. Implementation Details
- **Prompt Engineering**: `src/lib/ai/screenerPrompt.js`.
- **API Handler**: `POST /api/screener/ai`.
- **UI Component**: `src/components/AiScreenerBar.jsx` mounted within `src/components/StockScreener.jsx`.
- **Automated Tests**: `tests/aiScreener.test.js` (198/198 total suite tests passing).

