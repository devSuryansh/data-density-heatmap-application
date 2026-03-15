import type { DensityStat } from "@/src/types/heatmap";

function isPresent(value: unknown): boolean {
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

export function calculateAttributeDensity(
  records: Record<string, unknown>[],
  attributeName: string,
): { density: number; nonNullCount: number; totalCount: number } {
  const totalCount = records.length;

  if (totalCount === 0) {
    return { density: 0, nonNullCount: 0, totalCount: 0 };
  }

  const nonNullCount = records.reduce((count, record) => {
    return count + (isPresent(record[attributeName]) ? 1 : 0);
  }, 0);

  return {
    density: nonNullCount / totalCount,
    nonNullCount,
    totalCount,
  };
}

export function calculateNodeDensity(
  nodeType: string,
  fields: string[],
  records: Record<string, unknown>[],
): DensityStat[] {
  return fields.map((fieldName) => {
    const metric = calculateAttributeDensity(records, fieldName);

    return {
      nodeType,
      attribute: fieldName,
      density: metric.density,
      nonNullCount: metric.nonNullCount,
      totalCount: metric.totalCount,
    };
  });
}
