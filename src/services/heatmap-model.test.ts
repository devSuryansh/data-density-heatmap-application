import { describe, expect, it } from "vitest";
import { buildHeatmapResult } from "@/src/services/heatmap-model";

describe("heatmap model", () => {
  it("builds matrix rows and summary metrics from density stats", () => {
    const result = buildHeatmapResult([
      {
        nodeType: "Patient",
        attribute: "age",
        density: 0.9,
        nonNullCount: 9,
        totalCount: 10,
      },
      {
        nodeType: "Patient",
        attribute: "diagnosis",
        density: 0.7,
        nonNullCount: 7,
        totalCount: 10,
      },
      {
        nodeType: "Specimen",
        attribute: "volume",
        density: 0.5,
        nonNullCount: 5,
        totalCount: 10,
      },
    ]);

    expect(result.nodeTypes).toEqual(["Patient", "Specimen"]);
    expect(result.attributes).toEqual(["age", "diagnosis", "volume"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].attributes).toHaveLength(2);
    expect(result.overallDensity).toBeCloseTo((0.9 + 0.7 + 0.5) / 3, 6);
  });
});
