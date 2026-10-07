'use client';

import React from 'react';

/**
 * Grid whose column count grows with the viewport, so sections use the full content width
 * instead of stopping at a fixed number of columns on a wide monitor.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Grid items.
 * @param {string} [props.minWidth='240px'] - Narrowest a column may become before wrapping.
 * @param {string} [props.className] - Extra classes.
 */
export function AutoGrid({ children, minWidth = '240px', className = '' }) {
  return (
    <div
      className={`grid gap-2 sm:gap-3 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minWidth}, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}