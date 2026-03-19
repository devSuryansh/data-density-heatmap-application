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

  logger.info("Heatmap model generated", {
    cells: cells.length,
    nodeTypes: uniqueNodeTypes.length,
    attributes: uniqueAttributes.length,
  });

  return {
    cells,
    nodeTypes: uniqueNodeTypes,
    attributes: uniqueAttributes,
    generatedAt: new Date().toISOString(),
    endpointUrl: config.endpointUrl,
  };
}
