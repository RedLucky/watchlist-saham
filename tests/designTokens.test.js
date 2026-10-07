import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Guard for the "Bursa 1985" migration (ADR 0001): files listed here must use the
 * semantic theme tokens only. Add each file to MIGRATED_FILES once it is migrated;
 * TASK-7761 extends the check to the whole of src/.
 */
const MIGRATED_FILES = [
  'src/app/layout.js',
  'src/components/ThemeToggle.jsx',
  'src/components/Dashboard.jsx',
  'src/components/Navigation/Sidebar.jsx',
  'src/components/Navigation/TopHeader.jsx',
  'src/components/Navigation/MobileNav.jsx',
  'src/components/ScoreBadge.jsx',
  'src/components/ScoreBar.jsx',
  'src/components/Tooltip.jsx',
  'src/components/StyleSelector.jsx',
  'src/components/ModeSelector.jsx',
  'src/components/CustomSliders.jsx',
  'src/components/MarketBadge.jsx',
  'src/components/SectorBar.jsx',
  'src/components/AuthModal.jsx',
  // TASK-8835: Analisis Saham page
  'src/components/StockTable.jsx',
  'src/components/SectorRrgPanel.jsx',
  // TASK-4102: Stock Explorer
  'src/components/StockExplorer.jsx',
  // TASK-5527: Stock Explorer analysis panels & chart
  'src/components/RelativeValuationPeers.jsx',
  'src/components/ValuationBandsPanel.jsx',
  'src/components/EconomicValuePanel.jsx',
  'src/components/ScenarioForecaster.jsx',
  'src/components/DividendTrapPanel.jsx',
  'src/components/AutoRejectionLadderPanel.jsx',
  'src/components/SmartMoneyLiquidityPanel.jsx',
  'src/components/BloombergIntelligencePanel.jsx',
  'src/components/MonthlySeasonalityPanel.jsx',
  'src/components/FinancialMatrixPanel.jsx',
  'src/components/DetailPanel.jsx',
  'src/components/StockChart.jsx',
];

/** Lines that handle user-chosen collection emoji (data, not UI icons) may contain emoji. */
const USER_EMOJI_LINE = /emoji/i;

/** Patterns that belong to the old look and must not appear in migrated files. */
const FORBIDDEN = [
  { name: 'raw palette colour', pattern: /\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|divide|accent|decoration)-(?:slate|gray|zinc|indigo|blue|sky|cyan|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal)-\d{2,3}\b/ },
  { name: 'gradient', pattern: /\bbg-gradient-to-|\blinear-gradient\(/ },
  { name: 'glass blur', pattern: /\bbackdrop-blur/ },
  { name: 'large radius', pattern: /\brounded-(?:[trblse]{1,2}-)?(?:xl|2xl|3xl)\b/ },
  { name: 'hard-coded hex colour in className', pattern: /className=[^\n]*#[0-9a-fA-F]{3,6}\b/ },
  { name: 'colour emoji', pattern: /\p{Emoji_Presentation}|\uFE0F/u },
];

for (const file of MIGRATED_FILES) {
  test(`${file} uses theme tokens only`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const problems = [];

    source.split('\n').forEach((line, index) => {
      for (const { name, pattern } of FORBIDDEN) {
        if (name === 'colour emoji' && USER_EMOJI_LINE.test(line)) continue;
        if (pattern.test(line)) problems.push(`line ${index + 1}: ${name}: ${line.trim().slice(0, 120)}`);
      }
    });

    assert.deepEqual(problems, []);
  });
}
