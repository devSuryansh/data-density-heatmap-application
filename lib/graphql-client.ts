import { GraphQLClient } from "graphql-request";
import type {
  HeatmapConfig,
  NodeTypeConfig,
  DensityCell,
  HeatmapData,
} from "./types";

/**
 * Create a GraphQL client from the heatmap configuration
 */
export function createGraphQLClient(config: HeatmapConfig): GraphQLClient {
  const client = new GraphQLClient(config.endpoint, {
    headers: config.headers || {},
  });
  return client;
}

/**
 * Resolve a dot-notation path on an object.
 * e.g., getNestedValue({ a: { b: [1,2] } }, "a.b") => [1,2]
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Check if a value is considered "filled" (non-null, non-undefined, non-empty-string)
 */
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

/**
 * Fetch data for a single node type and compute density cells
 */
export async function fetchNodeTypeDensity(
  client: GraphQLClient,
  nodeType: NodeTypeConfig
): Promise<DensityCell[]> {
  try {
    const response = await client.request<Record<string, unknown>>(nodeType.query);
    const records = getNestedValue(response, nodeType.dataPath);

    if (!Array.isArray(records)) {
      return nodeType.attributes.map((attr) => ({
        nodeType: nodeType.displayName || nodeType.typeName,
        attribute: attr.displayName || attr.fieldName,
        density: 0,
        filledCount: 0,
        totalCount: 0,
        isError: true,
        errorMessage: `No array data found at path '${nodeType.dataPath}'`,
      }));
    }

    const totalCount = records.length;

    return nodeType.attributes.map((attr) => {
      let filledCount = 0;

      for (const record of records) {
        const rec = record as Record<string, unknown>;
        let value: unknown;

        if (attr.isNested && attr.nestedPath) {
          const nested = rec[attr.fieldName];
          if (nested && typeof nested === "object") {
            value = getNestedValue(nested as Record<string, unknown>, attr.nestedPath);
          }
        } else {
          value = rec[attr.fieldName];
        }

        if (isFilled(value)) {
          filledCount++;
        }
      }

      const density = totalCount > 0 ? filledCount / totalCount : 0;

      return {
        nodeType: nodeType.displayName || nodeType.typeName,
        attribute: attr.displayName || attr.fieldName,
        density,
        filledCount,
        totalCount,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return nodeType.attributes.map((attr) => ({
      nodeType: nodeType.displayName || nodeType.typeName,
      attribute: attr.displayName || attr.fieldName,
      density: 0,
      filledCount: 0,
      totalCount: 0,
      isError: true,
      errorMessage: message,
    }));
  }
}

/**
 * Fetch all node types and compile the full heatmap data
 */
export async function fetchHeatmapData(
  config: HeatmapConfig,
  onProgress?: (progress: number, currentType: string) => void
): Promise<HeatmapData> {
  const client = createGraphQLClient(config);
  const allCells: DensityCell[] = [];
  const nodeTypeNames: string[] = [];
  const attributeNames = new Set<string>();

  for (let i = 0; i < config.nodeTypes.length; i++) {
    const nodeType = config.nodeTypes[i];
    const typeName = nodeType.displayName || nodeType.typeName;

    onProgress?.(((i) / config.nodeTypes.length) * 100, typeName);

    const cells = await fetchNodeTypeDensity(client, nodeType);
    allCells.push(...cells);
    nodeTypeNames.push(typeName);

    for (const cell of cells) {
      attributeNames.add(cell.attribute);
    }
  }

  onProgress?.(100, "Complete");

  // Compute aggregate densities
  const nodeTypeDensities: Record<string, number> = {};
  for (const typeName of nodeTypeNames) {
    const typeCells = allCells.filter((c) => c.nodeType === typeName && !c.isError);
    if (typeCells.length > 0) {
      nodeTypeDensities[typeName] =
        typeCells.reduce((sum, c) => sum + c.density, 0) / typeCells.length;
    } else {
      nodeTypeDensities[typeName] = 0;
    }
  }

  const attributeDensities: Record<string, number> = {};
  for (const attrName of attributeNames) {
    const attrCells = allCells.filter((c) => c.attribute === attrName && !c.isError);
    if (attrCells.length > 0) {
      attributeDensities[attrName] =
        attrCells.reduce((sum, c) => sum + c.density, 0) / attrCells.length;
    } else {
      attributeDensities[attrName] = 0;
    }
  }

  const validCells = allCells.filter((c) => !c.isError);
  const overallDensity =
    validCells.length > 0
      ? validCells.reduce((sum, c) => sum + c.density, 0) / validCells.length
      : 0;

  return {
    cells: allCells,
    nodeTypes: nodeTypeNames,
    attributes: Array.from(attributeNames),
    overallDensity,
    nodeTypeDensities,
    attributeDensities,
    lastUpdated: new Date(),
  };
}
