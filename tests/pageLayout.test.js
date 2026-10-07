import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Layout guard: every main page must render through the shared page shell so titles,
 * gutters and section rhythm stay consistent (ADR 0001).
 */

const PAGES = {
  'Analisis Saham': ['src/components/Dashboard.jsx', 'PageShell'],
  'Stock Screener': ['src/components/StockScreener.jsx', 'PageShell'],
  'Market Movers': ['src/components/MarketMovers.jsx', 'PageShell'],
  'Stock Explorer': ['src/components/StockExplorer.jsx', 'PageShell'],
  'Portofolio': ['src/components/PortfolioPanel.jsx', 'PageShell'],
  'Riwayat & Win Rate': ['src/components/HistoryPanel.jsx', 'PageShell'],
  'Pensiun': ['src/components/PensionCalculator.jsx', 'PageShell'],
  'Konsultasi AI': ['src/components/AiConsultationPanel.jsx', 'PageShell'],
  'Kalender Korporasi': ['src/components/CorporateCalendar.jsx', 'PageShell'],
  'Alpha Legends': ['src/components/AlphaLegend/AlphaLegendScreeners.jsx', 'PageShell'],
};

/** Pages with long result tables keep their controls reachable while scrolling. */
const STICKY_TOOLBAR_PAGES = [
  'src/components/StockTable.jsx',
  'src/components/StockScreener.jsx',
  'src/components/HistoryPanel.jsx',
  'src/components/AlphaLegend/AlphaLegendScreeners.jsx',
];

for (const [name, [file, marker]] of Object.entries(PAGES)) {
  test(`${name} renders through the page shell`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(source.includes(marker), `${file} must use ${marker}`);
    assert.match(source, /PageHeader|<PageHeader/, `${file} must use PageHeader`);
  });
}

for (const file of STICKY_TOOLBAR_PAGES) {
  test(`${file} keeps its controls in a sticky toolbar`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, /PageToolbar/, `${file} must use PageToolbar`);
  });
}

test('Dashboard owns the page gutters and does not cap content width', () => {
  const source = readFileSync(new URL('../src/components/Dashboard.jsx', import.meta.url), 'utf8');
  const mainTag = /<main className="([^"]+)"/.exec(source);
  assert.ok(mainTag, 'Dashboard must render a <main>');
  assert.ok(!/max-w-\[/.test(mainTag[1]), 'content must not be capped by a max-width');
  assert.match(mainTag[1], /px-3 sm:px-5 lg:px-6/, 'gutters must match PageToolbar negative margins');
});