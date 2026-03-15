import { NextResponse } from "next/server";
import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";

type RecordValue = string | number | null;
type DemoRecord = Record<string, RecordValue>;

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function generateMockRecords(
  fields: string[],
  count: number,
  densityProfile: Record<string, number>,
  seed: number,
): DemoRecord[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const record: DemoRecord = { id: `id-${index + 1}` };

    fields.forEach((field) => {
      const fillRate = densityProfile[field] ?? 0.7;
      const isFilled = random() < fillRate;

      if (!isFilled) {
        record[field] = null;
        return;
      }

      if (field.toLowerCase().includes("age") || field.toLowerCase().includes("count")) {
        record[field] = Math.round(random() * 100);
      } else if (field.toLowerCase().includes("coverage") || field.toLowerCase().includes("volume")) {
        record[field] = Number((random() * 250).toFixed(2));
      } else {
        record[field] = `${field}-${index + 1}`;
      }
    });

    return record;
  });
}

const DATASET = {
  patients: generateMockRecords(
    ["name", "age", "gender", "ethnicity", "diagnosis", "enrollmentDate", "contactEmail"],
    1200,
    {
      name: 0.98,
      age: 0.94,
      gender: 0.93,
      ethnicity: 0.58,
      diagnosis: 0.86,
      enrollmentDate: 0.95,
      contactEmail: 0.4,
    },
    11,
  ),
  specimens: generateMockRecords(
    ["type", "collectionDate", "volume", "storageTemp", "quality", "sourceOrgan", "patientId"],
    2400,
    {
      type: 0.97,
      collectionDate: 0.8,
      volume: 0.69,
      storageTemp: 0.71,
      quality: 0.47,
      sourceOrgan: 0.75,
      patientId: 0.99,
    },
    22,
  ),
  genomicProfiles: generateMockRecords(
    [
      "sequencingPlatform",
      "libraryStrategy",
      "referenceGenome",
      "coverage",
      "mutationCount",
      "fusionCount",
      "tumorMutationalBurden",
    ],
    900,
    {
      sequencingPlatform: 0.9,
      libraryStrategy: 0.83,
      referenceGenome: 0.96,
      coverage: 0.67,
      mutationCount: 0.59,
      fusionCount: 0.33,
      tumorMutationalBurden: 0.28,
    },
    33,
  ),
};

function inferGraphQLType(values: DemoRecord[], fieldName: string) {
  const firstValue = values.find((value) => value[fieldName] !== null)?.[fieldName];

  if (typeof firstValue === "number") {
    return Number.isInteger(firstValue) ? GraphQLInt : GraphQLFloat;
  }

  return GraphQLString;
}

function createObjectType(name: string, records: DemoRecord[]) {
  const first = records[0] ?? {};
  const fieldEntries = Object.keys(first).reduce<Record<string, { type: typeof GraphQLString | typeof GraphQLInt | typeof GraphQLFloat }>>(
    (accumulator, fieldName) => {
      accumulator[fieldName] = {
        type: inferGraphQLType(records, fieldName),
      };
      return accumulator;
    },
    {},
  );

  return new GraphQLObjectType({
    name,
    fields: fieldEntries,
  });
}

const PatientType = createObjectType("Patient", DATASET.patients);
const SpecimenType = createObjectType("Specimen", DATASET.specimens);
const GenomicProfileType = createObjectType("GenomicProfile", DATASET.genomicProfiles);

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    patients: {
      type: new GraphQLList(PatientType),
      resolve: () => DATASET.patients,
    },
    specimens: {
      type: new GraphQLList(SpecimenType),
      resolve: () => DATASET.specimens,
    },
    genomicProfiles: {
      type: new GraphQLList(GenomicProfileType),
      resolve: () => DATASET.genomicProfiles,
    },
  },
});

const schema = new GraphQLSchema({
  query: QueryType,
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    };

    if (!body.query) {
      return NextResponse.json(
        {
          errors: [{ message: "Missing GraphQL query." }],
        },
        { status: 400 },
      );
    }

    const result = await graphql({
      schema,
      source: body.query,
      variableValues: body.variables,
      operationName: body.operationName,
    });

    const status = result.errors ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected GraphQL server error.";

    return NextResponse.json(
      {
        errors: [{ message }],
      },
      { status: 500 },
    );
  }
}
