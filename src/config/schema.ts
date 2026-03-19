import { z } from "zod";

export const ConfigSchema = z.object({
  endpointUrl: z.string().url(),
  nodeTypeInclude: z.array(z.string()).default([]),
  nodeTypeExclude: z.array(z.string()).default([]),
  attributeExcludeList: z.array(z.string()).default(["id", "__typename"]),
  maxRecordsPerNode: z.number().int().positive().max(10000).default(500),
  batchSize: z.number().int().min(1).max(200).default(50),
  orgName: z.string().optional(),
  orgLogoUrl: z.string().url().optional(),
});

export type ParsedConfig = z.infer<typeof ConfigSchema>;
