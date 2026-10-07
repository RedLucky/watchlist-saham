import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withAlpha, readThemeTokens, buildChartPalette, FALLBACK_TOKENS } from '../src/lib/chartTheme.js';

test('withAlpha', async (t) => {
  await t.test('mengubah #rrggbb menjadi rgba', () => {
    assert.equal(withAlpha('#2f6b3a', 0.35), 'rgba(47, 107, 58, 0.35)');
  });

  await t.test('alpha dibatasi 0–1', () => {
    assert.equal(withAlpha('#000000', 2), 'rgba(0, 0, 0, 1)');
    assert.equal(withAlpha('#ffffff', -1), 'rgba(255, 255, 255, 0)');
  });

  await t.test('format lain dikembalikan apa adanya', () => {
    assert.equal(withAlpha('red', 0.5), 'red');
    assert.equal(withAlpha('#fff', 0.5), '#fff');
  });
});

test('readThemeTokens memakai fallback di luar browser', () => {
  assert.deepEqual(readThemeTokens(false), FALLBACK_TOKENS.light);
  assert.deepEqual(readThemeTokens(true), FALLBACK_TOKENS.dark);
});

test('FALLBACK_TOKENS sama dengan nilai token di globals.css', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const block = (selector) => {
    const start = css.indexOf(`${selector} {`);
    return css.slice(start, css.indexOf('}', start));
  };
  const value = (body, name) => new RegExp(`--c-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(body)[1].toLowerCase();
  const names = { ink: 'ink', muted: 'muted', line: 'line', lineStrong: 'line-strong', up: 'up', down: 'down', warn: 'warn', accent: 'accent' };

  for (const [theme, selector] of [['light', ':root'], ['dark', '.dark']]) {
    const body = block(selector);
    for (const [key, cssName] of Object.entries(names)) {
      assert.equal(FALLBACK_TOKENS[theme][key], value(body, cssName), `${theme}.${key} tidak sinkron dengan --c-${cssName}`);
    }
  }
});

test('buildChartPalette', async (t) => {
  const palette = buildChartPalette(FALLBACK_TOKENS.light);

  await t.test('candle naik/turun memakai token up/down', () => {
    assert.equal(palette.up, FALLBACK_TOKENS.light.up);
    assert.equal(palette.down, FALLBACK_TOKENS.light.down);
    assert.equal(palette.volumeUp, withAlpha(FALLBACK_TOKENS.light.up, 0.35));
  });

  await t.test('garis indikator tidak memakai warna hijau/merah', () => {
    for (const key of ['ma20', 'ma50', 'ma200', 'rsi', 'macd', 'macdSignal']) {
      assert.notEqual(palette[key], FALLBACK_TOKENS.light.up, key);
      assert.notEqual(palette[key], FALLBACK_TOKENS.light.down, key);
    }
  });

  await t.test('semua nilai berupa string warna', () => {
    for (const [key, val] of Object.entries(palette)) {
      assert.match(val, /^(#[0-9a-f]{6}|rgba\()/i, key);
    }
  });
});
