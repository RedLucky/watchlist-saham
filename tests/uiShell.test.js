import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * Contract for the page shell (src/components/ui/*): the classes below are what keeps every
 * page aligned and full-width. If they change, update the design-system wiki page too.
 */

const uiDir = new URL('../src/components/ui/', import.meta.url);
const files = readdirSync(uiDir).filter((f) => f.endsWith('.jsx'));
const sources = Object.fromEntries(files.map((f) => [f, readFileSync(new URL(f, uiDir), 'utf8')]));

test('shell components exist', () => {
  assert.deepEqual(files.sort(), ['PageShell.jsx', 'StatCard.jsx', 'TechnicalSummary.jsx']);
});

test('PageShell has no max-width cap so content fills the screen', () => {
  const shell = sources['PageShell.jsx'];
  assert.ok(!/max-w-\[/.test(shell), 'PageShell must not cap the content width');
  assert.match(shell, /w-full/);
});

test('PageHeader uses the newspaper page title and a double rule', () => {
  const shell = sources['PageShell.jsx'];
  assert.match(shell, /className="page-title"/);
  assert.match(shell, /rule-double/);
});

test('PageToolbar is sticky below the mobile header and has full-bleed gutters', () => {
  const toolbar = /export function PageToolbar[\s\S]*?\n}/.exec(sources['PageShell.jsx'])[0];
  assert.match(toolbar, /sticky top-12 lg:top-0/, 'must clear the 48px mobile header');
  // Negative margins cancel the page gutters so the bar spans edge to edge.
  assert.match(toolbar, /-mx-3/);
});

test('StatGrid adds columns with the viewport instead of a fixed count', () => {
  const grid = /export function StatGrid[\s\S]*?\n}/.exec(sources['StatCard.jsx'])[0];
  assert.match(grid, /auto-fill/, 'grid must use auto-fill');
  assert.ok(!/grid-cols-\d/.test(grid), 'grid must not use a fixed column count');
});

test('shell components only use theme tokens', () => {
  for (const [name, source] of Object.entries(sources)) {
    assert.ok(!/\b(?:bg|text|border)-(?:slate|gray|indigo|blue|sky|cyan|violet|purple|rose|red|amber|yellow|green|emerald)-\d{2,3}\b/.test(source), name);
    assert.ok(!/bg-gradient-to-|backdrop-blur/.test(source), name);
    assert.ok(!/rounded-(?:[trblse]{1,2}-)?(?:xl|2xl|3xl)/.test(source), name);
  }
});

test('TechnicalSummary is collapsed by default and exposes aria-expanded', () => {
  const summary = sources['TechnicalSummary.jsx'];
  assert.match(summary, /defaultOpen = false/);
  assert.match(summary, /aria-expanded=\{open\}/);
});