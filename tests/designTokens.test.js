import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Guard for the "Bursa 1985" migration (ADR 0001): every UI file under src/ must use the
 * semantic theme tokens only, so the theme stays changeable from globals.css alone.
 */

/** Patterns that belong to the old look and must not appear in UI files. */
const FORBIDDEN = [
  { name: 'raw palette colour', pattern: /\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|divide|accent|decoration)-(?:slate|gray|zinc|indigo|blue|sky|cyan|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal)-\d{2,3}\b/ },
  { name: 'gradient', pattern: /\bbg-gradient-to-|\blinear-gradient\(/ },
  { name: 'glass blur', pattern: /\bbackdrop-blur/ },
  { name: 'large radius', pattern: /\brounded-(?:[trblse]{1,2}-)?(?:xl|2xl|3xl)\b/ },
  { name: 'hard-coded hex colour in className', pattern: /className=[^\n]*#[0-9a-fA-F]{3,6}\b/ },
  { name: 'colour emoji', pattern: /\p{Emoji_Presentation}|\uFE0F/u },
];

/** Lines handling user-chosen collection emoji (data, not UI icons) may contain emoji. */
const USER_EMOJI_LINE = /emoji/i;

/**
 * Lists UI source files under src/, skipping build output and the Discord/scraper scripts.
 * Those scripts run outside the browser (Discord embeds, cron logs) where the web theme
 * does not apply, so emoji and platform-specific formatting are allowed there.
 *
 * @param {string} dir - Directory to walk.
 * @returns {string[]} Repo-relative paths of .js/.jsx files.
 */
function listSourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'scripts' || entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...listSourceFiles(full));
    } else if (/\.jsx?$/.test(entry)) {
      found.push(relative(process.cwd(), full));
    }
  }
  return found;
}

const files = listSourceFiles('src');

test('src/ contains source files to check', () => {
  assert.ok(files.length > 50, `only found ${files.length} files`);
});

for (const file of files) {
  test(`${file} uses theme tokens only`, () => {
    const source = readFileSync(file, 'utf8');
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