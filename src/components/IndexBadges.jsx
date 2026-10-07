'use client';

import { useEffect, useState } from 'react';

/**
 * Module-level cache so every badge on a page shares one request, and so navigating
 * back to a page does not refetch immediately.
 * @type {{ byTicker: Record<string, string[]>, indices: Array<object> } | null}
 */
let cache = null;
let pending = null;

/**
 * Fetches the ticker → index-codes map once per session (cached module-wide).
 * @returns {Promise<{ byTicker: Record<string, string[]>, indices: Array<object> }>}
 */
async function loadIndices() {
  if (cache) return cache;
  if (!pending) {
    pending = fetch('/api/indices')
      .then((res) => (res.ok ? res.json() : { byTicker: {}, indices: [] }))
      .then((data) => {
        cache = data;
        return data;
      })
      .catch(() => ({ byTicker: {}, indices: [] }))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * Small index labels for one stock: at most two chips plus a "+N" counter, so a row stays
 * readable even when a stock belongs to four indices. The full list is in the tooltip.
 *
 * @param {object} props
 * @param {string} props.ticker - Stock ticker.
 * @param {number} [props.max=2] - How many chips to show before collapsing.
 * @param {boolean} [props.showEmpty=false] - Render nothing when the stock is in no index.
 * @returns {JSX.Element | null}
 */
export default function IndexBadges({ ticker, max = 2, showEmpty = false }) {
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadIndices().then((data) => {
      if (!cancelled) setCodes(data.byTicker?.[ticker] || []);
    });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (codes.length === 0) return showEmpty ? null : null;

  const shown = codes.slice(0, max);
  const extra = codes.length - shown.length;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {shown.map((code) => (
        <span key={code} className="badge badge-outline" title={`Anggota indeks ${code}`}>
          {code}
        </span>
      ))}
      {extra > 0 && (
        <span className="badge" title={`Juga anggota: ${codes.slice(max).join(', ')}`}>
          +{extra}
        </span>
      )}
    </span>
  );
}

/**
 * Renders the index labels for several tickers at once (used by list views).
 * @param {{ tickers: string[], max?: number }} props
 * @returns {JSX.Element}
 */
export function IndexBadgeList({ tickers = [], max = 2 }) {
  const [map, setMap] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadIndices().then((data) => {
      if (cancelled) return;
      setMap(data.byTicker || {});
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <span className="skeleton inline-block h-4 w-16 rounded-sm" aria-hidden="true" />;

  return (
    <>
      {tickers.map((ticker) => {
        const codes = map[ticker] || [];
        if (codes.length === 0) return <span key={ticker} className="text-xs text-muted">-</span>;
        const shown = codes.slice(0, max);
        const extra = codes.length - shown.length;
        return (
          <span key={ticker} className="inline-flex items-center gap-1">
            {shown.map((code) => (
              <span key={code} className="badge badge-outline" title={`Anggota indeks ${code}`}>{code}</span>
            ))}
            {extra > 0 && (
              <span className="badge" title={`Juga anggota: ${codes.slice(max).join(', ')}`}>+{extra}</span>
            )}
          </span>
        );
      })}
    </>
  );
}