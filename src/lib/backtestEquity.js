/**
 * Equity-curve maths for the backtest report (src/components/BacktestPanel.jsx).
 * Kept separate from the component so the numbers can be unit-tested.
 */

/** Starting capital of every simulation, in rupiah. */
export const INITIAL_CAPITAL = 10_000_000;

/**
 * Turns a list of trades into the equity curve and the underwater drawdown profile.
 *
 * Capital compounds trade after trade (`capital *= 1 + pnlPercent/100`). Drawdown is
 * measured against the running peak, as a percentage.
 *
 * @param {Array<{ pnlPercent: number, exitDate?: string, entryDate?: string }>} trades - Closed trades in order.
 * @param {number} [initialCapital=INITIAL_CAPITAL] - Starting capital in rupiah.
 * @returns {{
 *   points: Array<{ step: number, date: string, capital: number, drawdown: number }>,
 *   finalCapital: number, peakCapital: number, maxDrawdown: number, netReturn: number
 * }}
 *   `points[0]` is the starting capital before any trade.
 */
export function buildEquityCurve(trades = [], initialCapital = INITIAL_CAPITAL) {
  let capital = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;

  const points = [{ step: 0, date: 'Mulai', capital: initialCapital, drawdown: 0 }];

  trades.forEach((trade, index) => {
    capital = capital * (1 + Number(trade.pnlPercent || 0) / 100);
    if (capital > peak) peak = capital;
    const drawdown = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    points.push({
      step: index + 1,
      date: trade.exitDate || trade.entryDate || `Trade ${index + 1}`,
      capital: Math.round(capital),
      drawdown: Number(drawdown.toFixed(2)),
    });
  });

  return {
    points,
    finalCapital: capital,
    peakCapital: peak,
    maxDrawdown,
    netReturn: initialCapital > 0 ? ((capital - initialCapital) / initialCapital) * 100 : 0,
  };
}

/**
 * Value range used to scale the equity chart, padded by 5% so the line never touches the edge.
 *
 * @param {number[]} capitals - Capital values of the curve points.
 * @param {number} [initialCapital=INITIAL_CAPITAL]
 * @returns {{ min: number, max: number, range: number }}
 */
export function getEquityRange(capitals = [], initialCapital = INITIAL_CAPITAL) {
  const min = Math.min(...capitals, initialCapital * 0.95);
  const max = Math.max(...capitals, initialCapital * 1.05);
  return { min, max, range: max - min || 1 };
}

/**
 * Maps curve points to SVG coordinates.
 *
 * @param {Array<{ capital: number, drawdown: number }>} points - Curve points.
 * @param {object} options
 * @param {number} options.width - SVG viewBox width.
 * @param {number} options.height - SVG viewBox height.
 * @param {number} options.padding - Padding around the plot area.
 * @param {'capital'|'drawdown'} options.metric - Which value drives the vertical axis.
 * @param {number} [options.drawdownScale] - Upper bound of the drawdown axis (%).
 * @returns {Array<{ x: number, y: number }>}
 */
export function toSvgCoords(points = [], { width, height, padding, metric = 'capital', drawdownScale = 10 }) {
  const values = points.map((p) => Number(p[metric] || 0));
  const capitalRange = getEquityRange(values);
  const scale = Math.max(10, drawdownScale);

  return points.map((point, index) => {
    const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
    let y;
    if (metric === 'drawdown') {
      // 0% sits at the top of the plot area, deeper drawdowns push the line down.
      y = padding + (Number(point.drawdown || 0) / scale) * (height - padding * 2);
    } else {
      y = height - padding - ((Number(point.capital || 0) - capitalRange.min) / capitalRange.range) * (height - padding * 2);
    }
    return { x, y };
  });
}

/**
 * Builds an SVG `d` attribute from coordinates.
 * @param {Array<{ x: number, y: number }>} coords
 * @returns {string}
 */
export function toPathData(coords = []) {
  return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
}

/**
 * Closes a line path down to the baseline to make a filled area.
 * @param {string} pathData - Open path from `toPathData`.
 * @param {Array<{ x: number }>} coords
 * @param {number} baselineY
 * @returns {string}
 */
export function closeAreaPath(pathData, coords = [], baselineY = 0) {
  if (coords.length === 0) return pathData;
  const last = coords[coords.length - 1];
  const first = coords[0];
  return `${pathData} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

/**
 * Summary figures shown above the charts.
 *
 * @param {Array<{ pnlPercent: number, type?: string }>} trades
 * @returns {{ total: number, wins: number, losses: number, winRate: number, avgPnl: number }}
 */
export function summarizeTrades(trades = []) {
  const total = trades.length;
  const wins = trades.filter((t) => Number(t.pnlPercent || 0) > 0).length;
  const losses = total - wins;
  const avgPnl = total > 0 ? trades.reduce((sum, t) => sum + Number(t.pnlPercent || 0), 0) / total : 0;
  return { total, wins, losses, winRate: total > 0 ? (wins / total) * 100 : 0, avgPnl };
}