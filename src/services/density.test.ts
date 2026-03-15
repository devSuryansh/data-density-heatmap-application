import { describe, expect, it } from "vitest";
import { calculateAttributeDensity, calculateNodeDensity } from "@/src/services/density";

describe("density service", () => {
  it("calculates attribute density using non-null records", () => {
    const records = [
      { age: 10 },
      { age: null },
      { age: 7 },
      { age: "" },
      { age: 12 },
    ];

    const result = calculateAttributeDensity(records, "age");

    expect(result.totalCount).toBe(5);
    expect(result.nonNullCount).toBe(3);
    expect(result.density).toBeCloseTo(0.6, 6);
  });

  it("calculates density per field for a node type", () => {
    const records = [
      { name: "A", diagnosis: "d1" },
      { name: "B", diagnosis: null },
      { name: null, diagnosis: "d3" },
      { name: "D", diagnosis: "d4" },
    ];

    const result = calculateNodeDensity("Patient", ["name", "diagnosis"], records);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      nodeType: "Patient",
      attribute: "name",
      nonNullCount: 3,
      totalCount: 4,
    });
    expect(result[1]).toMatchObject({
      nodeType: "Patient",
      attribute: "diagnosis",
      nonNullCount: 3,
      totalCount: 4,
    });
  });
});
