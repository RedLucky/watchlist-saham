import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Prop-name contract between Dashboard and its child components.
 *
 * React does not warn when a parent passes a prop a child never reads, so a typo silently
 * disables a feature (this happened with CustomSliders: Dashboard passed `onWeightsChange`
 * while the component called `onApply`, so "Terapkan Analisis" threw on click).
 * These tests read both sides and compare them.
 */

const dashboard = readFileSync(new URL('../src/components/Dashboard.jsx', import.meta.url), 'utf8');

/**
 * Prop names a component destructures from its props object.
 * @param {string} file - Repo-relative path of the component.
 * @returns {Set<string>} Accepted prop names.
 */
function acceptedProps(file) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const signature = /export default function \w+\(\{([\s\S]*?)\}\)/.exec(source);
  assert.ok(signature, `cannot read the props of ${file}`);
  return new Set(
    signature[1]
      .split(',')
      .map((part) => part.split('=')[0].split(':')[0].trim())
      .filter(Boolean)
  );
}

/**
 * Prop names Dashboard passes to a component at a given JSX tag.
 * @param {string} tagName - Component name as used in JSX.
 * @returns {Set<string>} Passed prop names (excluding `key`).
 */
function passedProps(tagName) {
  const tag = new RegExp(`<${tagName}\\s([\\s\\S]*?)\\/?>`, 'g');
  const names = new Set();
  for (const match of dashboard.matchAll(tag)) {
    // The first attribute has no leading space, so match at the start too.
    for (const attr of match[1].matchAll(/(?:^|\s)([a-zA-Z][a-zA-Z0-9]*)\s*=/g)) {
      if (attr[1] !== 'key') names.add(attr[1]);
    }
  }
  return names;
}

/** Child components rendered by Dashboard, with their file path. */
const CHILDREN = {
  CustomSliders: 'src/components/CustomSliders.jsx',
  StyleSelector: 'src/components/StyleSelector.jsx',
  ModeSelector: 'src/components/ModeSelector.jsx',
  MarketBadge: 'src/components/MarketBadge.jsx',
  SectorBar: 'src/components/SectorBar.jsx',
  StockTable: 'src/components/StockTable.jsx',
  StockExplorer: 'src/components/StockExplorer.jsx',
  MobileNav: 'src/components/Navigation/MobileNav.jsx',
  TopHeader: 'src/components/Navigation/TopHeader.jsx',
  Sidebar: 'src/components/Navigation/Sidebar.jsx',
};

for (const [name, file] of Object.entries(CHILDREN)) {
  test(`Dashboard passes only props that ${name} accepts`, () => {
    const accepted = acceptedProps(file);
    const passed = passedProps(name);

    assert.ok(passed.size > 0, `${name} is not used in Dashboard`);

    const unknown = [...passed].filter((prop) => !accepted.has(prop));
    assert.deepEqual(unknown, [], `${name} does not use: ${unknown.join(', ')}`);
  });
}

test('CustomSliders calls onApply, the prop Dashboard passes', () => {
  const source = readFileSync(new URL('../src/components/CustomSliders.jsx', import.meta.url), 'utf8');
  assert.match(source, /onClick=\{\(\) => onApply\(weights\)\}/);
  assert.ok(acceptedProps('src/components/CustomSliders.jsx').has('onApply'));
});