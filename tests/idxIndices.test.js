import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACKED_INDEX_CODES,
  STALE_AFTER_DAYS,
  isStaleSync,
  buildMembershipMaps,
  parseMembershipText,
} from '../src/lib/idxIndices.js';

test('daftar indeks yang dipantau', async (t) => {
  await t.test('lima indeks sesuai kebutuhan', () => {
    assert.deepEqual(TRACKED_INDEX_CODES, ['LQ45', 'IDX30', 'IDXVALUE30', 'HIDV20', 'ISSI']);
  });

  await t.test('ISSI terdeteksi sebagai indeks syariah', () => {
    assert.ok(TRACKED_INDEX_CODES.includes('ISSI'));
  });
});

test('isStaleSync', async (t) => {
  const now = new Date('2026-10-07T00:00:00Z');

  await t.test('data kosong dianggap basi', () => {
    assert.equal(isStaleSync(null, now), true);
    assert.equal(isStaleSync(undefined, now), true);
    assert.equal(isStaleSync('tidak-valid', now), true);
  });

  await t.test('data baru tidak basi', () => {
    const fresh = new Date(now.getTime() - 5 * 86_400_000);
    assert.equal(isStaleSync(fresh, now), false);
  });

  await t.test(`data lebih tua dari ${STALE_AFTER_DAYS} hari dianggap basi`, () => {
    const old = new Date(now.getTime() - (STALE_AFTER_DAYS + 1) * 86_400_000);
    assert.equal(isStaleSync(old, now), true);
  });

  await t.test('menerima string dan angka', () => {
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000).toISOString();
    assert.equal(isStaleSync(fiveDaysAgo, now), false);
    assert.equal(isStaleSync(now.getTime(), now), false);
  });
});

test('buildMembershipMaps', async (t) => {
  const rows = [
    { indexCode: 'LQ45', ticker: 'BBRI' },
    { indexCode: 'ISSI', ticker: 'BBRI' },
    { indexCode: 'LQ45', ticker: 'BBCA' },
  ];

  await t.test('ticker dipetakan ke semua indeksnya', () => {
    const { byTicker } = buildMembershipMaps(rows);
    assert.deepEqual(byTicker.BBRI, ['ISSI', 'LQ45']);
    assert.deepEqual(byTicker.BBCA, ['LQ45']);
  });

  await t.test('indeks dipetakan ke semua anggotanya', () => {
    const { byIndex } = buildMembershipMaps(rows);
    assert.deepEqual(byIndex.LQ45, ['BBCA', 'BBRI']);
  });

  await t.test('baris cacat dilewati tanpa error', () => {
    const { byTicker, byIndex } = buildMembershipMaps([{ indexCode: 'LQ45' }, null, { ticker: 'TLKM' }]);
    assert.deepEqual(byTicker, {});
    assert.deepEqual(byIndex, {});
  });

  await t.test('input kosong aman', () => {
    assert.deepEqual(buildMembershipMaps(), { byTicker: {}, byIndex: {} });
  });
});

test('parseMembershipText', async (t) => {
  await t.test('satu ticker per baris dengan indeks default', () => {
    const rows = parseMembershipText('BBCA\nBBRI\n\nTLKM', { defaultIndex: 'LQ45' });
    assert.deepEqual(rows, [
      { indexCode: 'LQ45', ticker: 'BBCA' },
      { indexCode: 'LQ45', ticker: 'BBRI' },
      { indexCode: 'LQ45', ticker: 'TLKM' },
    ]);
  });

  await t.test('format kodeindeks + ticker per baris', () => {
    const rows = parseMembershipText('LQ45\tBBCA\nISSI,BBRI');
    assert.deepEqual(rows, [
      { indexCode: 'LQ45', ticker: 'BBCA' },
      { indexCode: 'ISSI', ticker: 'BBRI' },
    ]);
  });

  await t.test('komentar dan baris kosong diabaikan', () => {
    const rows = parseMembershipText('# daftar LQ45\n\nBBCA\n# akhir', { defaultIndex: 'LQ45' });
    assert.equal(rows.length, 1);
  });

  await t.test('kode indeks tidak dikenal ditolak dengan pesan jelas', () => {
    assert.throws(
      () => parseMembershipText('IDXBOGUS\tBBCA'),
      /tidak valid|kode indeks tidak dikenal/,
    );
  });

  await t.test('ticker tidak valid ditolak', () => {
    assert.throws(() => parseMembershipText('LQ45\t12345'), /ticker tidak valid/);
  });

  await t.test('ticker huruf kecil dinormalisasi jadi huruf besar', () => {
    const rows = parseMembershipText('bbca', { defaultIndex: 'lq45' });
    assert.deepEqual(rows, [{ indexCode: 'LQ45', ticker: 'BBCA' }]);
  });
});