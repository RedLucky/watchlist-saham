/**
 * Background Sync Worker
 *
 * Runs periodic price and deep syncs on the server side.
 * Guards against overlapping syncs and implements backoff on errors.
 */
import { fastSyncPrices, getTargetTickers, deepSyncStock, getOldestDeepSyncTickers } from './syncService';

let intervalInitialized = false;
let isDeepSyncing = false;

export function initBackgroundSync() {
  if (intervalInitialized || typeof window !== 'undefined') return;

  const intervalMins = parseInt(process.env.SYNC_INTERVAL_MINS || '5');
  const intervalMs = intervalMins * 60 * 1000;

  console.log(`[Worker] Initializing background sync every ${intervalMins} minutes.`);

  // 1. Initial fast sync
  fastSyncPrices().catch(err => {
    console.error('[Worker] Initial fast sync failed:', err?.message || err);
  });

  // 2. Priority Deep Sync on Startup (sequential, top 10 stocks)
  (async () => {
    try {
      const all = await getTargetTickers();
      const priority = all.slice(0, 10);
      console.log(`[Worker] Priority Deep Sync for ${priority.length} stocks...`);
      isDeepSyncing = true;
      for (const t of priority) {
        const result = await deepSyncStock(t);
        if (!result?.success) {
          console.error(`[Worker] Priority deep sync failed for ${t}: ${result?.error || 'Unknown'}`);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('[Worker] Priority deep sync failed:', err?.message || err);
    } finally {
      isDeepSyncing = false;
    }
  })();

  // 3. Scheduled fast sync loop
  setInterval(() => {
    console.log(`[Worker] Scheduled fast sync...`);
    fastSyncPrices().catch(err => {
      console.error('[Worker] Scheduled fast sync failed:', err?.message || err);
    });
  }, intervalMs);

  // 4. Background deep sync loop
  // Process 5 stocks at a time, SEQUENTIALLY, every 60 seconds.
  // This avoids hammering Yahoo's API with parallel requests.
  setInterval(async () => {
    if (isDeepSyncing) {
      console.log('[Worker] Deep sync already running, skipping batch.');
      return;
    }

    try {
      isDeepSyncing = true;
      const batch = await getOldestDeepSyncTickers(5);
      if (batch.length === 0) return;

      console.log(`[Worker] Deep Sync Batch: ${batch.join(', ')}`);

      let consecutiveErrors = 0;
      for (const ticker of batch) {
        const result = await deepSyncStock(ticker);
        if (!result?.success) {
          consecutiveErrors++;
          console.error(`[Worker] Deep sync failed for ${ticker}: ${result?.error || 'Unknown'}`);

          // Backoff: if 3+ consecutive errors, likely rate-limited
          if (consecutiveErrors >= 3) {
            console.warn('[Worker] Too many consecutive errors, backing off 30s...');
            await new Promise(r => setTimeout(r, 30000));
            consecutiveErrors = 0;
          }
        } else {
          consecutiveErrors = 0;
        }

        // Polite delay between stocks
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error('[Worker] Deep sync batch failed:', err?.message || err);
    } finally {
      isDeepSyncing = false;
    }
  }, 60000); // Every 60 seconds

  intervalInitialized = true;
}
