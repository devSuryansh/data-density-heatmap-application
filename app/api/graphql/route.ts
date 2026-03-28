import { NextResponse } from "next/server";
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";
import { buildDemoDataset, type DemoObject, type DemoRecord } from "@/src/services/demo-generator";

interface ConnectionArgs {
  first?: number;
  after?: string;
  limit?: number;
  offset?: number;
}
const DATASET = buildDemoDataset();

function toTypeNamePart(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join("");
}

function inferTypeFromValues(
  values: Array<unknown>,
  typeName: string,
  registry: Map<string, GraphQLObjectType>,
): GraphQLOutputType {
  const firstValue = values.find((value) => value !== null && value !== undefined);

  if (typeof firstValue === "number") {
    return Number.isInteger(firstValue) ? GraphQLInt : GraphQLFloat;
  }

  if (typeof firstValue === "boolean") {
    return GraphQLBoolean;
  }

  if (firstValue && typeof firstValue === "object" && !Array.isArray(firstValue)) {
    return createNestedObjectType(typeName, values as DemoObject[], registry);
  }

  return GraphQLString;
}

function createNestedObjectType(
  name: string,
  objects: DemoObject[],
  registry: Map<string, GraphQLObjectType>,
): GraphQLObjectType {
  const existing = registry.get(name);
  if (existing) {
    return existing;
  }

  const nestedType = new GraphQLObjectType({
    name,
    fields: () => {
      const nestedKeys = Array.from(
        new Set(
          objects.flatMap((value) => {
            if (!value || typeof value !== "object") {
              return [];
            }
            return Object.keys(value);
          }),
        ),
      );

      if (nestedKeys.length === 0) {
        return {
          raw: { type: GraphQLString },
        };
      }

      return nestedKeys.reduce<Record<string, { type: GraphQLOutputType }>>((accumulator, key) => {
        const nestedValues = objects
          .map((value) => (value && typeof value === "object" ? value[key] : undefined))
          .filter((value) => value !== undefined);

        accumulator[key] = {
          type: inferTypeFromValues(nestedValues, `${name}${toTypeNamePart(key)}`, registry),
        };
        return accumulator;
      }, {});
    },
  });

  registry.set(name, nestedType);
  return nestedType;
}

function createObjectType(name: string, records: DemoRecord[], registry: Map<string, GraphQLObjectType>) {
  const fieldNames = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const fieldEntries = fieldNames.reduce<Record<string, { type: GraphQLOutputType }>>(
    (accumulator, fieldName) => {
      const values = records
        .map((record) => record[fieldName])
        .filter((value) => value !== undefined);

      accumulator[fieldName] = {
        type: inferTypeFromValues(values, `${name}${toTypeNamePart(fieldName)}`, registry),
      };
      return accumulator;
    },
    {},
  );

  const objectType = new GraphQLObjectType({
    name,
    fields: fieldEntries,
  });

  registry.set(name, objectType);
  return objectType;
}

const typeRegistry = new Map<string, GraphQLObjectType>();
const PatientType = createObjectType("Patient", DATASET.patients, typeRegistry);
const StudyType = createObjectType("Study", DATASET.studies, typeRegistry);
const SampleType = createObjectType("Sample", DATASET.samples, typeRegistry);

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
