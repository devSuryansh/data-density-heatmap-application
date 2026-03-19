import { gql, type ApolloClient, type ApolloQueryResult } from "@apollo/client";
import type { ParsedConfig } from "@/src/config/schema";
import type { FetchProgress, NodeTypeFieldMap } from "@/src/types";

interface RelayPageResponse {
  edges?: Array<{ node: Record<string, unknown> | null }>;
  pageInfo?: {
    hasNextPage?: boolean;
    endCursor?: string | null;
  };
}

type ProgressCallback = (nodeType: string, fetched: number, total: number) => void;

function buildRelayQuery(node: NodeTypeFieldMap): string {
  return `
    query Fetch${node.nodeType}Relay($first: Int!, $after: String) {
      ${node.queryField}(first: $first, after: $after) {
        edges { node { ${node.attributes.join(" ")} } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
}

function buildOffsetQuery(node: NodeTypeFieldMap): string {
  return `
    query Fetch${node.nodeType}Offset($limit: Int!, $offset: Int!) {
      ${node.queryField}(limit: $limit, offset: $offset) {
        ${node.attributes.join(" ")}
      }
    }
  `;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

export async function fetchNodeRecords(
  client: ApolloClient<unknown>,
  node: NodeTypeFieldMap,
  config: ParsedConfig,
  onProgress?: ProgressCallback,
): Promise<Record<string, unknown>[]> {
  const { maxRecordsPerNode, batchSize } = config;
  const output: Record<string, unknown>[] = [];
  let usedRelay = true;
  let relaySupported = true;

  let cursor: string | null = null;
  while (relaySupported && output.length < maxRecordsPerNode) {
    const relayResult: ApolloQueryResult<Record<string, RelayPageResponse>> =
      await client.query<Record<string, RelayPageResponse>>({
      query: gql(buildRelayQuery(node)),
      variables: {
        first: Math.min(batchSize, maxRecordsPerNode - output.length),
        after: cursor,
      },
    });

    if (relayResult.errors?.length) {
      relaySupported = false;
      usedRelay = false;
      break;
    }

    const response: RelayPageResponse | undefined = relayResult.data[node.queryField];
    if (!response || typeof response !== "object" || !Array.isArray(response.edges)) {
      relaySupported = false;
      usedRelay = false;
      break;
    }

    const pageRecords = (response.edges ?? [])
      .map((edge: { node: Record<string, unknown> | null }) => edge.node)
      .filter((nodeRecord: Record<string, unknown> | null): nodeRecord is Record<string, unknown> =>
        Boolean(nodeRecord && typeof nodeRecord === "object"),
      );

    output.push(...pageRecords);
    onProgress?.(node.nodeType, output.length, maxRecordsPerNode);

    const hasNext = Boolean(response.pageInfo?.hasNextPage);
    const endCursor: string | null = response.pageInfo?.endCursor ?? null;
    if (!hasNext || !endCursor || pageRecords.length === 0) {
      break;
    }

    cursor = endCursor;
  }

  if (usedRelay) {
    return output.slice(0, maxRecordsPerNode);
  }

  for (let offset = 0; output.length < maxRecordsPerNode; offset += batchSize) {
    const offsetResult: ApolloQueryResult<Record<string, unknown>> =
      await client.query<Record<string, unknown>>({
      query: gql(buildOffsetQuery(node)),
      variables: {
        limit: Math.min(batchSize, maxRecordsPerNode - output.length),
        offset,
      },
    });

    if (offsetResult.errors?.length) {
      break;
    }

    const pageRecords = asRecordArray(offsetResult.data[node.queryField]);
    if (pageRecords.length === 0) {
      break;
    }

    output.push(...pageRecords);
    onProgress?.(node.nodeType, output.length, maxRecordsPerNode);

    if (pageRecords.length < batchSize) {
      break;
    }
  }

  return output.slice(0, maxRecordsPerNode);
}

export async function fetchAllNodeRecords(
  client: ApolloClient<unknown>,
  nodeTypes: NodeTypeFieldMap[],
  config: ParsedConfig,
  onProgress?: (progress: FetchProgress) => void,
): Promise<Record<string, Record<string, unknown>[]>> {
  const output: Record<string, Record<string, unknown>[]> = {};

  for (const node of nodeTypes) {
    const rows = await fetchNodeRecords(client, node, config, (nodeType, fetched, total) => {
      onProgress?.({ nodeType, fetched, total });
    });
    output[node.nodeType] = rows;
  }

  return output;
}
