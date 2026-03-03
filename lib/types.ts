/**
 * Core type definitions for the Data Density Heatmap Application
 */

/** Configuration for a single GraphQL node type to visualize */
export interface NodeTypeConfig {
  /** The GraphQL type name (e.g., "Patient", "Specimen") */
  typeName: string;
  /** Human-readable display label */
  displayName: string;
  /** List of attributes/fields to check for data density */
  attributes: AttributeConfig[];
  /** GraphQL query to fetch records of this type */
  query: string;
  /** Path to extract records from the GraphQL response (dot notation) */
  dataPath: string;
  /** Optional: the total count path in the response */
  countPath?: string;
}

/** Configuration for a single attribute within a node type */
export interface AttributeConfig {
  /** The field name in the GraphQL response */
  fieldName: string;
  /** Human-readable display label */
  displayName: string;
  /** Whether this is a nested object (will check for non-null) */
  isNested?: boolean;
  /** Path within a nested object to check */
  nestedPath?: string;
}

/** Complete application configuration */
export interface HeatmapConfig {
  /** Display title for the heatmap */
  title: string;
  /** Description of the dataset being visualized */
  description: string;
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Optional: Authorization headers */
  headers?: Record<string, string>;
  /** Node type configurations */
  nodeTypes: NodeTypeConfig[];
  /** Color scheme for the heatmap */
  colorScheme?: ColorScheme;
}

/** Color scheme configuration */
export interface ColorScheme {
  /** Color for 0% density (empty) */
  emptyColor: string;
  /** Color for 100% density (full) */
  fullColor: string;
  /** Color for null/error states */
  nullColor: string;
  /** Number of color steps in the gradient */
  steps?: number;
}

/** Processed density data for a single cell in the heatmap */
export interface DensityCell {
  /** The node type this cell belongs to */
  nodeType: string;
  /** The attribute this cell represents */
  attribute: string;
  /** Density value from 0 to 1 (percentage of non-null values) */
  density: number;
  /** Number of non-null records */
  filledCount: number;
  /** Total number of records */
  totalCount: number;
  /** Whether this cell is in an error state */
  isError?: boolean;
  /** Error message if applicable */
  errorMessage?: string;
}

/** Aggregated density data for the entire heatmap */
export interface HeatmapData {
  /** All density cells organized by nodeType and attribute */
  cells: DensityCell[];
  /** List of unique node type names (row labels) */
  nodeTypes: string[];
  /** List of unique attribute names (column labels) */
  attributes: string[];
  /** Overall dataset completeness percentage */
  overallDensity: number;
  /** Per-node-type average densities */
  nodeTypeDensities: Record<string, number>;
  /** Per-attribute average densities */
  attributeDensities: Record<string, number>;
  /** Timestamp when the data was last fetched */
  lastUpdated: Date;
}

/** State for the data fetching process */
export interface FetchState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  currentNodeType: string | null;
}

/** Heatmap display options */
export interface DisplayOptions {
  /** Show percentage values on cells */
  showValues: boolean;
  /** Show row/column summary bars */
  showSummary: boolean;
  /** Sort rows by density */
  sortByDensity: boolean;
  /** Minimum cell size in pixels */
  cellSize: number;
  /** Color scheme override */
  colorScheme: ColorScheme;
}

/** Default color scheme */
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  emptyColor: "#fee2e2",
  fullColor: "#16a34a",
  nullColor: "#e5e7eb",
  steps: 10,
};

/** Default display options */
export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showValues: true,
  showSummary: true,
  sortByDensity: false,
  cellSize: 48,
  colorScheme: DEFAULT_COLOR_SCHEME,
};
