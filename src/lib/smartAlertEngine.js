/**
 * Bloomberg ALRT: Rule-Based Smart Alert Engine & Discord Trigger
 * 
 * Evaluates real-time market anomalies and corporate signals:
 * 1. Proximity to Auto-Rejection limits (Near ARA / Near ARB <= 2 ticks)
 * 2. Statistical Valuation Extremes (PBND Z-Score <= -1.5 SD)
 * 3. High-Yield Dividend Trap Warnings
 * 4. Unusual Volume Surge (> 2.5x 5-day average)
 */

export const ALERT_RULES = {
  NEAR_ARA: 'NEAR_ARA',
  NEAR_ARB: 'NEAR_ARB',
  VALUATION_DISCOUNT: 'VALUATION_DISCOUNT',
  DIVIDEND_TRAP: 'DIVIDEND_TRAP',
  VOLUME_SPIKE: 'VOLUME_SPIKE'
};

/**
 * Evaluates an emiten for active market alerts
 */
export function evaluateStockAlerts({
  ticker = '',
  name = '',
  price = 0,
  prevClose = null,
  executionLimits = null,
  valuationBands = null,
  dividendTrap = null,
  technicals = null
}) {
  const alerts = [];
  const safeTicker = String(ticker || '').toUpperCase();
  const safePrice = Number(price) || 0;

  if (!safeTicker || safePrice <= 0) {
    return alerts;
  }

  // 1. Proximity to Auto-Rejection (ARA / ARB)
  if (executionLimits) {
    if (executionLimits.proximity === 'AT_ARA') {
      alerts.push({
        ruleId: ALERT_RULES.NEAR_ARA,
        level: 'CRITICAL',
        title: `🚀 ${safeTicker} Menyentuh ARA (Rp ${executionLimits.araPrice.toLocaleString('id-ID')})`,
        message: `Saham ${name || safeTicker} telah mencapai batas batas Auto-Rejection Atas (+${executionLimits.limitPct}%). Order beli berpotensi antre panjang.`,
        badgeColor: 'emerald',
        timestamp: new Date().toISOString()
      });
    } else if (executionLimits.ticksToARA > 0 && executionLimits.ticksToARA <= 2) {
      alerts.push({
        ruleId: ALERT_RULES.NEAR_ARA,
        level: 'WARNING',
        title: `⚡ ${safeTicker} Dekat ARA (Sisa ${executionLimits.ticksToARA} Fraksi)`,
        message: `Harga saat ini Rp ${safePrice.toLocaleString('id-ID')} hanya berjarak ${executionLimits.ticksToARA} fraksi harga menuju batas ARA (Rp ${executionLimits.araPrice.toLocaleString('id-ID')}).`,
        badgeColor: 'emerald',
        timestamp: new Date().toISOString()
      });
    }

    if (executionLimits.proximity === 'AT_ARB') {
      alerts.push({
        ruleId: ALERT_RULES.NEAR_ARB,
        level: 'CRITICAL',
        title: `🩸 ${safeTicker} Terkunci ARB (Rp ${executionLimits.arbPrice.toLocaleString('id-ID')})`,
        message: `Saham ${name || safeTicker} telah mengunci batas Auto-Rejection Bawah (-${executionLimits.limitPct}%). Tekanan jual ekstrem terdeteksi.`,
        badgeColor: 'rose',
        timestamp: new Date().toISOString()
      });
    } else if (executionLimits.ticksToARB > 0 && executionLimits.ticksToARB <= 2) {
      alerts.push({
        ruleId: ALERT_RULES.NEAR_ARB,
        level: 'WARNING',
        title: `⚠️ ${safeTicker} Dekat ARB (Sisa ${executionLimits.ticksToARB} Fraksi)`,
        message: `Harga saat ini Rp ${safePrice.toLocaleString('id-ID')} hanya berjarak ${executionLimits.ticksToARB} fraksi harga menuju batas ARB (Rp ${executionLimits.arbPrice.toLocaleString('id-ID')}).`,
        badgeColor: 'rose',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Valuation Band Deep Discount (Z-Score <= -1.5)
  if (valuationBands?.pe?.zScore != null && valuationBands.pe.zScore <= -1.5) {
    alerts.push({
      ruleId: ALERT_RULES.VALUATION_DISCOUNT,
      level: 'INFO',
      title: `💎 ${safeTicker} di Zona Diskon Ekstrem (P/E Band -2SD)`,
      message: `P/E saat ini berada pada level deviasi standar ${valuationBands.pe.zScore} SD. Secara historis merupakan zona akumulasi bernilai tinggi.`,
      badgeColor: 'indigo',
      timestamp: new Date().toISOString()
    });
  }

  // 3. Dividend Trap Alert
  if (dividendTrap && dividendTrap.isDividendPayer && dividendTrap.safetyScore < 45 && dividendTrap.yieldPct >= 9.0) {
    alerts.push({
      ruleId: ALERT_RULES.DIVIDEND_TRAP,
      level: 'WARNING',
      title: `🪤 Waspada Dividend Trap pada ${safeTicker} (Yield ${dividendTrap.yieldPct}%)`,
      message: `Imbal hasil dividen tinggi namun skor ketahanan kas hanya ${dividendTrap.safetyScore}/100. Risiko kejatuhan harga di hari Ex-Date tinggi.`,
      badgeColor: 'amber',
      timestamp: new Date().toISOString()
    });
  }

  // 4. Unusual Volume Surge (> 2.5x 5-day average volume)
  if (technicals?.volumes && Array.isArray(technicals.volumes) && technicals.volumes.length >= 6) {
    const vols = technicals.volumes.map(v => Number(v) || 0);
    const lastVol = vols[vols.length - 1];
    const prev5Vols = vols.slice(-6, -1);
    const avg5Vol = prev5Vols.reduce((a, b) => a + b, 0) / prev5Vols.length;

    if (avg5Vol > 0 && lastVol >= avg5Vol * 2.5) {
      const multiplier = Number((lastVol / avg5Vol).toFixed(1));
      alerts.push({
        ruleId: ALERT_RULES.VOLUME_SPIKE,
        level: 'INFO',
        title: `📊 Volume Lonjakan Ekstrem ${safeTicker} (${multiplier}x Lipat)`,
        message: `Volume perdagangan hari ini melonjak ${multiplier}x di atas rata-rata 5 hari terakhir. Menandakan aktivitas akumulasi/distribusi besar.`,
        badgeColor: 'purple',
        timestamp: new Date().toISOString()
      });
    }
  }

  return alerts;
}

/**
 * Formats Alert into Discord Rich Embed Format
 */
export function formatDiscordAlertEmbed(alert, ticker) {
  const colorMap = {
    CRITICAL: 0xef4444, // Red
    WARNING: 0xf59e0b,  // Amber
    INFO: 0x3b82f6      // Blue
  };

  return {
    embeds: [
      {
        title: alert.title,
        description: alert.message,
        color: colorMap[alert.level] || 0x6366f1,
        fields: [
          { name: 'Emiten', value: ticker, inline: true },
          { name: 'Tingkat Sinyal', value: alert.level, inline: true },
          { name: 'Waktu Peringatan', value: new Date(alert.timestamp).toLocaleTimeString('id-ID'), inline: true }
        ],
        footer: {
          text: 'Bloomberg ALRT • Watchlist Saham Real-Time Intelligence'
        }
      }
    ]
  };
}

