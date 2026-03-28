import { describe, expect, it } from "vitest";
import { buildDemoDataset, type DemoRecord } from "@/src/services/demo-generator";

function fillRate(records: DemoRecord[], field: string): number {
  if (records.length === 0) {
    return 0;
  }

  const populated = records.filter((record) => record[field] !== null && record[field] !== undefined).length;
  return populated / records.length;
}

describe("demo generator", () => {
  it("keeps dense, medium, and sparse fields in realistic bands", () => {
    const dataset = buildDemoDataset();

    expect(fillRate(dataset.patients, "name")).toBeGreaterThanOrEqual(0.28);
    expect(fillRate(dataset.patients, "name")).toBeLessThanOrEqual(0.7);
    expect(fillRate(dataset.patients, "email")).toBeLessThanOrEqual(0.3);
    expect(fillRate(dataset.patients, "ethnicity")).toBeLessThanOrEqual(0.3);

    expect(fillRate(dataset.studies, "status")).toBeGreaterThanOrEqual(0.6);
    expect(fillRate(dataset.studies, "status")).toBeLessThanOrEqual(0.85);
    expect(fillRate(dataset.studies, "primaryEndpoint")).toBeGreaterThanOrEqual(0.5);
    expect(fillRate(dataset.studies, "targetEnrollment")).toBeLessThanOrEqual(0.32);

    expect(fillRate(dataset.samples, "sampleType")).toBeGreaterThanOrEqual(0.8);
    expect(fillRate(dataset.samples, "labId")).toBeGreaterThanOrEqual(0.8);
    expect(fillRate(dataset.samples, "volume")).toBeGreaterThanOrEqual(0.4);
    expect(fillRate(dataset.samples, "shipmentId")).toBeLessThanOrEqual(0.3);
  });

  it("enforces correlation so patient_id presence implies study_id likely exists", () => {
    const dataset = buildDemoDataset();
    const withPatientId = dataset.samples.filter(
      (record) => record.patient_id !== null && record.patient_id !== undefined,
    );

    const withBoth = withPatientId.filter(
      (record) => record.study_id !== null && record.study_id !== undefined,
    ).length;
    const ratio = withPatientId.length === 0 ? 0 : withBoth / withPatientId.length;

    expect(ratio).toBeGreaterThanOrEqual(0.9);
  });

  it("enforces correlation so treatment presence implies therapy_type likely exists", () => {
    const dataset = buildDemoDataset();
    const withTreatment = dataset.studies.filter(
      (record) => record.treatment !== null && record.treatment !== undefined,
    );

    const withBoth = withTreatment.filter(
      (record) => record.therapy_type !== null && record.therapy_type !== undefined,
    ).length;
    const ratio = withTreatment.length === 0 ? 0 : withBoth / withTreatment.length;

    expect(ratio).toBeGreaterThanOrEqual(0.85);
  });

  it("contains nested objects to mimic real GraphQL entities", () => {
    const dataset = buildDemoDataset();

    const patientContact = dataset.patients.find((record) => record.contact && typeof record.contact === "object")
      ?.contact as Record<string, unknown> | undefined;
    const studyTimeline = dataset.studies.find((record) => record.timeline && typeof record.timeline === "object")
      ?.timeline as Record<string, unknown> | undefined;
    const sampleQc = dataset.samples.find((record) => record.qcMetadata && typeof record.qcMetadata === "object")
      ?.qcMetadata as Record<string, unknown> | undefined;

    expect(patientContact).toBeDefined();
    expect(patientContact).toHaveProperty("preferredChannel");

    expect(studyTimeline).toBeDefined();
    expect(studyTimeline).toHaveProperty("region");

    expect(sampleQc).toBeDefined();
    expect(sampleQc).toHaveProperty("instrument");
  });

  it("introduces variability across node types", () => {
    const dataset = buildDemoDataset();

    expect(dataset.patients.length).not.toBe(dataset.studies.length);
    expect(dataset.samples.length).toBeGreaterThan(dataset.patients.length);

    const patientCore = fillRate(dataset.patients, "name");
    const studyCore = fillRate(dataset.studies, "status");
    const sampleCore = fillRate(dataset.samples, "sampleType");

    expect(patientCore).toBeLessThan(studyCore);
    expect(studyCore).toBeLessThan(sampleCore);
  });
});