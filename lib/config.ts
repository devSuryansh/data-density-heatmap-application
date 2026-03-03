import type { HeatmapConfig } from "./types";

/**
 * Sample configurations demonstrating the configuration-driven approach.
 * Users can create their own configs for any GraphQL endpoint.
 */

/** Demo configuration using a mock/sample dataset */
export const DEMO_CONFIG: HeatmapConfig = {
  title: "Clinical Trials Dataset — Data Density",
  description:
    "Data completeness heatmap for a clinical trials dataset. Each cell shows the percentage of records that have non-null values for the given attribute.",
  endpoint: "/api/graphql",
  nodeTypes: [
    {
      typeName: "Patient",
      displayName: "Patient",
      query: `query { patients { id name age gender ethnicity diagnosis enrollmentDate contactEmail insuranceId primaryPhysician } }`,
      dataPath: "patients",
      attributes: [
        { fieldName: "name", displayName: "Name" },
        { fieldName: "age", displayName: "Age" },
        { fieldName: "gender", displayName: "Gender" },
        { fieldName: "ethnicity", displayName: "Ethnicity" },
        { fieldName: "diagnosis", displayName: "Diagnosis" },
        { fieldName: "enrollmentDate", displayName: "Enrollment Date" },
        { fieldName: "contactEmail", displayName: "Contact Email" },
        { fieldName: "insuranceId", displayName: "Insurance ID" },
        { fieldName: "primaryPhysician", displayName: "Primary Physician" },
      ],
    },
    {
      typeName: "Specimen",
      displayName: "Specimen",
      query: `query { specimens { id type collectionDate volume storageTemp preservationMethod quality sourceOrgan patientId } }`,
      dataPath: "specimens",
      attributes: [
        { fieldName: "type", displayName: "Type" },
        { fieldName: "collectionDate", displayName: "Collection Date" },
        { fieldName: "volume", displayName: "Volume" },
        { fieldName: "storageTemp", displayName: "Storage Temp" },
        { fieldName: "preservationMethod", displayName: "Preservation Method" },
        { fieldName: "quality", displayName: "Quality" },
        { fieldName: "sourceOrgan", displayName: "Source Organ" },
        { fieldName: "patientId", displayName: "Patient ID" },
      ],
    },
    {
      typeName: "GenomicProfile",
      displayName: "Genomic Profile",
      query: `query { genomicProfiles { id sequencingPlatform libraryStrategy referenceGenome coverage mutationCount fusionCount copyNumberAlterations tumorMutationalBurden microsatelliteStatus } }`,
      dataPath: "genomicProfiles",
      attributes: [
        { fieldName: "sequencingPlatform", displayName: "Sequencing Platform" },
        { fieldName: "libraryStrategy", displayName: "Library Strategy" },
        { fieldName: "referenceGenome", displayName: "Reference Genome" },
        { fieldName: "coverage", displayName: "Coverage" },
        { fieldName: "mutationCount", displayName: "Mutation Count" },
        { fieldName: "fusionCount", displayName: "Fusion Count" },
        { fieldName: "copyNumberAlterations", displayName: "Copy Number Alterations" },
        { fieldName: "tumorMutationalBurden", displayName: "Tumor Mutational Burden" },
        { fieldName: "microsatelliteStatus", displayName: "Microsatellite Status" },
      ],
    },
    {
      typeName: "Treatment",
      displayName: "Treatment",
      query: `query { treatments { id type regimen startDate endDate dosage responseStatus adverseEvents followUpDate outcome } }`,
      dataPath: "treatments",
      attributes: [
        { fieldName: "type", displayName: "Type" },
        { fieldName: "regimen", displayName: "Regimen" },
        { fieldName: "startDate", displayName: "Start Date" },
        { fieldName: "endDate", displayName: "End Date" },
        { fieldName: "dosage", displayName: "Dosage" },
        { fieldName: "responseStatus", displayName: "Response Status" },
        { fieldName: "adverseEvents", displayName: "Adverse Events" },
        { fieldName: "followUpDate", displayName: "Follow-up Date" },
        { fieldName: "outcome", displayName: "Outcome" },
      ],
    },
    {
      typeName: "Diagnosis",
      displayName: "Diagnosis",
      query: `query { diagnoses { id code description site stage grade morphology diagnosisDate pathologicalFindings clinicalNotes } }`,
      dataPath: "diagnoses",
      attributes: [
        { fieldName: "code", displayName: "Code" },
        { fieldName: "description", displayName: "Description" },
        { fieldName: "site", displayName: "Site" },
        { fieldName: "stage", displayName: "Stage" },
        { fieldName: "grade", displayName: "Grade" },
        { fieldName: "morphology", displayName: "Morphology" },
        { fieldName: "diagnosisDate", displayName: "Diagnosis Date" },
        { fieldName: "pathologicalFindings", displayName: "Pathological Findings" },
        { fieldName: "clinicalNotes", displayName: "Clinical Notes" },
      ],
    },
    {
      typeName: "Imaging",
      displayName: "Imaging",
      query: `query { imagingStudies { id modality bodyPart studyDate seriesCount instanceCount contrast resolution findings radiologistNotes } }`,
      dataPath: "imagingStudies",
      attributes: [
        { fieldName: "modality", displayName: "Modality" },
        { fieldName: "bodyPart", displayName: "Body Part" },
        { fieldName: "studyDate", displayName: "Study Date" },
        { fieldName: "seriesCount", displayName: "Series Count" },
        { fieldName: "instanceCount", displayName: "Instance Count" },
        { fieldName: "contrast", displayName: "Contrast" },
        { fieldName: "resolution", displayName: "Resolution" },
        { fieldName: "findings", displayName: "Findings" },
        { fieldName: "radiologistNotes", displayName: "Radiologist Notes" },
      ],
    },
  ],
};

