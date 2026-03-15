import type { HeatmapResult } from "@/src/types/heatmap";

interface DensityTableProps {
  data: HeatmapResult;
}

export function DensityTable({ data }: DensityTableProps) {
  const sorted = [...data.cells].sort((left, right) => right.density - left.density);

  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left">
            <th className="px-3 py-2">Node Type</th>
            <th className="px-3 py-2">Attribute</th>
            <th className="px-3 py-2">Density</th>
            <th className="px-3 py-2">Non-null</th>
            <th className="px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cell) => (
            <tr key={`${cell.nodeType}-${cell.attribute}`} className="border-t">
              <td className="px-3 py-2">{cell.nodeType}</td>
              <td className="px-3 py-2">{cell.attribute}</td>
              <td className="px-3 py-2">{(cell.density * 100).toFixed(1)}%</td>
              <td className="px-3 py-2">{cell.nonNullCount}</td>
              <td className="px-3 py-2">{cell.totalCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
