import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAVIGATION_MENU,
  MOBILE_PRIMARY_IDS,
  flattenMenu,
  splitMobileNav,
  findMenuItem,
  hasPreviousMonthKseiData,
} from '../src/lib/navigation.js';

test('NAVIGATION_MENU', async (t) => {
  await t.test('berisi 12 menu dengan id unik dan label pendek', () => {
    const items = flattenMenu();
    assert.equal(items.length, 12);
    assert.equal(new Set(items.map((i) => i.id)).size, 12);
    for (const item of items) {
      assert.ok(item.label && item.shortLabel && item.icon, `menu ${item.id} tidak lengkap`);
      assert.ok(item.shortLabel.length <= 10, `shortLabel ${item.shortLabel} terlalu panjang untuk bar mobile`);
    }
  });

  await t.test('ikon bukan emoji berwarna (tidak memakai selector emoji U+FE0F)', () => {
    for (const item of flattenMenu()) {
      assert.ok(!item.icon.includes('\uFE0F'), `ikon ${item.id} memakai emoji presentation`);
    }
  });
});

test('splitMobileNav', async (t) => {
  await t.test('4 menu utama sesuai urutan + sisanya di "Lainnya"', () => {
    const { primary, more } = splitMobileNav();
    assert.deepEqual(primary.map((i) => i.id), MOBILE_PRIMARY_IDS);
    assert.equal(more.length, 8);
    assert.ok(more.every((i) => !MOBILE_PRIMARY_IDS.includes(i.id)));
  });

  await t.test('id utama yang tidak dikenal diabaikan', () => {
    const { primary, more } = splitMobileNav(NAVIGATION_MENU, ['explorer', 'tidak-ada']);
    assert.deepEqual(primary.map((i) => i.id), ['explorer']);
    assert.equal(more.length, 11);
  });
});

test('findMenuItem', async (t) => {
  await t.test('menemukan menu berdasarkan id', () => {
    assert.equal(findMenuItem('pension').label, 'Kalkulator Pensiun');
  });

  await t.test('null untuk id tidak dikenal', () => {
    assert.equal(findMenuItem('tidak-ada'), null);
  });
});

test('hasPreviousMonthKseiData', async (t) => {
  const now = new Date(2026, 9, 7); // 7 Oktober 2026 → bulan lalu = September 2026

  await t.test('menerima format YYYY-MM, MON-YYYY dan MON YYYY', () => {
    assert.equal(hasPreviousMonthKseiData(['2026-09-30'], now), true);
    assert.equal(hasPreviousMonthKseiData(['sep-2026'], now), true);
    assert.equal(hasPreviousMonthKseiData(['SEP 2026'], now), true);
  });

  await t.test('false bila hanya ada periode lain', () => {
    assert.equal(hasPreviousMonthKseiData(['2026-08-31', 'OCT-2026'], now), false);
  });

  await t.test('Januari melihat Desember tahun sebelumnya', () => {
    assert.equal(hasPreviousMonthKseiData(['2025-12-31'], new Date(2026, 0, 15)), true);
  });

  await t.test('input kosong atau bukan array aman', () => {
    assert.equal(hasPreviousMonthKseiData([], now), false);
    assert.equal(hasPreviousMonthKseiData([null, ''], now), false);
    assert.equal(hasPreviousMonthKseiData(undefined, now), false);
  });
});
