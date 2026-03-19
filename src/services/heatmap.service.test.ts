import { describe, expect, it } from "vitest";
import { buildHeatmapModel } from "@/src/services/heatmap.service";

const config = {
  endpointUrl: "http://localhost:3000/api/graphql",
  nodeTypeInclude: [],
  nodeTypeExclude: [],
  attributeExcludeList: ["id", "__typename"],
  maxRecordsPerNode: 500,
  batchSize: 50,
};

describe("buildHeatmapModel", () => {
  it("correctly maps raw records into HeatmapCell[]", () => {
    const model = buildHeatmapModel(
      [{ nodeType: "Patient", attributes: ["age", "gender"] }],
      { Patient: [{ age: 5, gender: "F" }, { age: null, gender: "M" }] },
      config,
    );

    expect(model.cells).toHaveLength(2);
  });

  it("nodeTypes and attributes arrays are sorted alphabetically", () => {
    const model = buildHeatmapModel(
      [
        { nodeType: "Study", attributes: ["title"] },
        { nodeType: "Patient", attributes: ["age"] },
      ],
      {
        Study: [{ title: "A" }],
        Patient: [{ age: 12 }],
      },
      config,
    );

    expect(model.nodeTypes).toEqual(["Patient", "Study"]);
    expect(model.attributes).toEqual(["age", "title"]);
  });

  it("generatedAt is a valid ISO timestamp", () => {
    const model = buildHeatmapModel([{ nodeType: "Sample", attributes: ["labId"] }], { Sample: [] }, config);
    expect(new Date(model.generatedAt).toISOString()).toBe(model.generatedAt);
  });

  it("handles empty records gracefully", () => {
    const model = buildHeatmapModel([{ nodeType: "Sample", attributes: ["labId"] }], { Sample: [] }, config);
    expect(model.cells[0].density).toBe(0);
    expect(model.cells[0].nonNullCount).toBe(0);
  });

  it("attributeExcludeList removes expected fields", () => {
    const model = buildHeatmapModel(
      [{ nodeType: "Patient", attributes: ["age"] }],
      { Patient: [{ id: "1", age: 50 }] },
      {
        ...config,
        attributeExcludeList: ["id", "__typename"],
      },
    );

    expect(model.cells.some((cell) => cell.attribute === "id")).toBe(false);
  });
});
