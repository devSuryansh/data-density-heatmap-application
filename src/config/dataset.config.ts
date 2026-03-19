import { ConfigSchema, type ParsedConfig } from "@/src/config/schema";

export const DEFAULT_DATASET_CONFIG: ParsedConfig = {
  endpointUrl:
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "http://localhost:3000/api/graphql",
  nodeTypeInclude: [],
  nodeTypeExclude: [],
  attributeExcludeList: ["id", "__typename"],
  maxRecordsPerNode: 500,
  batchSize: 50,
  orgName: process.env.NEXT_PUBLIC_ORG_NAME ?? "D4CG",
  orgLogoUrl: process.env.NEXT_PUBLIC_ORG_LOGO_URL || undefined,
};

export function parseDatasetConfig(input: unknown): ParsedConfig {
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}
