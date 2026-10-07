import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guards the "Bursa 1985" design tokens in src/app/globals.css (ADR 0001):
// both themes must define the same tokens, and text colours must stay readable.
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

/**
 * Returns the `--c-*` custom properties declared inside the first block matching `selector`.
 * @param {string} selector - Exact selector text, e.g. ':root' or '.dark'.
 * @returns {Record<string, string>} Token name → value.
 */
function readTokens(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `block ${selector} not found`);
  const body = css.slice(start, css.indexOf('}', start));
  const tokens = {};
  for (const match of body.matchAll(/(--c-[a-z-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

/** Relative luminance of a #rrggbb colour (WCAG 2.x). */
function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = readTokens(':root');
const dark = readTokens('.dark');

test('light and dark themes define exactly the same tokens', () => {
  assert.deepEqual(Object.keys(dark).sort(), Object.keys(light).sort());
  assert.ok(Object.keys(light).length >= 15);
});

test('every Tailwind colour in @theme points to a defined token', () => {
  const themeStart = css.indexOf('@theme inline {');
  const themeBody = css.slice(themeStart, css.indexOf('}', themeStart));
  const refs = [...themeBody.matchAll(/--color-[a-z-]+:\s*var\((--c-[a-z-]+)\)/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(ref in light, `${ref} missing in :root`);
  }
});

for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  test(`${name}: text colours reach WCAG AA (4.5:1) on canvas, surface and sunken`, () => {
    for (const bg of ['--c-canvas', '--c-surface', '--c-sunken']) {
      for (const fg of ['--c-ink', '--c-muted', '--c-up', '--c-down', '--c-warn']) {
        const ratio = contrast(tokens[fg], tokens[bg]);
        assert.ok(ratio >= 4.5, `${fg} on ${bg} = ${ratio.toFixed(2)}:1`);
      }
    }
  });

  test(`${name}: accent button text is readable`, () => {
    const ratio = contrast(tokens['--c-on-accent'], tokens['--c-accent']);
    assert.ok(ratio >= 4.5, `on-accent on accent = ${ratio.toFixed(2)}:1`);
  });

  test(`${name}: up/down/warn text stays readable on their soft backgrounds`, () => {
    for (const key of ['up', 'down', 'warn']) {
      const ratio = contrast(tokens[`--c-${key}`], tokens[`--c-${key}-soft`]);
      assert.ok(ratio >= 4.5, `--c-${key} on --c-${key}-soft = ${ratio.toFixed(2)}:1`);
    }
  });
}
