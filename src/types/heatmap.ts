export interface DatasetConfig {
  title: string;
  description: string;
  endpoint: string;
  headers?: Record<string, string>;
  nodeInclude?: string[];
  nodeExclude?: string[];
  fieldExclude?: string[];
  maxRecordsPerNode?: number;
  queryBatchSize?: number;
}

export interface DiscoveredNodeType {
  name: string;
  queryField: string;
  fields: string[];
}

export interface DensityStat {
  nodeType: string;
  attribute: string;
  density: number;
  nonNullCount: number;
  totalCount: number;
}

export interface HeatmapCell {
  nodeType: string;
  attribute: string;
  density: number;
  nonNullCount: number;
  totalCount: number;
}

export interface HeatmapRow {
  node: string;
  attributes: Array<{
    name: string;
    density: number;
    nonNullCount: number;
    totalCount: number;
  }>;
}

export interface HeatmapResult {
  cells: HeatmapCell[];
  rows: HeatmapRow[];
  nodeTypes: string[];
  attributes: string[];
  overallDensity: number;
  computedAt: string;
}
