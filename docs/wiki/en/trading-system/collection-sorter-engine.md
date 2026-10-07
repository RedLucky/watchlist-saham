# Collection Sorter Engine & Institutional Watchlist Ordering

The **Collection Sorter Engine** (`src/lib/collectionSorter.js`) provides automated, multi-factor algorithmic reordering for custom user stock watchlists and collections in the Stock Explorer. It enables traders and investors to instantly identify their highest-priority execution targets without manually sorting through dozens of tickers.

---

## 1. Architectural Overview

* **Module**: `src/lib/collectionSorter.js`
* **UI Trigger & Modal**: `src/components/CollectionSortDropdown.jsx`
* **API Integration**: `GET /api/collections/items` (enriched with live technicals) & `PATCH /api/collections/items` (persists `orderedIds` to DB via Prisma transaction)
* **Parent View**: `src/components/StockExplorer.jsx` (Koleksi Saham tab — collection card grid)

```
[ Collection Items ] ──> [ CollectionSortDropdown ]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [ Rich Popover Menu ]            [ Strategy Guide Modal ]
       (7 Quick Options)             (Detailed Formula & Scenarios)
               │                               │
               └───────────────┬───────────────┘
                               ▼
                   [ sortCollectionItems() ]
                     (Pure Sorter Engine)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     [ Optimistic React UI ]         [ PATCH /api/collections/items ]
      (Instant Reorder Anim)          (Permanent MySQL DB Persistence)
```

---

## 2. The 7 Sorting Algorithms

### 1. `SMART_COMBINATION` (⭐ Kombinasi Cerdas) - Primary Recommendation
Harmonizes long-term asset quality with immediate technical entry timing and personal target levels.
$$\text{SmartRank} = (\text{Composite Score} \times 0.40) + (\text{MACD Signal Points} \times 0.35) + (\text{Proximity Points} \times 0.25)$$

* **Composite Score (40%)**: Pre-calculated multi-factor score (0–100) combining Fundamentals (45%), Technicals (35%), Trending (10%), and Smart Money (10%).
* **MACD Signal Points (35%)**:
  * Fresh Golden Cross (`isGoldenCross: true`): **100 pts**
  * Bullish Histogram (`histogram > 0`): **75 pts**
  * Rebound Momentum (`histogram < 0` but `histogram > prevHistogram`): **55 pts**
  * Bearish Decay: **20 pts**
* **Proximity Points (25%)**:
  * Price $\le$ Target Buy (in-zone): **100 pts**
  * Distance $\le 2\%$: **90 pts**
  * Distance $\le 5\%$: **70 pts**
  * Distance $\le 10\%$: **50 pts**
  * Far above Target Buy: **20 pts**

### 2. `HIGHEST_SCORE` (🏆 Skor Tertinggi)
Ranks stocks purely by overall fundamental & technical health.
* Primary Sort: `stock.score` descending (100 ➔ 0).
* Tie-Breakers: `scores.fundamental` ➔ `scores.technical`.

### 3. `MACD_CROSS` (📈 Sinyal Beli MACD)
Prioritizes technical buy signals and trend continuation:
1. Tier 4 (100 pts): Fresh Golden Cross confirmed today.
2. Tier 3 (75 pts): Bullish expansion (`histogram > 0`).
3. Tier 2 (55 pts): Negative histogram shrinking toward 0 (anticipatory rebound).
4. Tier 1 (20 pts): Bearish decay.

### 4. `PROXIMITY_TARGET_BUY` (🎯 Paling Dekat Target Beli)
Detects which assets are closest to the user's predetermined purchase zone:
$$\text{Distance} = \frac{|\text{Market Price} - \text{Target Buy}|}{\text{Market Price}} \times 100\%$$
* Assets in the buy zone ($\text{Price} \le \text{Target Buy}$) or within $\le 2\%$ receive top priority.
* Fallback: If no manual `targetBuy` is set, uses `stock.technicals.support` or `stock.price * 0.95`.

### 5. `SMART_MONEY` (🐋 Akumulasi Smart Money)
Sorts by institutional capital accumulation and broker concentration:
* Primary Sort: `stock.scores.smartMoney` descending.
* Tie-Breakers: `stock.scores.trending` ➔ `changePercent`.

### 6. `TOP_PERFORMER` (🚀 Performa Hari Ini)
Sorts by daily price change percentage:
* Primary Sort: `stock.changePercent` descending (+25% ➔ -15%).

### 7. `ALPHABETICAL` (🔤 Nama Emiten A – Z)
Sorts alphabetically by official IDX ticker symbol (`AALI` ➔ `BBCA` ➔ `TLKM` ➔ `UNVR`).

---

## 3. Database Persistence & Manual Drag-and-Drop Compatibility

* **Database Model**: `CollectionItem` table with `sortOrder Int @default(0)`.
* **API Handler**: `PATCH /api/collections/items` accepts `{ collectionId, orderedIds }`.
* **Prisma Transaction**: Updates each item's `sortOrder` index atomically.
* **Manual Override**: Users remain 100% free to drag-and-drop individual cards to customize their watchlist further after running an automated sort.
