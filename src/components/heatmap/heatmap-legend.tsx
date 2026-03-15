export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500">Low density</span>
      <div className="h-4 w-52 rounded-sm border bg-linear-to-r from-stone-100 to-green-900" />
      <span className="text-zinc-500">High density</span>
    </div>
  );
}
