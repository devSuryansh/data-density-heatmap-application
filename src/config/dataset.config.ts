import { z } from "zod";
import type { DatasetConfig } from "@/src/types/heatmap";

const datasetConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  endpoint: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  nodeInclude: z.array(z.string().min(1)).optional(),
  nodeExclude: z.array(z.string().min(1)).optional(),
  fieldExclude: z.array(z.string().min(1)).optional(),
  maxRecordsPerNode: z.number().int().positive().max(10000).default(1000),
  queryBatchSize: z.number().int().positive().max(20).default(3),
});

export const DEFAULT_DATASET_CONFIG: DatasetConfig = {
  title: "Data Density Heatmap",
  description:
    "Dataset completeness across GraphQL node types and attributes.",
  endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/api/graphql",
  headers: {},
  nodeInclude: [],
  nodeExclude: ["Mutation", "Subscription"],
  fieldExclude: ["id", "createdAt", "updatedAt"],
  maxRecordsPerNode: 1000,
  queryBatchSize: 3,
};

export function parseDatasetConfig(input: unknown): DatasetConfig {
  const parsed = datasetConfigSchema.safeParse(input);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid dataset config: ${errorMessages}`);
  }

  return parsed.data;
}
