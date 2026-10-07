'use client';

/**
 * Colour of the bar and score text for a 0–100 score:
 * ≥85 up, ≥70 ink, ≥60 warn, otherwise muted.
 * @param {number} score
 * @returns {{ bar: string, text: string }}
 */
function getTone(score) {
  if (score >= 85) return { bar: 'bg-up', text: 'text-up' };
  if (score >= 70) return { bar: 'bg-ink', text: 'text-ink' };
  if (score >= 60) return { bar: 'bg-warn', text: 'text-warn' };
  return { bar: 'bg-muted', text: 'text-muted' };
}

/**
 * Horizontal bar for one sub-score (e.g. Fundamental 72 with weight 30%).
 *
 * @param {object} props
 * @param {string} props.label - Sub-score name.
 * @param {number} props.score - Value 0–100.
 * @param {number} [props.weight] - Weight in percent, shown as a small badge.
 * @param {string} [props.color] - Optional Tailwind background class overriding the bar colour.
 * @param {boolean} [props.animate=true] - Animate width changes.
 */
export default function ScoreBar({ label, score, weight, color, animate = true }) {
  const tone = getTone(score);
  const width = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted truncate">{label}</span>
          {weight && <span className="badge">{weight}%</span>}
        </div>
        <span className={`font-mono text-sm font-semibold tabular-nums ${tone.text}`}>{score}</span>
      </div>
      <div
        className="h-1.5 w-full rounded-sm bg-sunken overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${color || tone.bar} ${animate ? 'transition-[width] duration-500' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
