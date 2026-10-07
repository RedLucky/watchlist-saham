'use client';

/**
 * Score bands used by the badge: ≥85 Kuat (up colour), ≥70 Bagus (ink), ≥60 Pantau (warn),
 * otherwise Abaikan (muted). Background classes are defined in globals.css.
 */
const BANDS = [
  { min: 85, bg: 'bg-score-strong', text: 'text-up', label: 'Kuat' },
  { min: 70, bg: 'bg-score-good', text: 'text-ink', label: 'Bagus' },
  { min: 60, bg: 'bg-score-watch', text: 'text-warn', label: 'Pantau' },
  { min: -Infinity, bg: 'bg-score-ignore', text: 'text-muted', label: 'Abaikan' },
];

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

/**
 * Square badge showing a composite score (0–100) with its verdict label underneath.
 *
 * @param {object} props
 * @param {number} props.score - Composite score.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Badge size; 'sm' hides the label.
 */
export default function ScoreBadge({ score, size = 'md' }) {
  const band = BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${band.bg} rounded-sm flex items-center justify-center font-mono font-semibold tabular-nums`}
        title={`Skor ${score} · ${band.label}`}
      >
        {score}
      </div>
      {size !== 'sm' && (
        <span className={`label-mono text-[10px] ${band.text}`}>{band.label}</span>
      )}
    </div>
  );
}
