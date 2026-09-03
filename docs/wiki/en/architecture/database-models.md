---
title: "Database Models & Schemas"
description: "Prisma schema models, relational architecture, BigInt handling, and database rules"
category: "architecture"
tags: ["prisma", "postgresql", "bigint", "schema"]
last_updated: "2026-09-03"
version: "1.0.0"
---

# Database Models & Schemas

The application uses PostgreSQL with Prisma ORM located at `prisma/schema.prisma`.

---

## 🗄️ Core Models

### 1. `StockData`
The primary table for all Indonesian listed stocks:
* `ticker` (String, unique): Stock ticker code without `.JK` suffix (e.g. `BBRI`, `ASII`).
* `name`, `sector`, `subSector` (String): IDX Industrial Classification.
* `price` (Float), `changePercent` (Float).
* `volume`, `avgVolume3mo`, `turnover` (BigInt?): Requires BigInt JSON serialization sanitizer before sending to Next.js client (`Number(val) || 0`).
* `fundamentals` (Text/JSON): Parsed financial ratios (ROE, DER, OPM, EPS, PER, PBV, Net Profit array).
* `technicals` (Text/JSON): RSI, Supertrend, DEMA, MACD, Volume series.
* `kseiLatest`, `kseiHistory` (Text/JSON): Scriptless shareholding distribution.

### 2. `Recommendation`
Persists the real-world performance record of stock picks and user-monitored tickers:
* `userId` (Int, optional): Owner of the recommendation.
* `source` (String, default: `"USER"`): Discriminator between automated Discord bot picks (`"SYSTEM"`) and manual user watchlists (`"USER"`). Indexed via `@@index([source])`.
* `ticker`, `name`, `date` (DateTime).
* `priceAtRecommend` (Float): Target entry or current market price.
* `targetPrice` (Float): Take Profit (TP).
* `stopLoss` (Float): Cut Loss (SL).
* `status` (String):
  - `WAITING_BUY`: Queued order / limit simulation. Price has not yet touched the entry price.
  - `OPEN`: Active position. Order has matched or user checked "Sudah Beli".
  - `WIN`: Price reached or exceeded `targetPrice`.
  - `LOSS`: Price dropped to or below `stopLoss`.
  - `EXPIRED`: Order did not match within max holding days and was cancelled without affecting win rate.
  - `CLOSED`: Position timed out at market price.

### 3. `Collection` & `CollectionItem`
Organizes custom user watchlists with drag-and-drop ordering and optional public sharing codes.

### 4. `Portfolio` & `Transaction`
Manages virtual or live trading portfolios with average cost tracking, lots, and realized/unrealized PnL.

### 5. `PensionRecord` & `User`
User authentication (session-based) and retirement allocation buckets across SBN (Government Bonds), Saham (Equities), and RDPU (Money Market Funds).
