/**
 * Pure helpers for the Koleksi Saham page (Stock Explorer).
 * They hold the small calculations behind each collection card and the summary row,
 * so the UI stays simple and the logic is unit-tested.
 */

/**
 * Composite score shown on a card, using the same weights as the Stock Explorer
 * detail view: fundamental 45%, technical 35%, trending 10%, smart money 10%.
 * Missing sub-scores default to a neutral 50.
 *
 * @param {{ fundamental?: number|null, technical?: number|null, trending?: number|null, smartMoney?: number|null }} scores
 * @returns {number} Rounded composite score (0–100).
 */
export function getCompositeScore(scores = {}) {
  const fundamental = scores.fundamental ?? 50;
  const technical = scores.technical ?? 50;
  const trending = scores.trending ?? 50;
  const smartMoney = scores.smartMoney ?? 50;
  return Math.round(fundamental * 0.45 + technical * 0.35 + trending * 0.10 + smartMoney * 0.10);
}

/**
 * Colour band for a score badge, using the app's thresholds (≥80, ≥65, ≥50).
 *
 * @param {number|null|undefined} score - Composite score.
 * @returns {'excellent'|'good'|'fair'|'poor'|null} Band name, or null when there is no score.
 */
export function getScoreTone(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Whether the live price has reached the user's buy or sell target.
 * A buy target is hit when price ≤ targetBuy; a sell target when price ≥ targetSell.
 * A missing or zero price never counts as a hit.
 *
 * @param {number|null|undefined} price - Current price.
 * @param {number|null|undefined} targetBuy - Target buy price.
 * @param {number|null|undefined} targetSell - Target sell price.
 * @returns {{ isBuyHit: boolean, isSellHit: boolean }}
 */
export function getTargetStatus(price, targetBuy, targetSell) {
  const hasPrice = Number(price) > 0;
  return {
    isBuyHit: hasPrice && targetBuy != null && price <= targetBuy,
    isSellHit: hasPrice && targetSell != null && price >= targetSell,
  };
}

/**
 * Where the current price sits between the buy target (0%) and the sell target (100%).
 * Used for the small progress bar on a card. Clamped to 0–100.
 *
 * @param {number|null|undefined} price - Current price.
 * @param {number|null|undefined} targetBuy - Target buy price.
 * @param {number|null|undefined} targetSell - Target sell price.
 * @returns {number|null} Percentage 0–100, or null when it cannot be computed
 *   (missing price/targets, or sell target not above buy target).
 */
export function getTargetProgress(price, targetBuy, targetSell) {
  if (!(Number(price) > 0) || targetBuy == null || targetSell == null) return null;
  const range = targetSell - targetBuy;
  if (!(range > 0)) return null;
  const pct = ((price - targetBuy) / range) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Summary numbers for the selected collection, shown above the card grid.
 *
 * @param {Array<{ targetBuy?: number|null, targetSell?: number|null, stock?: { price?: number, changePercent?: number } }>} items
 * @returns {{ count: number, buyHits: number, sellHits: number, gainers: number, losers: number, avgChange: number|null }}
 *   avgChange is the average daily % change of items that have a change value, or null if none do.
 */
export function summarizeCollection(items = []) {
  let buyHits = 0;
  let sellHits = 0;
  let gainers = 0;
  let losers = 0;
  let changeSum = 0;
  let changeCount = 0;

  for (const item of items) {
    const stock = item?.stock || {};
    const { isBuyHit, isSellHit } = getTargetStatus(stock.price, item?.targetBuy, item?.targetSell);
    if (isBuyHit) buyHits += 1;
    if (isSellHit) sellHits += 1;

    const change = Number(stock.changePercent);
    if (stock.changePercent == null || Number.isNaN(change)) continue;
    changeSum += change;
    changeCount += 1;
    if (change > 0) gainers += 1;
    else if (change < 0) losers += 1;
  }

  return {
    count: items.length,
    buyHits,
    sellHits,
    gainers,
    losers,
    avgChange: changeCount > 0 ? changeSum / changeCount : null,
  };
}
