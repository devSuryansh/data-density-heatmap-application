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

/**
 * Extracts a unique record identifier if available (e.g. `id` or `_id`).
 * Returns null if the record does not expose a recognized unique key.
 */
function getRecordIdentifier(record: Record<string, unknown>): string | number | null {
  if (typeof record.id === "string" || typeof record.id === "number") {
    return record.id;
  }
  if (typeof record._id === "string" || typeof record._id === "number") {
    return record._id;
  }
  return null;
}

/**
 * Safely resolves the best set of records between Relay and offset fallback.
 * - If stable identifiers are available:
 *   - If fallback covers all Relay records, fallback results are returned.
 *   - If fallback does NOT cover all Relay records, Relay records are preserved and
 *     unseen fallback records are merged up to maxRecords.
 * - If stable identifiers are unavailable, equal counts are not assumed to mean equivalent
 *   data; Relay results are preserved conservatively unless fallback retrieved strictly more records.
 */
function selectBestRecords(
  relayRecords: Record<string, unknown>[],
  fallbackRecords: Record<string, unknown>[],
  maxRecords: number,
): Record<string, unknown>[] {
  if (relayRecords.length === 0) {
    return fallbackRecords.slice(0, maxRecords);
  }
  if (fallbackRecords.length === 0) {
    return relayRecords.slice(0, maxRecords);
  }

  const relayIds = relayRecords.map(getRecordIdentifier);
  const fallbackIds = fallbackRecords.map(getRecordIdentifier);

  const hasAllRelayIds = relayIds.every((id): id is string | number => id !== null);
  const hasAllFallbackIds = fallbackIds.every((id): id is string | number => id !== null);

  if (hasAllRelayIds && hasAllFallbackIds) {
    const fallbackIdSet = new Set(fallbackIds);
    const coversAllRelay = relayIds.every((id) => fallbackIdSet.has(id));

    if (coversAllRelay) {
      return fallbackRecords.slice(0, maxRecords);
    }

    // Fallback does not cover all Relay records: preserve Relay records and merge unseen fallback records
    const combined: Record<string, unknown>[] = [...relayRecords];
    const seen = new Set<string | number>(relayIds);

    for (const record of fallbackRecords) {
      if (combined.length >= maxRecords) {
        break;
      }
      const id = getRecordIdentifier(record);
      if (id !== null && !seen.has(id)) {
        seen.add(id);
        combined.push(record);
      }
    }

    return combined.slice(0, maxRecords);
  }

  // Without complete stable identifiers, we cannot verify whether fallback covers Relay.
  // Conservative strategy: never let equal or lesser fallback count discard known Relay data.
  if (fallbackRecords.length > relayRecords.length) {
    return fallbackRecords.slice(0, maxRecords);
  }

  return relayRecords.slice(0, maxRecords);
}

/**
 * Fetches records for a given node type using Relay cursor pagination first,
 * falling back to offset-based pagination if Relay queries are unsupported or fail.
 *
 * Consistency notes for offset fallback:
 * - Relay cursor pagination is preferred because it can offer keyset stability when supported by the backend.
 * - Offset pagination is stateless across requests. If the underlying collection changes during fetching:
 *   - Concurrent insertions may shift records into subsequent pages; unique identifiers (when present)
 *     are defensively deduplicated to avoid duplicate records across overlapping page boundaries.
 *   - Concurrent deletions shift records backward, which can cause records to be skipped. Without backend
 *     snapshot isolation (e.g. MVCC or search point-in-time tokens), skipped records cannot be recovered client-side.
 *   - Records without unique identifiers are never deduplicated by attribute hashes, preserving legitimate identical rows.
 */
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

  let maxReported = 0;
  const reportProgress = (count: number) => {
    const monotonicCount = Math.max(maxReported, count);
    if (monotonicCount > maxReported) {
      maxReported = monotonicCount;
      onProgress?.(node.nodeType, maxReported, maxRecordsPerNode);
    }
  };

  let cursor: string | null = null;
  while (relaySupported && output.length < maxRecordsPerNode) {
    let relayResult: ApolloQueryResult<Record<string, RelayPageResponse>>;
    try {
      relayResult = await client.query<Record<string, RelayPageResponse>>({
        query: gql(buildRelayQuery(node)),
        variables: {
          first: Math.min(batchSize, maxRecordsPerNode - output.length),
          after: cursor,
        },
      });
    } catch {
      relaySupported = false;
      usedRelay = false;
      break;
    }

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
    reportProgress(output.length);

    const hasNext = Boolean(response.pageInfo?.hasNextPage);
    const endCursor: string | null = response.pageInfo?.endCursor ?? null;
    if (!hasNext || !endCursor || pageRecords.length === 0) {
      break;
    }

    cursor = endCursor;
  }

  if (usedRelay) {
    const finalRecords = output.slice(0, maxRecordsPerNode);
    reportProgress(finalRecords.length);
    return finalRecords;
  }

  // Offset-based fallback pagination: isolate into a separate buffer to prevent contaminating Relay results
  const fallbackOutput: Record<string, unknown>[] = [];
  const seenIds = new Set<string | number>();

  for (let offset = 0; fallbackOutput.length < maxRecordsPerNode; offset += batchSize) {
    let offsetResult: ApolloQueryResult<Record<string, unknown>>;
    try {
      offsetResult = await client.query<Record<string, unknown>>({
        query: gql(buildOffsetQuery(node)),
        variables: {
          limit: Math.min(batchSize, maxRecordsPerNode - fallbackOutput.length),
          offset,
        },
      });
    } catch (error) {
      // If no records were ever retrieved from either Relay or offset, propagate error
      if (output.length === 0 && fallbackOutput.length === 0) {
        throw error;
      }
      // If we already have Relay records or earlier fallback records, preserve them
      break;
    }

    if (offsetResult.errors?.length) {
      break;
    }

    const pageRecords = asRecordArray(offsetResult.data[node.queryField]);
    if (pageRecords.length === 0) {
      break;
    }

    for (const record of pageRecords) {
      if (fallbackOutput.length >= maxRecordsPerNode) {
        break;
      }

      const id = getRecordIdentifier(record);
      if (id !== null) {
        if (seenIds.has(id)) {
          // Defensive duplicate detection: skip record shifted into view by concurrent insertions.
          continue;
        }
        seenIds.add(id);
      }

      fallbackOutput.push(record);
    }

    reportProgress(fallbackOutput.length);

    if (pageRecords.length < batchSize) {
      break;
    }
  }

  const finalRecords = selectBestRecords(output, fallbackOutput, maxRecordsPerNode);
  reportProgress(finalRecords.length);
  return finalRecords;
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
