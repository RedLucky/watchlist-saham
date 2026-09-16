import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateStockAlerts,
  formatDiscordAlertEmbed,
  ALERT_RULES
} from '../src/lib/smartAlertEngine.js';

describe('Bloomberg ALRT: Rule-Based Smart Alert Engine Suite', () => {
  it('1. Memunculkan sinyal peringatan saat saham mendekati atau menyentuh ARA', () => {
    const alerts = evaluateStockAlerts({
      ticker: 'BREN',
      name: 'Barito Renewables',
      price: 10000,
      executionLimits: {
        proximity: 'AT_ARA',
        araPrice: 10000,
        arbPrice: 6000,
        limitPct: 25,
        ticksToARA: 0,
        ticksToARB: 50
      }
    });

    assert.ok(alerts.length > 0);
    const araAlert = alerts.find(a => a.ruleId === ALERT_RULES.NEAR_ARA);
    assert.ok(araAlert);
    assert.strictEqual(araAlert.level, 'CRITICAL');
    assert.ok(araAlert.title.includes('Menyentuh ARA'));
  });

  it('2. Mendeteksi sinyal diskon ekstrem jika P/E Band Z-Score <= -1.5', () => {
    const alerts = evaluateStockAlerts({
      ticker: 'UNVR',
      name: 'Unilever Indonesia',
      price: 2000,
      valuationBands: {
        pe: { zScore: -1.8 }
      }
    });

    const discAlert = alerts.find(a => a.ruleId === ALERT_RULES.VALUATION_DISCOUNT);
    assert.ok(discAlert);
    assert.strictEqual(discAlert.badgeColor, 'indigo');
  });

  it('3. Memunculkan peringatan bahaya Dividend Trap', () => {
    const alerts = evaluateStockAlerts({
      ticker: 'HEXA',
      name: 'Hexindo Adiperkasa',
      price: 6000,
      dividendTrap: {
        isDividendPayer: true,
        safetyScore: 35,
        yieldPct: 15.2
      }
    });

    const trapAlert = alerts.find(a => a.ruleId === ALERT_RULES.DIVIDEND_TRAP);
    assert.ok(trapAlert);
    assert.strictEqual(trapAlert.level, 'WARNING');
  });

  it('4. Memformat payload Discord embed dengan benar', () => {
    const alert = {
      title: '🚀 Sinyal Uji Coba',
      message: 'Uji coba pesan',
      level: 'CRITICAL',
      timestamp: new Date().toISOString()
    };

    const discordPayload = formatDiscordAlertEmbed(alert, 'BBCA');
    assert.ok(discordPayload.embeds);
    assert.strictEqual(discordPayload.embeds.length, 1);
    assert.strictEqual(discordPayload.embeds[0].title, alert.title);
    assert.strictEqual(discordPayload.embeds[0].color, 0xef4444); // Red for CRITICAL
  });

  it('5. Mengembalikan array kosong jika parameter tidak valid', () => {
    const alerts = evaluateStockAlerts({ ticker: '', price: 0 });
    assert.deepStrictEqual(alerts, []);
  });
});
