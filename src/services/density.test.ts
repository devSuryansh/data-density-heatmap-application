import { describe, expect, it } from "vitest";
import { buildDensityCell, density, isNonNullValue } from "@/src/services/density";

describe("density service", () => {
  it("density(5, 10) -> 0.5", () => {
    expect(density(5, 10)).toBe(0.5);
  });

  it("density(10, 10) -> 1.0", () => {
    expect(density(10, 10)).toBe(1);
  });

  it("density(0, 10) -> 0.0", () => {
    expect(density(0, 10)).toBe(0);
  });

  it("density(0, 0) -> 0.0", () => {
    expect(density(0, 0)).toBe(0);
  });

  it("empty string treated as null", () => {
    expect(isNonNullValue("")).toBe(false);
  });

  it("empty array treated as null", () => {
    expect(isNonNullValue([])).toBe(false);
  });

  it("builds a density cell from records", () => {
    const cell = buildDensityCell(
      "Patient",
      "gender",
      [{ gender: "M" }, { gender: null }, { gender: "" }, { gender: "F" }],
    );

    expect(cell).toEqual({
      nodeType: "Patient",
      attribute: "gender",
      density: 0.5,
      nonNullCount: 2,
      totalRecords: 4,
    });
  });
});
