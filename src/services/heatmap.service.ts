import { ConfigSchema, type ParsedConfig } from "@/src/config/schema";
import { createApolloClient } from "@/src/graphql/client";
import { fetchAllNodeRecords } from "@/src/graphql/fetcher";
import { getQueryableNodeTypes } from "@/src/graphql/introspection";
import { logger } from "@/src/lib/logger";
import { buildDensityCell } from "@/src/services/density";
import type { FetchProgress, HeatmapModel } from "@/src/types";

interface RunHeatmapPipelineOptions {
  config: unknown;
  onProgress?: (progress: FetchProgress) => void;
}

export async function runHeatmapPipeline(
  options: RunHeatmapPipelineOptions,
): Promise<HeatmapModel> {
  const { config, onProgress } = options;
  const parsed = ConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw parsed.error;
  }

  const validatedConfig = parsed.data;
  const client = createApolloClient(validatedConfig.endpointUrl);

  const nodeTypes = await getQueryableNodeTypes(client, validatedConfig);
  const recordsByNode = await fetchAllNodeRecords(client, nodeTypes, validatedConfig, onProgress);

  return buildHeatmapModel(nodeTypes, recordsByNode, validatedConfig);
}

export function buildHeatmapModel(
  nodeTypes: Array<{ nodeType: string; attributes: string[] }>,
  recordsByNode: Record<string, Record<string, unknown>[]>,
  config: ParsedConfig,
): HeatmapModel {
  const cells = nodeTypes.flatMap((node) => {
    const rows = recordsByNode[node.nodeType] ?? [];
    return node.attributes.map((attribute) => buildDensityCell(node.nodeType, attribute, rows));
  });

  const uniqueNodeTypes = Array.from(new Set(cells.map((cell) => cell.nodeType))).sort((a, b) =>
    a.localeCompare(b),
  );
  const uniqueAttributes = Array.from(new Set(cells.map((cell) => cell.attribute))).sort((a, b) =>
    a.localeCompare(b),
  );

  const densityValues = cells.map((cell) => cell.density);
  const minDensity = densityValues.length > 0 ? Math.min(...densityValues) : 0;
  const maxDensity = densityValues.length > 0 ? Math.max(...densityValues) : 0;
  const avgDensity =
    densityValues.length > 0
      ? densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length
      : 0;

  const recordsPerNode = Object.fromEntries(
    Object.entries(recordsByNode).map(([nodeType, records]) => [nodeType, records.length]),
  );

  const densityByNode = Object.fromEntries(
    uniqueNodeTypes.map((nodeType) => [
      nodeType,
      cells
        .filter((cell) => cell.nodeType === nodeType)
        .map((cell) => ({
          attribute: cell.attribute,
          density: Number(cell.density.toFixed(3)),
          nonNullCount: cell.nonNullCount,
          totalRecords: cell.totalRecords,
        })),
    ]),
  );

  logger.info("Heatmap model generated", {
    cells: cells.length,
    nodeTypes: uniqueNodeTypes.length,
    attributes: uniqueAttributes.length,
    minDensity: Number(minDensity.toFixed(3)),
    maxDensity: Number(maxDensity.toFixed(3)),
    avgDensity: Number(avgDensity.toFixed(3)),
    recordsPerNode,
    densityByNode,
  });

  return {
    cells,
    nodeTypes: uniqueNodeTypes,
    attributes: uniqueAttributes,
    generatedAt: new Date().toISOString(),
    endpointUrl: config.endpointUrl,
  };
}
