export interface HeatmapCell {
  nodeType: string;
  attribute: string;
  density: number;
  nonNullCount: number;
  totalRecords: number;
}

export interface HeatmapModel {
  cells: HeatmapCell[];
  nodeTypes: string[];
  attributes: string[];
  generatedAt: string;
  endpointUrl: string;
}

export interface RuntimeConfig {
  endpointUrl: string;
  nodeTypeInclude: string[];
  nodeTypeExclude: string[];
  attributeExcludeList: string[];
  maxRecordsPerNode: number;
  batchSize: number;
  orgName?: string;
  orgLogoUrl?: string;
}

export type StatusState =
  | "idle"
  | "connecting"
  | "introspecting"
  | "fetching"
  | "computing"
  | "ready"
  | "error";

export interface StatusInfo {
  state: StatusState;
  label: string;
}

export interface NodeTypeFieldMap {
  nodeType: string;
  queryField: string;
  attributes: string[];
}

export interface FetchProgress {
  nodeType: string;
  fetched: number;
  total: number;
}
