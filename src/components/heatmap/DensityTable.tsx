"use client";

import { useMemo, useState } from "react";
import type { HeatmapCell, HeatmapModel } from "@/src/types";

type SortKey = "nodeType" | "attribute" | "density" | "nonNullCount" | "totalRecords";

function getStatus(density: number): { label: string; className: string } {
  if (density < 0.25) {
    return { label: "Critical", className: "bg-rose-600/20 text-rose-300" };
  }
  if (density < 0.5) {
    return { label: "Low", className: "bg-amber-600/20 text-amber-300" };
  }
  if (density < 0.75) {
    return { label: "Medium", className: "bg-sky-600/20 text-sky-300" };
  }
  return { label: "High", className: "bg-emerald-600/20 text-emerald-300" };
}

interface DensityTableProps {
  model: HeatmapModel;
}

export function DensityTable({ model }: DensityTableProps): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>("density");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const next = [...model.cells];
    next.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDesc ? bValue - aValue : aValue - bValue;
      }
      return sortDesc
        ? String(bValue).localeCompare(String(aValue))
        : String(aValue).localeCompare(String(bValue));
    });
    return next;
  }, [model.cells, sortDesc, sortKey]);

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDesc((value) => !value);
      return;
    }
    setSortKey(key);
    setSortDesc(true);
  };

  const renderRow = (cell: HeatmapCell): JSX.Element => {
    const status = getStatus(cell.density);
    return (
      <tr key={`${cell.nodeType}:${cell.attribute}`} className="border-t border-white/5">
        <td className="px-2 py-1.5">{cell.nodeType}</td>
        <td className="px-2 py-1.5">{cell.attribute}</td>
        <td className="px-2 py-1.5">{(cell.density * 100).toFixed(2)}%</td>
        <td className="px-2 py-1.5">{cell.nonNullCount}</td>
        <td className="px-2 py-1.5">{cell.totalRecords}</td>
        <td className="px-2 py-1.5">
          <span className={`rounded px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-auto border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="min-w-full text-left text-xs text-[var(--color-text)]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <th className="cursor-pointer px-2 py-2" onClick={() => toggleSort("nodeType")}>Node Type</th>
            <th className="cursor-pointer px-2 py-2" onClick={() => toggleSort("attribute")}>Attribute</th>
            <th className="cursor-pointer px-2 py-2" onClick={() => toggleSort("density")}>Density %</th>
            <th className="cursor-pointer px-2 py-2" onClick={() => toggleSort("nonNullCount")}>Non-Null</th>
            <th className="cursor-pointer px-2 py-2" onClick={() => toggleSort("totalRecords")}>Total</th>
            <th className="px-2 py-2">Status</th>
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