/** 
 * Parse and validate a user-provided configuration JSON
 */
export function parseConfig(jsonString: string): HeatmapConfig {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.title || typeof parsed.title !== "string") {
      throw new Error("Configuration must have a 'title' string field");
    }
    if (!parsed.endpoint || typeof parsed.endpoint !== "string") {
      throw new Error("Configuration must have an 'endpoint' string field");
    }
    if (!Array.isArray(parsed.nodeTypes) || parsed.nodeTypes.length === 0) {
      throw new Error("Configuration must have a non-empty 'nodeTypes' array");
    }

    for (const nt of parsed.nodeTypes) {
      if (!nt.typeName) throw new Error(`Each nodeType must have a 'typeName'`);
      if (!nt.query) throw new Error(`NodeType '${nt.typeName}' must have a 'query'`);
      if (!nt.dataPath) throw new Error(`NodeType '${nt.typeName}' must have a 'dataPath'`);
      if (!Array.isArray(nt.attributes) || nt.attributes.length === 0) {
        throw new Error(`NodeType '${nt.typeName}' must have non-empty 'attributes' array`);
      }
    }

    return parsed as HeatmapConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate a configuration template for users to customize
 */
export function generateConfigTemplate(): string {
  const template: HeatmapConfig = {
    title: "My Dataset — Data Density",
    description: "Describe your dataset here",
    endpoint: "https://your-graphql-endpoint.com/graphql",
    headers: {
      Authorization: "Bearer YOUR_TOKEN",
    },
    nodeTypes: [
      {
        typeName: "ExampleType",
        displayName: "Example Type",
        query: `query { examples { id field1 field2 field3 } }`,
        dataPath: "examples",
        attributes: [
          { fieldName: "field1", displayName: "Field 1" },
          { fieldName: "field2", displayName: "Field 2" },
          { fieldName: "field3", displayName: "Field 3" },
        ],
      },
    ],
  };
  return JSON.stringify(template, null, 2);
}
