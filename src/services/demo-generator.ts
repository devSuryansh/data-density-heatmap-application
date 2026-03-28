type PrimitiveValue = string | number | boolean | null;
export type DemoValue = PrimitiveValue | DemoObject;
export interface DemoObject {
  [key: string]: DemoValue;
}
export type DemoRecord = Record<string, DemoValue>;

type DensityBand = "high" | "medium" | "low";
type CompletenessProfile = "complete" | "partial" | "sparse";

interface FieldSpec {
  name: string;
  band: DensityBand;
  group?: string;
  dependsOn?: string[];
  boostWhenPresent?: string[];
  generate: (context: GenerationContext) => DemoValue;
}

interface GenerationContext {
  index: number;
  random: () => number;
  record: DemoRecord;
  profile: CompletenessProfile;
}

interface NodeSpec {
  seed: number;
  count: number;
  fields: FieldSpec[];
  groupDropoutRates: Partial<Record<string, number>>;
  profileWeights?: Record<CompletenessProfile, number>;
  rateShift?: number;
}

interface DemoDataset {
  patients: DemoRecord[];
  studies: DemoRecord[];
  samples: DemoRecord[];
}

const BAND_FILL_RANGES: Record<DensityBand, [number, number]> = {
  high: [0.8, 0.98],
  medium: [0.4, 0.7],
  low: [0.05, 0.3],
};

const PROFILE_MODIFIER: Record<CompletenessProfile, number> = {
  complete: 0.1,
  partial: 0,
  sparse: -0.2,
};

const PATIENT_NAMES = [
  "Ava Nguyen",
  "Noah Patel",
  "Mia Johnson",
  "Liam Rivera",
  "Sophia Chen",
  "Ethan Brooks",
  "Isabella Gomez",
  "Lucas Shah",
];

const SPONSOR_NAMES = [
  "Helios Biotech",
  "Northlake Therapeutics",
  "Crescent Research Group",
  "Altura Life Sciences",
  "Meridian Clinical",
];

const THERAPEUTIC_AREAS = ["Oncology", "Cardiology", "Immunology", "Neurology", "Endocrinology"];
const SAMPLE_TYPES = ["Plasma", "Serum", "Whole Blood", "PBMC", "Tissue"];

function createSeededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function choose<T>(values: T[], random: () => number): T {
  return values[Math.floor(random() * values.length)] as T;
}

function chance(random: () => number, probability: number): boolean {
  return random() < probability;
}

function sampleInRange(random: () => number, [min, max]: [number, number]): number {
  return min + random() * (max - min);
}

