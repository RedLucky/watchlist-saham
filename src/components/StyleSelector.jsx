'use client';

/** Trading horizons; the symbol hints at speed (fast → slow). */
const STYLES = [
  { name: 'scalping', label: 'Scalping', icon: '»' },
  { name: 'daily', label: 'Daily', icon: '›' },
  { name: 'swing', label: 'Swing', icon: '∿' },
];

/**
 * Segmented control for the trading horizon (Scalping / Daily / Swing).
 *
 * @param {object} props
 * @param {string} props.currentStyle - Selected style name.
 * @param {(name: string) => void} props.onStyleChange - Called with the new style.
 */
export default function StyleSelector({ currentStyle, onStyleChange }) {
  return (
    <div className="tabs" role="group" aria-label="Horison waktu trading">
      {STYLES.map((style) => (
        <button
          key={style.name}
          type="button"
          onClick={() => onStyleChange(style.name)}
          aria-pressed={currentStyle === style.name}
          className="tab"
        >
          <span className="font-mono" aria-hidden="true">{style.icon}</span>
          <span>{style.label}</span>
        </button>
      ))}
    </div>
  );
}
