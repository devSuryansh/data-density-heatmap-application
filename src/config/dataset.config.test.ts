import { describe, expect, it } from "vitest";
import { parseDatasetConfig } from "@/src/config/dataset.config";

describe("dataset config validation", () => {
  it("accepts a valid dataset config", () => {
    const config = parseDatasetConfig({
      title: "Data Density",
      description: "Completeness checks",
      endpoint: "https://example.org/graphql",
      headers: { Authorization: "Bearer token" },
      nodeInclude: ["Patient"],
      nodeExclude: ["Mutation"],
      fieldExclude: ["id"],
      maxRecordsPerNode: 500,
      queryBatchSize: 2,
    });

    expect(config.endpoint).toBe("https://example.org/graphql");
    expect(config.maxRecordsPerNode).toBe(500);
  });

  it("rejects invalid configs", () => {
    expect(() =>
      parseDatasetConfig({
        title: "",
        description: "x",
        endpoint: "",
      }),
    ).toThrowError();
  });
});
