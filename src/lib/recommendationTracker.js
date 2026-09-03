import { prisma } from './prisma.js';
import { getStyleConfig } from './modes.js';

/**
 * Send real-time Discord notification when a recommendation reaches WIN (TP) or LOSS (SL)
 * @param {Object} params
 * @param {Object} params.recommendation - The recommendation database record
 * @param {string} params.status - 'WIN' | 'LOSS'
 * @param {number} params.exitPrice - The price at which position was closed
 */
export async function sendTradeOutcomeNotification({ recommendation: rec, status, exitPrice }) {
  if (status !== 'WIN' && status !== 'LOSS') return false;

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[DISCORD-OUTCOME] DISCORD_WEBHOOK_URL belum diset. Alert status dilewati.');
    return false;
  }

  const isWin = status === 'WIN';
  const entryPrice = Number(rec.priceAtRecommend || rec.entryLow || exitPrice);
  const pnlPercent = entryPrice > 0 ? (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2) : '0.00';
  const isPositive = Number(pnlPercent) >= 0;

  // Visual embed formatting
  const color = isWin ? 0x10B981 : 0xEF4444; // Emerald Green (WIN) vs Rose Red (LOSS)
  const title = isWin 
    ? `🏆 TARGET TERCAPAI (WIN / TAKE PROFIT) — $${rec.ticker}` 
    : `🛑 STOP LOSS TERSENTUH (LOSS / CUT LOSS) — $${rec.ticker}`;

  const sourceLabel = rec.source === 'SYSTEM' ? '🤖 Rekomendasi Sistem (Discord)' : '👤 Pantauan Manual User';
  const styleLabel = (rec.style || 'SWING').toUpperCase();

  const embed = {
    title,
    description: isWin 
      ? `Saham **${rec.ticker}** (${rec.name || ''}) berhasil menyentuh target profit! Posisi resmi ditutup dengan hasil **WIN**.`
      : `Harga pasar saham **${rec.ticker}** (${rec.name || ''}) menyentuh level proteksi stop loss. Posisi resmi ditutup (**LOSS**).`,
    color,
    fields: [
      { name: '🏷️ Saham & Sumber', value: `**${rec.ticker}** • ${sourceLabel}`, inline: true },
      { name: '⏱️ Gaya Trading', value: `**${styleLabel}** (${rec.mode || 'Auto'})`, inline: true },
      { name: '📊 Realized P/L', value: `**${isPositive ? '+' : ''}${pnlPercent}%**`, inline: true },
      { name: '💵 Harga Beli (Entry)', value: `Rp ${Number(entryPrice).toLocaleString('id-ID')}`, inline: true },
      { name: '🏁 Harga Keluar (Exit)', value: `Rp ${Number(exitPrice).toLocaleString('id-ID')}`, inline: true },
      { name: isWin ? '🎯 Target TP' : '🛑 Batas Cut Loss', value: `Rp ${Number(isWin ? rec.targetPrice : rec.stopLoss).toLocaleString('id-ID')}`, inline: true },
    ],
    footer: {
      text: `Win Rate Real-time Engine • ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB`
    },
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (res.ok) {
      console.log(`[DISCORD-OUTCOME] ✅ Berhasil mengirim alert ${status} untuk saham ${rec.ticker} (P/L: ${pnlPercent}%).`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[DISCORD-OUTCOME] ❌ Gagal mengirim alert (${res.status}): ${errText}`);
      return false;
    }
  } catch (err) {
    console.error(`[DISCORD-OUTCOME-ERR] Koneksi error saat mengirim alert ${status} ${rec.ticker}:`, err.message);
    return false;
  }
}

/**
 * Phase 2 Lanjutan: Pelacakan Win-Rate & Antrean Beli
 * 1. Mengecek antrean 'WAITING_BUY': jika harga pasar turun <= harga beli, posisi MATCH dan status menjadi 'OPEN'.
 * 2. Mengecek posisi 'OPEN': menutup menjadi 'WIN' (TP) atau 'LOSS' (SL) atau 'CLOSED' (Time Stop).
 * 3. Mengirimkan notifikasi Discord secara real-time HANYA saat status berubah menjadi 'WIN' atau 'LOSS'.
 */
export async function updateExistingRecommendations(currentStocks) {
  if (!currentStocks || currentStocks.length === 0) return 0;

  const pendingRecommendations = await prisma.recommendation.findMany({
    where: { 
      status: { in: ['WAITING_BUY', 'OPEN'] }
    }
  });

  if (pendingRecommendations.length === 0) return 0;

  let resolvedCount = 0;

  for (const rec of pendingRecommendations) {
    const currentData = currentStocks.find(s => s.ticker === rec.ticker);
    if (!currentData) continue;

    const currentPrice = Number(currentData.price || 0);
    if (!currentPrice || currentPrice <= 0) continue;

    const styleConfig = getStyleConfig(rec.style || 'swing');
    const maxDays = styleConfig.maxHoldingDays || 7;
    const ageInDays = (new Date() - new Date(rec.date)) / (1000 * 60 * 60 * 24);

    // ── KASUS 1: STATUS WAITING_BUY (Antri Beli) ──────────────────
    if (rec.status === 'WAITING_BUY') {
      const buyThreshold = rec.priceAtRecommend || rec.entryHigh || rec.entryLow;
      
      // Order Match: jika harga pasar turun menyentuh atau berada di bawah harga antre beli
      if (currentPrice <= buyThreshold) {
        await prisma.recommendation.update({
          where: { id: rec.id },
          data: {
            status: 'OPEN',
            notes: `Order antre beli match pada harga pasar Rp ${currentPrice} (Target Antre: Rp ${buyThreshold})`,
          }
        });
      } else if (ageInDays > maxDays) {
        // Antrean kedaluwarsa jika dalam maxDays harga tidak pernah menyentuh level beli
        await prisma.recommendation.update({
          where: { id: rec.id },
          data: {
            status: 'EXPIRED',
            exitDate: new Date(),
            notes: `Antrean beli kedaluwarsa setelah ${maxDays} hari tanpa match.`,
          }
        });
      }
      continue;
    }

    // ── KASUS 2: STATUS OPEN (Posisi Aktif / Sudah Terbeli) ──────────
    if (rec.status === 'OPEN') {
      let newStatus = null;
      let exitPrice = null;

      if (currentPrice >= rec.targetPrice) {
        newStatus = 'WIN';
        exitPrice = currentPrice;
      } else if (currentPrice <= rec.stopLoss) {
        newStatus = 'LOSS';
        exitPrice = currentPrice;
      } else if (ageInDays > maxDays) {
        newStatus = 'CLOSED';
        exitPrice = currentPrice;
      }

      if (newStatus) {
        await prisma.recommendation.update({
          where: { id: rec.id },
          data: {
            status: newStatus,
            exitPrice: exitPrice,
            exitDate: new Date(),
            notes: `Posisi selesai ditutup oleh sistem. Status: ${newStatus} pada Rp ${exitPrice}`
          }
        });

        resolvedCount++;

        // 🚀 REAL-TIME DISCORD NOTIFICATION HANYA UNTUK WIN ATAU LOSS
        if (newStatus === 'WIN' || newStatus === 'LOSS') {
          void sendTradeOutcomeNotification({
            recommendation: rec,
            status: newStatus,
            exitPrice: exitPrice,
          }).catch(err => console.error('[DISCORD-ALERT-ERR]', err));
        }
      }
    }
  }

  return resolvedCount;
}
