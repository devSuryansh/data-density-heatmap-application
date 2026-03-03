import { NextResponse } from "next/server";

/**
 * Mock GraphQL API endpoint that serves demo data for the heatmap.
 * In production, this would be replaced by a real GraphQL endpoint.
 */

// Seeded random generator for consistent mock data
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockRecords(
  fields: string[],
  count: number,
  densityProfile: Record<string, number>,
  seed: number
): Record<string, unknown>[] {
  const random = createSeededRandom(seed);
  const records: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const record: Record<string, unknown> = { id: `id-${i + 1}` };
    for (const field of fields) {
      const fillRate = densityProfile[field] ?? 0.7;
      record[field] = random() < fillRate ? `mock-${field}-${i}` : null;
    }
    records.push(record);
  }

  return records;
}

const MOCK_DATA_MAP: Record<string, () => unknown> = {
  patients: () =>
    generateMockRecords(
      ["name", "age", "gender", "ethnicity", "diagnosis", "enrollmentDate", "contactEmail", "insuranceId", "primaryPhysician"],
      1247,
      {
        name: 0.98, age: 0.95, gender: 0.92, ethnicity: 0.55,
        diagnosis: 0.88, enrollmentDate: 0.96, contactEmail: 0.45,
        insuranceId: 0.38, primaryPhysician: 0.72,
      },
      101
    ),
  specimens: () =>
    generateMockRecords(
      ["type", "collectionDate", "volume", "storageTemp", "preservationMethod", "quality", "sourceOrgan", "patientId"],
      3891,
      {
        type: 0.95, collectionDate: 0.82, volume: 0.68, storageTemp: 0.74,
        preservationMethod: 0.58, quality: 0.45, sourceOrgan: 0.78, patientId: 0.99,
      },
      202
    ),
  genomicProfiles: () =>
    generateMockRecords(
      ["sequencingPlatform", "libraryStrategy", "referenceGenome", "coverage", "mutationCount", "fusionCount", "copyNumberAlterations", "tumorMutationalBurden", "microsatelliteStatus"],
      892,
      {
        sequencingPlatform: 0.92, libraryStrategy: 0.85, referenceGenome: 0.95,
        coverage: 0.65, mutationCount: 0.58, fusionCount: 0.32,
        copyNumberAlterations: 0.42, tumorMutationalBurden: 0.28, microsatelliteStatus: 0.22,
      },
      303
    ),
  treatments: () =>
    generateMockRecords(
      ["type", "regimen", "startDate", "endDate", "dosage", "responseStatus", "adverseEvents", "followUpDate", "outcome"],
      2156,
      {
        type: 0.95, regimen: 0.82, startDate: 0.93, endDate: 0.55,
        dosage: 0.72, responseStatus: 0.65, adverseEvents: 0.35,
        followUpDate: 0.48, outcome: 0.42,
      },
      404
    ),
  diagnoses: () =>
    generateMockRecords(
      ["code", "description", "site", "stage", "grade", "morphology", "diagnosisDate", "pathologicalFindings", "clinicalNotes"],
      1305,
      {
        code: 0.97, description: 0.92, site: 0.88, stage: 0.82,
        grade: 0.75, morphology: 0.55, diagnosisDate: 0.94,
        pathologicalFindings: 0.45, clinicalNotes: 0.32,
      },
      505
    ),
  imagingStudies: () =>
    generateMockRecords(
      ["modality", "bodyPart", "studyDate", "seriesCount", "instanceCount", "contrast", "resolution", "findings", "radiologistNotes"],
      567,
      {
        modality: 0.95, bodyPart: 0.82, studyDate: 0.88, seriesCount: 0.72,
        instanceCount: 0.68, contrast: 0.35, resolution: 0.42,
        findings: 0.28, radiologistNotes: 0.15,
      },
      606
    ),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { errors: [{ message: "No query provided" }] },
        { status: 400 }
      );
    }

    // Parse the query to determine which data type is being requested
    const queryStr = query.toString().toLowerCase();
    const responseData: Record<string, unknown> = {};

    for (const [key, generator] of Object.entries(MOCK_DATA_MAP)) {
      if (queryStr.includes(key.toLowerCase())) {
        responseData[key] = generator();
      }
    }

    if (Object.keys(responseData).length === 0) {
      return NextResponse.json(
        { errors: [{ message: "Unknown query type" }] },
        { status: 400 }
      );
    }

    // Simulate a small network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    return NextResponse.json({ data: responseData });
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Internal server error" }] },
      { status: 500 }
    );
  }
}
