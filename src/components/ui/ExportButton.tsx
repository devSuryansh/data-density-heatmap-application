"use client";

import { toCsvValue } from "@/src/lib/utils";
import type { HeatmapModel } from "@/src/types";

interface ExportButtonProps {
  model: HeatmapModel | null;
  chartSelector: string;
}

function downloadFile(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ model, chartSelector }: ExportButtonProps): JSX.Element {
  const exportSvg = (): void => {
    const svgElement = document.querySelector(chartSelector) as SVGSVGElement | null;
    if (!svgElement) {
      return;
    }
    downloadFile(svgElement.outerHTML, "image/svg+xml;charset=utf-8", "heatmap.svg");
  };

  const exportCsv = (): void => {
    if (!model) {
      return;
    }

    const header = ["Node Type", "Attribute", "Density %", "Non-Null", "Total"];
    const body = model.cells.map((cell) =>
      [
        toCsvValue(cell.nodeType),
        toCsvValue(cell.attribute),
        toCsvValue((cell.density * 100).toFixed(2)),
        toCsvValue(cell.nonNullCount),
        toCsvValue(cell.totalRecords),
      ].join(","),
    );

    downloadFile([header.join(","), ...body].join("\n"), "text/csv;charset=utf-8", "density-table.csv");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={exportSvg}
        className="border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)]"
      >
        Export SVG
      </button>
      <button
        type="button"
        onClick={exportCsv}
        className="border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)]"
      >
        Export CSV
      </button>
    </div>
  );
}
