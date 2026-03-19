import { describe, expect, it } from "vitest";
import { ConfigSchema } from "@/src/config/schema";

describe("ConfigSchema", () => {
  it("valid config passes Zod parsing", () => {
    const parsed = ConfigSchema.parse({
      endpointUrl: "https://example.org/graphql",
      nodeTypeInclude: ["Patient"],
      nodeTypeExclude: ["Study"],
      attributeExcludeList: ["id"],
      maxRecordsPerNode: 500,
      batchSize: 50,
    });

    expect(parsed.endpointUrl).toBe("https://example.org/graphql");
  });

  it("invalid URL throws ZodError", () => {
    expect(() => ConfigSchema.parse({ endpointUrl: "x" })).toThrowError();
  });

  it("maxRecordsPerNode > 10000 throws ZodError", () => {
    expect(() => ConfigSchema.parse({ endpointUrl: "https://example.org/graphql", maxRecordsPerNode: 10001 })).toThrowError();
  });

  it("batchSize < 1 throws ZodError", () => {
    expect(() => ConfigSchema.parse({ endpointUrl: "https://example.org/graphql", batchSize: 0 })).toThrowError();
  });

  it("defaults are applied correctly when optional fields omitted", () => {
    const parsed = ConfigSchema.parse({ endpointUrl: "https://example.org/graphql" });
    expect(parsed.nodeTypeInclude).toEqual([]);
    expect(parsed.nodeTypeExclude).toEqual([]);
    expect(parsed.attributeExcludeList).toEqual(["id", "__typename"]);
    expect(parsed.maxRecordsPerNode).toBe(500);
    expect(parsed.batchSize).toBe(50);
  });
});
