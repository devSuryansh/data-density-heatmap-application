import { NextResponse } from "next/server";
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";

type RecordValue = string | number | boolean | null;
type DemoRecord = Record<string, RecordValue>;

interface ConnectionArgs {
  first?: number;
  after?: string;
  limit?: number;
  offset?: number;
}

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function generateMockRecords(fields: string[], count: number, nullRate: number, seed: number): DemoRecord[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const record: DemoRecord = { id: `${seed}-${index + 1}` };

    fields.forEach((field) => {
      const isFilled = random() > nullRate;

      if (!isFilled) {
        record[field] = null;
        return;
      }

      if (field.toLowerCase().includes("date")) {
        const month = Math.floor(random() * 11 + 1)
          .toString()
          .padStart(2, "0");
        const day = Math.floor(random() * 27 + 1)
          .toString()
          .padStart(2, "0");
        record[field] = `202${Math.floor(random() * 4)}-${month}-${day}`;
      } else if (
        field.toLowerCase().includes("age") ||
        field.toLowerCase().includes("volume") ||
        field.toLowerCase().includes("bmi") ||
        field.toLowerCase().includes("concentration")
      ) {
        record[field] = Math.round(random() * 100);
      } else if (field.toLowerCase().includes("passed")) {
        record[field] = random() > 0.5;
      } else {
        record[field] = `${field}-${Math.floor(random() * 8 + 1)}`;
      }
    });

    return record;
  });
}

const DATASET = {
  patients: generateMockRecords(
    [
      "age",
      "gender",
      "diagnosisCode",
      "enrollmentDate",
      "siteId",
      "consentStatus",
      "ethnicity",
      "smokingStatus",
      "bmiValue",
    ],
    60,
    0.15,
    11,
  ),
  studies: generateMockRecords(
    [
      "title",
      "phase",
      "sponsorName",
      "startDate",
      "endDate",
      "status",
      "therapeuticArea",
      "nctId",
      "primaryEndpoint",
    ],
    60,
    0.3,
    22,
  ),
  samples: generateMockRecords(
    [
      "patientId",
      "collectionDate",
      "sampleType",
      "storageTemp",
      "processingStatus",
      "volume",
      "concentration",
      "passedQC",
      "labId",
    ],
    60,
    0.45,
    33,
  ),
};

function inferGraphQLType(values: DemoRecord[], fieldName: string) {
  const firstValue = values.find((value) => value[fieldName] !== null)?.[fieldName];

  if (typeof firstValue === "number") {
    return Number.isInteger(firstValue) ? GraphQLInt : GraphQLFloat;
  }

  if (typeof firstValue === "boolean") {
    return GraphQLBoolean;
  }

  return GraphQLString;
}

function createObjectType(name: string, records: DemoRecord[]) {
  const first = records[0] ?? {};
  const fieldEntries = Object.keys(first).reduce<
    Record<string, { type: typeof GraphQLString | typeof GraphQLInt | typeof GraphQLFloat | typeof GraphQLBoolean }>
  >(
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
const StudyType = createObjectType("Study", DATASET.studies);
const SampleType = createObjectType("Sample", DATASET.samples);

const PageInfoType = new GraphQLObjectType({
  name: "PageInfo",
  fields: {
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    endCursor: { type: GraphQLString },
  },
});

function createConnectionType(nodeName: string, nodeType: GraphQLObjectType): GraphQLObjectType {
  const edgeType = new GraphQLObjectType({
    name: `${nodeName}Edge`,
    fields: {
      cursor: { type: new GraphQLNonNull(GraphQLString) },
      node: { type: nodeType },
    },
  });

  return new GraphQLObjectType({
    name: `${nodeName}Connection`,
    fields: {
      edges: { type: new GraphQLList(edgeType) },
      pageInfo: { type: new GraphQLNonNull(PageInfoType) },
    },
  });
}

const PatientConnection = createConnectionType("Patient", PatientType);
const StudyConnection = createConnectionType("Study", StudyType);
const SampleConnection = createConnectionType("Sample", SampleType);

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number(decoded);
  return Number.isFinite(parsed) ? parsed : 0;
}

function encodeCursor(value: number): string {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function resolvePagedRows(dataset: DemoRecord[], args: ConnectionArgs): DemoRecord[] {
  const first = args.first ?? args.limit ?? 50;
  const afterIndex = decodeCursor(args.after);
  const offset = typeof args.offset === "number" ? args.offset : afterIndex;
  return dataset.slice(offset, offset + first);
}

function resolveConnection(dataset: DemoRecord[], args: ConnectionArgs): { edges: Array<{ cursor: string; node: DemoRecord }>; pageInfo: { hasNextPage: boolean; endCursor: string } } {
  const first = args.first ?? 50;
  const start = decodeCursor(args.after);
  const rows = dataset.slice(start, start + first);
  const edges = rows.map((row, index) => ({
    cursor: encodeCursor(start + index + 1),
    node: row,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: start + first < dataset.length,
      endCursor: encodeCursor(start + rows.length),
    },
  };
}

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    patient: {
      type: PatientConnection,
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
      },
      resolve: (_source, args: ConnectionArgs) => resolveConnection(DATASET.patients, args),
    },
    study: {
      type: StudyConnection,
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
      },
      resolve: (_source, args: ConnectionArgs) => resolveConnection(DATASET.studies, args),
    },
    sample: {
      type: SampleConnection,
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
      },
      resolve: (_source, args: ConnectionArgs) => resolveConnection(DATASET.samples, args),
    },
    patients: {
      type: new GraphQLList(PatientType),
      args: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: (_source, args: ConnectionArgs) => resolvePagedRows(DATASET.patients, args),
    },
    studies: {
      type: new GraphQLList(StudyType),
      args: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: (_source, args: ConnectionArgs) => resolvePagedRows(DATASET.studies, args),
    },
    samples: {
      type: new GraphQLList(SampleType),
      args: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: (_source, args: ConnectionArgs) => resolvePagedRows(DATASET.samples, args),
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

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Demo GraphQL endpoint is ready.",
    examples: [
      "POST { \"query\": \"{ patients(limit: 5) { id age } }\" }",
      "POST { \"query\": \"{ patient(first: 5) { edges { node { id age } } pageInfo { hasNextPage endCursor } } }\" }",
    ],
  });
}
