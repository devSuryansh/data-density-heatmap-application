import { createApolloClient } from "@/src/graphql/client";
import { discoverNodeTypes } from "@/src/graphql/discovery";
import { fetchNodeRecords } from "@/src/graphql/records";
import { calculateNodeDensity } from "@/src/services/density";
import { buildHeatmapResult } from "@/src/services/heatmap-model";
import type { DatasetConfig, HeatmapResult } from "@/src/types/heatmap";

export async function buildHeatmap(config: DatasetConfig): Promise<HeatmapResult> {
  const client = createApolloClient(config.endpoint, config.headers);

  const nodeTypes = await discoverNodeTypes(client, config);
  if (nodeTypes.length === 0) {
    throw new Error("No queryable node types discovered for this endpoint.");
  }

  const recordsByNode = await fetchNodeRecords(
    client,
    nodeTypes,
    config.queryBatchSize ?? 3,
    config.maxRecordsPerNode ?? 1000,
  );

  const stats = nodeTypes.flatMap((nodeType) => {
    const nodeRecords = recordsByNode[nodeType.name] ?? [];
    return calculateNodeDensity(nodeType.name, nodeType.fields, nodeRecords);
  });

  return buildHeatmapResult(stats);
}
