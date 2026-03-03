import type { DensityCell, HeatmapData, HeatmapConfig } from "./types";

/**
 * Generate realistic demo heatmap data based on the configuration,
 * with varying density patterns to showcase the visualization.
 */
export function generateDemoData(config: HeatmapConfig): HeatmapData {
  const cells: DensityCell[] = [];
  const nodeTypeNames: string[] = [];
  const attributeNames = new Set<string>();

  // Seed-based random for consistency
  let seed = 42;
  function seededRandom(): number {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Define realistic density patterns per node type
  const densityProfiles: Record<string, { base: number; variance: number; totalRecords: number }> = {
    Patient: { base: 0.85, variance: 0.15, totalRecords: 1247 },
    Specimen: { base: 0.72, variance: 0.2, totalRecords: 3891 },
    "Genomic Profile": { base: 0.58, variance: 0.3, totalRecords: 892 },
    Treatment: { base: 0.78, variance: 0.18, totalRecords: 2156 },
    Diagnosis: { base: 0.9, variance: 0.1, totalRecords: 1305 },
    Imaging: { base: 0.45, variance: 0.35, totalRecords: 567 },
  };

  // Attribute fill-rate modifiers (some attributes tend to be less complete)
  const attributeModifiers: Record<string, number> = {
    Name: 0.98,
    Age: 0.95,
    Gender: 0.92,
    Ethnicity: 0.65,
    Diagnosis: 0.88,
    "Enrollment Date": 0.96,
    "Contact Email": 0.55,
    "Insurance ID": 0.48,
    "Primary Physician": 0.72,
    Type: 0.95,
    "Collection Date": 0.89,
    Volume: 0.78,
    "Storage Temp": 0.82,
    "Preservation Method": 0.7,
    Quality: 0.6,
    "Source Organ": 0.85,
    "Patient ID": 0.99,
    "Sequencing Platform": 0.92,
    "Library Strategy": 0.88,
    "Reference Genome": 0.95,
    Coverage: 0.75,
    "Mutation Count": 0.68,
    "Fusion Count": 0.42,
    "Copy Number Alterations": 0.55,
    "Tumor Mutational Burden": 0.38,
    "Microsatellite Status": 0.32,
    Regimen: 0.85,
    "Start Date": 0.93,
    "End Date": 0.65,
    Dosage: 0.78,
    "Response Status": 0.72,
    "Adverse Events": 0.45,
    "Follow-up Date": 0.58,
    Outcome: 0.52,
    Code: 0.97,
    Description: 0.92,
    Site: 0.88,
    Stage: 0.82,
    Grade: 0.75,
    Morphology: 0.62,
    "Diagnosis Date": 0.94,
    "Pathological Findings": 0.55,
    "Clinical Notes": 0.42,
    Modality: 0.95,
    "Body Part": 0.88,
    "Study Date": 0.91,
    "Series Count": 0.82,
    "Instance Count": 0.78,
    Contrast: 0.45,
    Resolution: 0.52,
    Findings: 0.38,
    "Radiologist Notes": 0.25,
  };

  for (const nodeType of config.nodeTypes) {
    const typeName = nodeType.displayName || nodeType.typeName;
    nodeTypeNames.push(typeName);

    const profile = densityProfiles[typeName] || {
      base: 0.7,
      variance: 0.2,
      totalRecords: 500,
    };

    for (const attr of nodeType.attributes) {
      const attrName = attr.displayName || attr.fieldName;
      attributeNames.add(attrName);

      // Compute density combining type profile and attribute modifier
      const modifier = attributeModifiers[attrName] ?? (0.5 + seededRandom() * 0.5);
      let density = profile.base * modifier + (seededRandom() - 0.5) * profile.variance;
      density = Math.max(0, Math.min(1, density));

      const totalCount = profile.totalRecords;
      const filledCount = Math.round(density * totalCount);

      cells.push({
        nodeType: typeName,
        attribute: attrName,
        density: filledCount / totalCount,
        filledCount,
        totalCount,
      });
    }
  }

  // Compute aggregates
  const nodeTypeDensities: Record<string, number> = {};
  for (const typeName of nodeTypeNames) {
    const typeCells = cells.filter((c) => c.nodeType === typeName);
    nodeTypeDensities[typeName] =
      typeCells.reduce((sum, c) => sum + c.density, 0) / typeCells.length;
  }

  const attributeDensities: Record<string, number> = {};
  for (const attrName of attributeNames) {
    const attrCells = cells.filter((c) => c.attribute === attrName);
    if (attrCells.length > 0) {
      attributeDensities[attrName] =
        attrCells.reduce((sum, c) => sum + c.density, 0) / attrCells.length;
    }
  }

  const overallDensity =
    cells.reduce((sum, c) => sum + c.density, 0) / cells.length;

  return {
    cells,
    nodeTypes: nodeTypeNames,
    attributes: Array.from(attributeNames),
    overallDensity,
    nodeTypeDensities,
    attributeDensities,
    lastUpdated: new Date(),
  };
}
