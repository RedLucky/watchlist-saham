# IDX Index Membership (Indeks BEI)

*For beginners:* IDX publishes several "indices" — curated lists of stocks that meet a rule.
LQ45 holds the 45 largest and most liquid stocks; IDX30 holds 30 large, liquid companies with
sound fundamentals; IDX Value 30 holds 30 stocks that look cheap; High Dividend 20 holds the 20
highest dividend payers; ISSI holds the stocks that comply with Islamic (syariah) investing
principles. This page explains how the app learns which stock belongs to which index, and how a
stock's index labels are shown throughout the interface.

*For experienced developers:* membership is scraped from IDX into two Prisma tables
(`IdxIndex`, `IdxConstituent`) by `src/scripts/sync-indices.js`, served read-only through
`/api/indices` and `/api/indices/[code]`, and can be replaced by hand through `POST /api/indices`
when the scrape cannot run. Labels are rendered by `src/components/IndexBadges.jsx`, which fetches
the whole ticker → codes map exactly once per browser session.

## The five tracked indices

| Code | Name | What it means |
|------|------|---------------|
| `LQ45` | LQ45 | 45 stocks with the largest market capitalisation and liquidity |
| `IDX30` | IDX30 | 30 companies with large capitalisation, liquidity and good fundamentals |
| `IDXVALUE30` | IDX Value 30 | 30 stocks that are relatively cheap versus their sector |
| `HIDV20` | High Dividend 20 | 20 stocks with the highest and most consistent cash dividends |
| `ISSI` | ISSI (Syariah) | Stocks eligible for Islamic (syariah) funds |

The codes above are the single source of truth for the app: `TRACKED_INDEX_CODES` in
`src/lib/idxIndices.js` is what the sync script fetches and what the admin upload accepts.

### Why ISSI counts

A stock listed on IDX is not automatically in ISSI. Only companies whose business and financial
reports pass the Islamic screening are included, so the badge is genuinely informative rather than
universal — the same is true of the four other indices.

## How the data arrives (scraper, with a manual fallback)

`sync-indices.js` runs Puppeteer, mirroring the browser setup in `sync-ksei.js` (same `--no-sandbox`
flags and the same `PUPPETEER_EXECUTABLE_PATH` lookup).

```bash
node src/scripts/sync-indices.js
```

Two deliberate safety properties:

1. **A failed index never destroys stored data.** When an index yields no members, the script logs a
   warning and leaves the previous membership in place. A blank index would be worse than a stale
   one, because blank looks authoritative.
2. **Each index is saved independently**, so a layout change on one IDX page cannot wipe the other
   four.

Because IDX reviews membership a few times a year, the freshness matters more than the exact day.
`isStaleSync()` treats data older than `STALE_AFTER_DAYS` (60 days) as stale, and the UI says so
instead of quietly presenting old membership as current.

### Manual fallback

`POST /api/indices` (admin only, same `verifyAdminAccess` check as KSEI ingest) accepts pasted
text and replaces the stored membership. Rows are either one ticker per line, or
`INDEX_CODE<tab or comma>TICKER` to update several indices at once. The index is then marked
`source = "upload"` so the UI can tell a person's list apart from a scrape.

`parseMembershipText()` validates every line and fails loudly with the offending lines, rather than
silently dropping rows — a partly-saved index is the worst outcome here.

## Data model

```prisma
model IdxIndex {
  code          String   @id      // "LQ45"
  name          String            // display name
  description   String?
  effectiveFrom DateTime?         // when IDX published this membership
  lastSyncedAt  DateTime          // when we last fetched or uploaded it
  memberCount   Int
  source        String            // "scrape" | "upload"
  constituents  IdxConstituent[]
}

model IdxConstituent {
  indexCode String
  index     IdxIndex @relation(...)
  ticker    String
  position  Int?     // rank inside the index when known
  @@unique([indexCode, ticker])
}
```

Two tables rather than a JSON blob on `StockData`, because the main question we ask is "who is in
LQ45?", not "what indices is BBCA in?".

## API

| Route | Method | Returns |
|-------|--------|---------|
| `/api/indices` | GET | `{ indices: [...], byTicker: { BBCA: ['IDX30','LQ45'] } }` |
| `/api/indices` | POST | Admin upload; body `{ defaultIndex, text }` |
| `/api/indices/[code]` | GET | One index plus its members enriched with price, change and score from `StockData` |
| `/api/indices/[code]` | POST | Admin; adds one ticker (`{ ticker }`) |
| `/api/indices/[code]` | DELETE | Admin; removes one ticker (`?ticker=BBCA`) |

### Editing membership from the page

The Indeks BEI page is where membership is maintained, not only read:

- An admin key field plus a ticker field add one stock to the selected index.
- Every row has a `Hapus` button that removes that stock from the index.
- Both actions go through `src/lib/idxStore.js`, which validates the code and ticker *before*
  touching the database, so a typo never reaches Prisma.
- Adding a stock that is already a member is a no-op and deliberately does **not** stamp a fresh
  `lastSyncedAt`: an accidental re-add must not make a stale list look freshly verified.
- After any edit the badge cache is dropped via `invalidateIndexCache()`, otherwise the labels
  elsewhere in the app would keep showing membership from before the edit.

The bulk upload page `/admin/indeks` is linked from the page header, because typing 200 ISSI
tickers one at a time is not realistic.

`byTicker` exists so a table of 50 rows needs one request, not 50. Each member also reports
`tracked`, which is false when the index member is not in our own database — the page then shows how
much of the index we can actually analyse.

## The Indeks BEI page

A navigation entry (`indices`) between Stock Screener and Alpha Legends, rendering
`src/components/IndexDirectory.jsx`:

- One `StatCard` per index with member count, last update, and a stale marker; clicking a card
  selects that index.
- Below it, the member table: rank, ticker, sector, price, change, composite score and the stock's
  own index badges.
- When no member has been synced yet, the page explains how to run the script or upload a list —
  it never looks like "this index is empty".

## Labels everywhere else

`src/components/IndexBadges.jsx` exports two components, both sharing one module-level promise so
the map is fetched once per browser session:

- `IndexBadgeList` — used inside tables and cards; takes an array of tickers.
- `IndexBadges` — the single-ticker variant.

Labels are deliberately compact: at most `max` chips (1 or 2 depending on the call site) plus a
`+N` counter, with the full list in the tooltip. A stock in four indices would otherwise push every
row layout around. The component renders a skeleton until the map arrives so rows do not jump.

Wired into: Analisis Saham (`StockTable`), Stock Explorer collection cards, Stock Screener results
(both the grid and the list layout), Portfolio positions table, Market Movers rows, and the member
table of the Indeks BEI page itself.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Every label is missing | Migration not applied, so `IdxIndex` does not exist | `npx prisma migrate deploy` |
| Page says "belum ada data" | No scrape and no upload yet | Run `sync-indices.js` or upload at `/admin/indeks` |
| All badges stale | Scraper has not run in over 60 days | Re-run the script; check the scraper container logs |
| Scraper finds 0 members for one index | IDX changed that page's markup | Upload that index manually and update the selector in `sync-indices.js` |
| Labels missing on one page only | That call site was not wired | Add `IndexBadgeList` next to the ticker |

## Related pages

- [Data Pipeline & Sync](./data-pipeline.md) — how prices and financials are fetched.
- [Authentication & Admin Access](./authentication.md) — who may call the upload endpoint.
- [Database Models & Schemas](./database-models.md) — the rest of the schema.