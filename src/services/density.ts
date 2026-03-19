import type { HeatmapCell } from "@/src/types";

export function isNonNullValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function density(nonNullCount: number, totalRecords: number): number {
  if (totalRecords === 0) {
    return 0;
  }

  return nonNullCount / totalRecords;
}

export function buildDensityCell(
  nodeType: string,
  attribute: string,
  records: Record<string, unknown>[],
): HeatmapCell {
  const totalRecords = records.length;
  const nonNullCount = records.reduce((count, record) => {
    return count + (isNonNullValue(record[attribute]) ? 1 : 0);
  }, 0);

  return {
    nodeType,
    attribute,
    density: density(nonNullCount, totalRecords),
    nonNullCount,
    totalRecords,
  };
}
