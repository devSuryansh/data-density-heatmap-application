"use client";

import type { HeatmapCell } from "@/src/types";

interface HeatmapTooltipProps {
  cell: HeatmapCell | null;
  x: number;
  y: number;
  visible: boolean;
}

export function HeatmapTooltip({ cell, x, y, visible }: HeatmapTooltipProps): JSX.Element {
  if (!cell || !visible) {
    return <div className="pointer-events-none absolute hidden" />;
  }

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-xs rounded-sm border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs text-(--color-text) shadow-[0_8px_24px_rgba(17,24,39,0.08)]"
      style={{ left: x, top: y }}
    >
      <p className="font-semibold tracking-tight">{cell.nodeType}</p>
      <p>{cell.attribute}</p>
      <p>Density: {(cell.density * 100).toFixed(2)}%</p>
      <p>Non-null: {cell.nonNullCount}</p>
      <p>Total: {cell.totalRecords}</p>
    </div>
  );
}