function toIsoDate(yearStart: number, random: () => number): string {
  const year = yearStart + Math.floor(random() * 4);
  const month = String(Math.floor(random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(random() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toFixedNumber(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function chooseProfile(
  random: () => number,
  profileWeights?: Record<CompletenessProfile, number>,
): CompletenessProfile {
  if (!profileWeights) {
    const roll = random();
    if (roll < 0.5) {
      return "complete";
    }
    if (roll < 0.82) {
      return "partial";
    }
    return "sparse";
  }

  const total = profileWeights.complete + profileWeights.partial + profileWeights.sparse;
  const completeWeight = profileWeights.complete / total;
  const partialWeight = profileWeights.partial / total;
  const roll = random();
  if (roll < completeWeight) {
    return "complete";
  }
  if (roll < completeWeight + partialWeight) {
    return "partial";
  }
  return "sparse";
}

function buildFieldBaseRates(fields: FieldSpec[], random: () => number): Record<string, number> {
  return fields.reduce<Record<string, number>>((rates, field) => {
    rates[field.name] = sampleInRange(random, BAND_FILL_RANGES[field.band]);
    return rates;
  }, {});
}

function generateNodeRecords(spec: NodeSpec): DemoRecord[] {
  const random = createSeededRandom(spec.seed);
  const baseRates = buildFieldBaseRates(spec.fields, random);
  const nodeRateShift = spec.rateShift ?? 0;

  return Array.from({ length: spec.count }, (_, index) => {
    const profile = chooseProfile(random, spec.profileWeights);
    const record: DemoRecord = { id: `${spec.seed}-${index + 1}` };

    const droppedGroups = Object.entries(spec.groupDropoutRates).reduce<Record<string, boolean>>(
      (accumulator, [group, probability]) => {
        accumulator[group] = chance(random, probability ?? 0);
        return accumulator;
      },
      {},
    );

    for (const field of spec.fields) {
      let fillProbability = clamp(
        baseRates[field.name] + PROFILE_MODIFIER[profile] + nodeRateShift,
        0.02,
        0.995,
      );

      if (field.group && droppedGroups[field.group]) {
        fillProbability *= 0.25;
      }

      if (field.dependsOn && field.dependsOn.some((dependency) => record[dependency] == null)) {
        fillProbability *= 0.2;
      }

      if (field.boostWhenPresent && field.boostWhenPresent.some((dependency) => record[dependency] != null)) {
        fillProbability = Math.max(fillProbability, 0.9);
      }

      if (!chance(random, fillProbability)) {
        record[field.name] = null;
        continue;
      }

      record[field.name] = field.generate({ index, random, record, profile });
    }

    // Keep realistic identity coherence: if an email exists, a display name is almost always present.
    if (record.email != null && record.name == null) {
      record.name = choose(PATIENT_NAMES, random);
    }

    return record;
  });
}

function createPatientSpec(): NodeSpec {
  return {
    seed: 11,
    count: 240,
    profileWeights: {
      complete: 0.26,
      partial: 0.49,
      sparse: 0.25,
    },
    rateShift: -0.03,
    groupDropoutRates: {
      contact: 0.28,
      behavior: 0.25,
      clinical: 0.2,
    },
    fields: [
      {
        name: "name",
        band: "medium",
        generate: ({ random }) => choose(PATIENT_NAMES, random),
      },
      {
        name: "email",
        band: "low",
        group: "contact",
        dependsOn: ["name"],
        generate: ({ record, random, index }) => {
          const normalized = String(record.name ?? `patient-${index + 1}`)
            .toLowerCase()
            .replace(/\s+/g, ".");
          const domain = choose(["health.org", "trial.net", "care.io"], random);
          return `${normalized}@${domain}`;
        },
      },
      {
        name: "phone",
        band: "low",
        group: "contact",
        generate: ({ random }) => `+1-312-555-${String(Math.floor(random() * 9000) + 1000)}`,
      },
      {
        name: "age",
        band: "medium",
        generate: ({ random }) => Math.floor(random() * 63) + 18,
      },
      {
        name: "gender",
        band: "medium",
        generate: ({ random }) => choose(["Female", "Male", "Non-binary"], random),
      },
      {
        name: "diagnosisCode",
        band: "medium",
        group: "clinical",
        generate: ({ random }) => choose(["C34.1", "E11.9", "I50.9", "M06.9", "G35"], random),
      },
      {
        name: "enrollmentDate",
        band: "medium",
        generate: ({ random }) => toIsoDate(2021, random),
      },
      {
        name: "siteId",
        band: "medium",
        generate: ({ random }) => choose(["CHI-001", "CHI-002", "CHI-003", "NYC-001"], random),
      },
      {
        name: "consentStatus",
        band: "medium",
        generate: ({ random }) => choose(["Consented", "Withdrawn", "Pending"], random),
      },
      {
        name: "ethnicity",
        band: "low",
        group: "behavior",
        generate: ({ random }) =>
          choose(["Hispanic", "Non-Hispanic", "Not Reported", "Prefer not to answer"], random),
      },
      {
        name: "smokingStatus",
        band: "medium",
        group: "behavior",
        generate: ({ random }) => choose(["Never", "Former", "Current"], random),
      },
      {
        name: "bmiValue",
        band: "medium",
        group: "clinical",
        generate: ({ random }) => toFixedNumber(17 + random() * 18, 1),
      },
      {
        name: "contact",
        band: "low",
        group: "contact",
        boostWhenPresent: ["email"],
        generate: ({ record, random }) => ({
          preferredChannel: record.email ? "email" : choose(["phone", "portal"], random),
          timezone: choose(["America/Chicago", "America/New_York", "America/Denver"], random),
          lastContactDate: toIsoDate(2022, random),
        }),
      },
    ],
  };
}

function createStudySpec(): NodeSpec {
  return {
    seed: 22,
    count: 180,
    profileWeights: {
      complete: 0.4,
      partial: 0.42,
      sparse: 0.18,
    },
    rateShift: -0.05,
    groupDropoutRates: {
      operational: 0.14,
      design: 0.2,
    },
    fields: [
      {
        name: "title",
        band: "high",
        generate: ({ random }) => choose([
          "Adaptive Immunotherapy Study",
          "Metabolic Risk Cohort",
          "Early Detection Registry",
          "Cardio Outcomes Pilot",
          "Rare Disease Longitudinal Study",
        ], random),
      },
      {
        name: "phase",
        band: "high",
        generate: ({ random }) => choose(["Phase I", "Phase II", "Phase III", "Observational"], random),
      },
      {
        name: "sponsorName",
        band: "high",
        generate: ({ random }) => choose(SPONSOR_NAMES, random),
      },
      {
        name: "startDate",
        band: "high",
        generate: ({ random }) => toIsoDate(2020, random),
      },
      {
        name: "endDate",
        band: "medium",
        group: "operational",
        dependsOn: ["startDate"],
        generate: ({ random }) => toIsoDate(2023, random),
      },
      {
        name: "status",
        band: "high",
        generate: ({ random }) => choose(["Recruiting", "Active", "Completed", "On Hold"], random),
      },
      {
        name: "therapeuticArea",
        band: "high",
        generate: ({ random }) => choose(THERAPEUTIC_AREAS, random),
      },
      {
        name: "nctId",
        band: "medium",
        group: "operational",
        generate: ({ random }) => `NCT${String(Math.floor(random() * 9000000) + 1000000)}`,
      },
      {
        name: "primaryEndpoint",
        band: "medium",
        group: "design",
        generate: ({ random }) =>
          choose(["Overall survival", "Progression-free survival", "HbA1c change", "Biomarker response"], random),
      },
      {
        name: "treatment",
        band: "medium",
        group: "design",
        generate: ({ random }) => choose(["Drug A", "Drug B", "Radiation", "Lifestyle Program"], random),
      },
      {
        name: "therapy_type",
        band: "medium",
        group: "design",
        dependsOn: ["treatment"],
        boostWhenPresent: ["treatment"],
        generate: ({ random, record }) => {
          const treatment = String(record.treatment ?? "");
          if (treatment.includes("Drug")) {
            return choose(["Targeted", "Immunotherapy", "Chemotherapy"], random);
          }
          if (treatment.includes("Radiation")) {
            return "Radiotherapy";
          }
          return choose(["Behavioral", "Supportive", "Mixed"], random);
        },
      },
      {
        name: "targetEnrollment",
        band: "low",
        group: "design",
        generate: ({ random }) => Math.floor(random() * 1400) + 80,
      },
      {
        name: "timeline",
        band: "medium",
        dependsOn: ["startDate"],
        generate: ({ random }) => ({
          kickoffQuarter: choose(["Q1", "Q2", "Q3", "Q4"], random),
          region: choose(["NA", "EU", "APAC", "LATAM"], random),
        }),
      },
    ],
  };
}

function createSampleSpec(): NodeSpec {
  return {
    seed: 33,
    count: 420,
    profileWeights: {
      complete: 0.6,
      partial: 0.31,
      sparse: 0.09,
    },
    rateShift: 0.08,
    groupDropoutRates: {
      quality: 0.12,
      logistics: 0.16,
    },
    fields: [
      {
        name: "patient_id",
        band: "high",
        generate: ({ random }) => `11-${Math.floor(random() * 240) + 1}`,
      },
      {
        name: "study_id",
        band: "high",
        dependsOn: ["patient_id"],
        boostWhenPresent: ["patient_id"],
        generate: ({ random }) => `22-${Math.floor(random() * 180) + 1}`,
      },
      {
        name: "collectionDate",
        band: "high",
        generate: ({ random }) => toIsoDate(2022, random),
      },
      {
        name: "sampleType",
        band: "high",
        generate: ({ random }) => choose(SAMPLE_TYPES, random),
      },
      {
        name: "storageTemp",
        band: "medium",
        group: "logistics",
        generate: ({ random }) => choose(["-80C", "-20C", "4C", "Room Temp"], random),
      },
      {
        name: "processingStatus",
        band: "high",
        generate: ({ random }) => choose(["Processed", "Queued", "Failed", "Pending"], random),
      },
      {
        name: "volume",
        band: "medium",
        group: "quality",
        generate: ({ random }) => toFixedNumber(0.5 + random() * 7.5, 2),
      },
      {
        name: "concentration",
        band: "medium",
        group: "quality",
        dependsOn: ["volume"],
        generate: ({ random, record }) => {
          const volume = typeof record.volume === "number" ? record.volume : 1;
          return toFixedNumber(8 + volume * 4 + random() * 16, 2);
        },
      },
      {
        name: "passedQC",
        band: "high",
        group: "quality",
        generate: ({ random, record }) => {
          const concentration = typeof record.concentration === "number" ? record.concentration : 0;
          const passProbability = concentration > 20 ? 0.86 : 0.57;
          return chance(random, passProbability);
        },
      },
      {
        name: "labId",
        band: "high",
        generate: ({ random }) => choose(["LAB-A", "LAB-B", "LAB-C", "LAB-D"], random),
      },
      {
        name: "shipmentId",
        band: "low",
        group: "logistics",
        generate: ({ random }) => `SHIP-${String(Math.floor(random() * 90000) + 10000)}`,
      },
      {
        name: "qcMetadata",
        band: "medium",
        group: "quality",
        boostWhenPresent: ["passedQC"],
        generate: ({ random }) => ({
          instrument: choose(["NovaSeq", "QuantStudio", "CytoFlex", "Bioanalyzer"], random),
          runBatch: `RB-${Math.floor(random() * 90) + 10}`,
          technicianShift: choose(["day", "swing", "night"], random),
        }),
      },
    ],
  };
}

export function buildDemoDataset(): DemoDataset {
  return {
    patients: generateNodeRecords(createPatientSpec()),
    studies: generateNodeRecords(createStudySpec()),
    samples: generateNodeRecords(createSampleSpec()),
  };
}