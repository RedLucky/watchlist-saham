import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildCorporateActionsTimeline } from '../src/lib/corporateActionEngine.js';

describe('Bloomberg CA: Corporate Actions & Catalyst Timeline Engine', () => {
  it('1. Menghasilkan timeline aksi korporasi lengkap dari dividen riil dan estimasi kalender', () => {
    const mockDividends = [
      {
        date: '2026-05-15',
        amount: 350,
        type: 'Cash Dividend'
      },
      {
        date: '2025-05-10',
        amount: 300,
        type: 'Cash Dividend'
      }
    ];

    const timeline = buildCorporateActionsTimeline({
      dividendHistory: mockDividends,
      ticker: 'BBCA'
    });

    assert.ok(Array.isArray(timeline), 'Timeline harus berupa array');
    assert.ok(timeline.length >= 3, 'Harus mencakup minimal Dividen, RUPS, dan LK');

    // Cek event dividen
    const divEvent = timeline.find(e => e.type === 'DIVIDEND');
    assert.ok(divEvent, 'Harus ada event tipe DIVIDEND');
    assert.ok(divEvent.title.includes('350'));
    assert.ok(divEvent.description.includes('BBCA'));

    // Cek event LK dan RUPS
    assert.ok(timeline.some(e => e.type === 'EARNINGS'));
    assert.ok(timeline.some(e => e.type === 'RUPS'));
  });

  it('2. Tetap menghasilkan estimasi kalender LK dan RUPS meskipun tanpa riwayat dividen', () => {
    const timeline = buildCorporateActionsTimeline({
      dividendHistory: [],
      ticker: 'GOTO'
    });

    assert.ok(Array.isArray(timeline));
    assert.strictEqual(timeline.filter(e => e.type === 'DIVIDEND').length, 0);
    assert.ok(timeline.some(e => e.type === 'EARNINGS'));
    assert.ok(timeline.some(e => e.type === 'RUPS'));
  });

  it('3. Menangani input undefined atau null dengan aman tanpa melempar error', () => {
    const timeline = buildCorporateActionsTimeline({});
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length > 0);
  });
});
