"use client";

import { useMemo, useState } from "react";
import type { HeatmapCell, HeatmapModel } from "@/src/types";

type SortKey = "nodeType" | "attribute" | "density" | "nonNullCount" | "totalRecords";

function getStatus(density: number): { label: string; className: string } {
  if (density < 0.25) {
    return { label: "Critical", className: "border-[#f7b4b0] bg-[#fde9e8] text-[#a2261c]" };
  }
  if (density < 0.5) {
    return { label: "Low", className: "border-[#f2cf87] bg-[#fff6df] text-[#8f5a00]" };
  }
  if (density < 0.75) {
    return { label: "Medium", className: "border-[#93d6f3] bg-[#e9f7fe] text-[#005e84]" };
  }
  return { label: "High", className: "border-[#9ed7ad] bg-[#e8f8ed] text-[#17693d]" };
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
      <tr key={`${cell.nodeType}:${cell.attribute}`} className="border-t border-(--color-border)">
        <td className="px-2 py-1.5">{cell.nodeType}</td>
        <td className="px-2 py-1.5">{cell.attribute}</td>
        <td className="px-2 py-1.5">{(cell.density * 100).toFixed(2)}%</td>
        <td className="px-2 py-1.5">{cell.nonNullCount}</td>
        <td className="px-2 py-1.5">{cell.totalRecords}</td>
        <td className="px-2 py-1.5">
          <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-auto rounded-md border border-(--color-border) bg-(--color-surface) shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
      <table className="min-w-full text-left text-xs text-(--color-text)">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="cursor-pointer px-2 py-2 font-semibold" onClick={() => toggleSort("nodeType")}>Node Type</th>
            <th className="cursor-pointer px-2 py-2 font-semibold" onClick={() => toggleSort("attribute")}>Attribute</th>
            <th className="cursor-pointer px-2 py-2 font-semibold" onClick={() => toggleSort("density")}>Density %</th>
            <th className="cursor-pointer px-2 py-2 font-semibold" onClick={() => toggleSort("nonNullCount")}>Non-Null</th>
            <th className="cursor-pointer px-2 py-2 font-semibold" onClick={() => toggleSort("totalRecords")}>Total</th>
            <th className="px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
