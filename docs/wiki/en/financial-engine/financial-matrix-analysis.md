# Bloomberg Financial Matrix Analysis (FA)

## Overview
The **Bloomberg Financial Matrix Analysis (FA)** panel (`src/components/FinancialMatrixPanel.jsx`) provides an institutional multi-year comparative financial view directly within the Stock Explorer. Inspired by Bloomberg Terminal's classic `FA <GO>` function, it displays key financial metrics across 4 distinct categories:

1. **Laporan Laba Rugi (Income Statement)**: Total Revenue, Gross Profit, Operating Profit / EBIT, Net Income, Gross Profit Margin (GPM), Operating Profit Margin (OPM), and Net Profit Margin (NPM).
2. **Neraca Keuangan (Balance Sheet)**: Total Assets, Total Liabilities, Total Equity, Cash & Short Term Investments, Total Debt, Debt-to-Equity Ratio (DER), and Current Ratio.
3. **Arus Kas & Dividen (Cash Flow & Dividend)**: Operating Cash Flow (OCF), Free Cash Flow (FCF), Dividend Per Share (DPS), Dividend Yield, and Cash Dividend Payout Ratio.
4. **Profitabilitas & Valuasi (Profitability & Valuation)**: Return on Equity (ROE), Return on Assets (ROA), Earnings Per Share (EPS), Price-to-Earnings Ratio (PER), Price-to-Book Value (PBV), and Enterprise Value (EV).

---

## Architectural Design & Features

### 1. Multi-Year Comparative Matrix
- Employs historical data sequences from `StockData.fundamentals` (e.g. `historicalFinancials`, `earningsTrend`, and historical financial statements).
- When multi-year historical rows are unavailable from external Yahoo Finance APIs, it cleanly isolates the current Trailing Twelve Months (TTM) / latest annual numbers with automated year tags (e.g. FY2023, FY2024, FY2025, TTM).
- Displays YoY growth rates and colored badges for expanding vs contracting financial metrics.

### 2. Category Tabs & Quick Switching
Users can seamlessly toggle between:
- `all`: Full master matrix showing all 4 financial categories simultaneously.
- `income`: Dedicated Income Statement view.
- `balance`: Dedicated Balance Sheet & Capital Structure view.
- `cashflow`: Dedicated Cash Flow & Dividend Distribution view.
- `ratios`: Dedicated DuPont Profitability & Valuation Multiple view.

### 3. Indonesian Market Specifics & Tax Transparency
- Incorporates PPh Final 10% dividend tax deductions (PP 9/2021 & UU HPP) with clear tooltips distinguishing between Gross Dividend Yield and Net Dividend Yield.
- Auto-scales large figures into Indonesian Rupiah standards (Triliun, Miliar, Juta) with formatted thousands separators (`id-ID`).
- Provides graceful fallbacks when balance sheet and cash flow statement submodules provide limited data for certain IDX issuers.

---

## Component Integration
The panel is mounted inside `src/components/StockExplorer.jsx`:
- Mode switch tabs: `activeTab === 'matrix'`
- Rendered with `<FinancialMatrixPanel stockDetail={stockDetail} />`
- Responsive layout supporting both mobile card scroll and high-density desktop matrix tables.
