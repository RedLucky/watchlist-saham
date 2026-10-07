import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureIndexRow,
  addConstituent,
  removeConstituent,
} from '../src/lib/idxStore.js';

/**
 * Minimal in-memory stand-in for the two Prisma tables we touch.
 *
 * @param {{ rows?: Array<object>, members?: Array<object> }} [seed]
 * @returns {{ idxIndex: object, idxConstituent: object, calls: Array<{ op: string, model: string }> }}
 */
function createFakeClient(seed = {}) {
  const rows = [...(seed.rows || [])];
  const members = [...(seed.members || [])];
  const calls = [];

  const record = (op, model) => calls.push({ op, model });

  return {
    rows,
    members,
    calls,
    idxIndex: {
      async upsert({ where, create, update }) {
        record('upsert', 'idxIndex');
        const existing = rows.find((r) => r.code === where.code);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const created = { code: create.code, ...create, memberCount: 0 };
        rows.push(created);
        return created;
      },
      async update({ where, data }) {
        record('update', 'idxIndex');
        const row = rows.find((r) => r.code === where.code);
        if (!row) throw new Error('index row missing');
        Object.assign(row, data);
        return row;
      },
    },
    idxConstituent: {
      async findUnique({ where }) {
        record('findUnique', 'idxConstituent');
        return members.find(
          (m) => m.ticker === where.indexCode_ticker.ticker && m.indexCode === where.indexCode_ticker.indexCode,
        ) || null;
      },
      async create({ data }) {
        record('create', 'idxConstituent');
        const created = { id: `id-${members.length + 1}`, ...data };
        members.push(created);
        return created;
      },
      async delete({ where }) {
        record('delete', 'idxConstituent');
        const index = members.findIndex(
          (m) => m.ticker === where.indexCode_ticker.ticker && m.indexCode === where.indexCode_ticker.indexCode,
        );
        if (index === -1) throw new Error('member missing');
        return members.splice(index, 1)[0];
      },
      async count({ where }) {
        record('count', 'idxConstituent');
        return members.filter((m) => m.indexCode === where.indexCode).length;
      },
    },
  };
}

test('ensureIndexRow', async (t) => {
  await t.test('membuat baris indeks dengan nama dari daftar referensi', async () => {
    const db = createFakeClient();
    const row = await ensureIndexRow('lq45', db);
    assert.equal(row.code, 'LQ45');
    assert.equal(row.name, 'LQ45');
    assert.equal(row.source, 'upload');
    assert.equal(db.rows.length, 1);
  });

  await t.test('isi nama & deskripsi tidak menimpa suntingan manual', async () => {
    const db = createFakeClient({ rows: [{ code: 'LQ45', name: 'LQ45 (suntingan admin)' }] });
    const row = await ensureIndexRow('LQ45', db);
    assert.equal(row.name, 'LQ45');
  });

  await t.test('kode tidak dikenal ditolak', async () => {
    const db = createFakeClient();
    await assert.rejects(() => ensureIndexRow('IDXBOGUS', db), /tidak dikenal/);
  });
});

test('addConstituent', async (t) => {
  await t.test('menambah anggota baru dan memperbarui jumlah', async () => {
    const db = createFakeClient();
    const result = await addConstituent('LQ45', 'bbca', db);
    assert.deepEqual(
      { added: result.added, ticker: result.ticker, memberCount: result.memberCount },
      { added: true, ticker: 'BBCA', memberCount: 1 },
    );
    assert.equal(db.rows[0].memberCount, 1);
  });

  await t.test('ticker yang sudah jadi anggota tidak diduplikasi', async () => {
    const db = createFakeClient({ members: [{ indexCode: 'LQ45', ticker: 'BBCA' }] });
    const result = await addConstituent('LQ45', 'BBCA', db);
    assert.equal(result.added, false);
    assert.equal(db.members.length, 1);
  });

  await t.test('tidak menandai waktu baru bila tidak ada perubahan', async () => {
    const db = createFakeClient({
      rows: [{ code: 'LQ45', lastSyncedAt: new Date('2026-01-01') }],
      members: [{ indexCode: 'LQ45', ticker: 'BBCA' }],
    });
    await addConstituent('LQ45', 'BBCA', db);
    assert.equal(db.rows[0].lastSyncedAt.toISOString(), '2026-01-01T00:00:00.000Z');
  });

  await t.test('menolak ticker tidak valid sebelum menyentuh database', async () => {
    const db = createFakeClient();
    await assert.rejects(() => addConstituent('LQ45', '12345', db), /tidak valid/);
    assert.equal(db.calls.length, 0);
  });
});

test('removeConstituent', async (t) => {
  await t.test('menghapus anggota dan memperbarui jumlah', async () => {
    const db = createFakeClient({
      rows: [{ code: 'LQ45' }],
      members: [
        { indexCode: 'LQ45', ticker: 'BBCA' },
        { indexCode: 'LQ45', ticker: 'BBRI' },
      ],
    });
    const result = await removeConstituent('LQ45', 'BBCA', db);
    assert.deepEqual(
      { removed: result.removed, memberCount: result.memberCount },
      { removed: true, memberCount: 1 },
    );
    assert.deepEqual(db.members.map((m) => m.ticker), ['BBRI']);
  });

  await t.test('menghapus anggota yang tidak ada tidak mengubah apa pun', async () => {
    const db = createFakeClient({ rows: [{ code: 'LQ45' }], members: [] });
    const result = await removeConstituent('LQ45', 'BBCA', db);
    assert.equal(result.removed, false);
    assert.ok(!db.calls.some((c) => c.op === 'delete'));
  });

  await t.test('ticker invalid ditolak', async () => {
    const db = createFakeClient();
    await assert.rejects(() => removeConstituent('LQ45', '', db), /tidak valid/);
  });
});

test('assertIndexCode & assertTicker', async (t) => {
  const { assertIndexCode, assertTicker } = await import('../src/lib/idxIndices.js');

  await t.test('kode indeks dinormalisasi jadi huruf besar', () => {
    assert.equal(assertIndexCode(' issi '), 'ISSI');
  });

  await t.test('kode indeks di luar daftar ditolak dengan daftar yang tersedia', () => {
    assert.throws(() => assertIndexCode('IXX'), /tidak dikenal/);
    assert.throws(() => assertIndexCode('IXX'), /LQ45/);
  });

  await t.test('ticker dinormalisasi dan divalidasi', () => {
    assert.equal(assertTicker(' bbca '), 'BBCA');
    assert.throws(() => assertTicker(''), /tidak valid/);
    assert.throws(() => assertTicker('TOOLONGSYM'), /tidak valid/);
  });
});