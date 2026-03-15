import { gql, type ApolloClient } from "@apollo/client";
import type { DiscoveredNodeType } from "@/src/types/heatmap";

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildBatchQuery(nodes: DiscoveredNodeType[]): { query: string; aliasToNode: Record<string, string> } {
  const selections: string[] = [];
  const aliasToNode: Record<string, string> = {};

  nodes.forEach((node, index) => {
    const alias = `n${index}`;
    aliasToNode[alias] = node.name;
    selections.push(`${alias}: ${node.queryField} { ${node.fields.join(" ")} }`);
  });

  return {
    query: `query DensityBatchQuery { ${selections.join(" ")} }`,
    aliasToNode,
  };
}

export async function fetchNodeRecords(
  client: ApolloClient<unknown>,
  nodes: DiscoveredNodeType[],
  queryBatchSize: number,
  maxRecordsPerNode: number,
): Promise<Record<string, Record<string, unknown>[]>> {
  const results: Record<string, Record<string, unknown>[]> = {};

  for (const nodeBatch of chunk(nodes, queryBatchSize)) {
    const { query, aliasToNode } = buildBatchQuery(nodeBatch);
    const response = await client.query<Record<string, unknown>>({
      query: gql(query),
    });

    for (const [alias, nodeName] of Object.entries(aliasToNode)) {
      const value = response.data[alias];
      if (!Array.isArray(value)) {
        results[nodeName] = [];
        continue;
      }

      results[nodeName] = (value as Record<string, unknown>[]).slice(0, maxRecordsPerNode);
    }
  }

  return results;
}
