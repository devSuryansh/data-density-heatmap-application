import type { DensityStat, HeatmapResult, HeatmapRow } from "@/src/types/heatmap";

export function buildHeatmapResult(stats: DensityStat[]): HeatmapResult {
  const nodeTypeSet = new Set<string>();
  const attributeSet = new Set<string>();

  for (const stat of stats) {
    nodeTypeSet.add(stat.nodeType);
    attributeSet.add(stat.attribute);
  }

  const nodeTypes = Array.from(nodeTypeSet).sort((left, right) => left.localeCompare(right));
  const attributes = Array.from(attributeSet).sort((left, right) => left.localeCompare(right));

  const rows: HeatmapRow[] = nodeTypes.map((nodeType) => {
    const rowStats = stats.filter((stat) => stat.nodeType === nodeType);

    return {
      node: nodeType,
      attributes: rowStats
        .sort((left, right) => left.attribute.localeCompare(right.attribute))
        .map((stat) => ({
          name: stat.attribute,
          density: stat.density,
          nonNullCount: stat.nonNullCount,
          totalCount: stat.totalCount,
        })),
    };
  });

  const overallDensity =
    stats.length > 0
      ? stats.reduce((sum, stat) => sum + stat.density, 0) / stats.length
      : 0;

  return {
    cells: stats.map((stat) => ({
      nodeType: stat.nodeType,
      attribute: stat.attribute,
      density: stat.density,
      nonNullCount: stat.nonNullCount,
      totalCount: stat.totalCount,
    })),
    rows,
    nodeTypes,
    attributes,
    overallDensity,
    computedAt: new Date().toISOString(),
  };
}
