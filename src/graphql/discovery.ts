import { gql, type ApolloClient } from "@apollo/client";
import type { DatasetConfig, DiscoveredNodeType } from "@/src/types/heatmap";

interface IntrospectionTypeRef {
  kind: string;
  name: string | null;
  ofType?: IntrospectionTypeRef | null;
}

interface IntrospectionField {
  name: string;
  type: IntrospectionTypeRef;
}

interface IntrospectionType {
  kind: string;
  name: string;
  fields?: IntrospectionField[];
}

interface IntrospectionResponse {
  __schema: {
    queryType: {
      fields: IntrospectionField[];
    };
    types: IntrospectionType[];
  };
}

const INTROSPECTION_QUERY = gql`
  query DensityIntrospection {
    __schema {
      queryType {
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
      types {
        kind
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
`;

function unwrapType(typeRef: IntrospectionTypeRef): { name: string | null; kind: string; isList: boolean } {
  let current: IntrospectionTypeRef | null | undefined = typeRef;
  let isList = false;

  while (current) {
    if (current.kind === "LIST") {
      isList = true;
    }
    if (!current.ofType) {
      return { name: current.name, kind: current.kind, isList };
    }
    current = current.ofType;
  }

  return { name: null, kind: "UNKNOWN", isList };
}

function isScalarField(field: IntrospectionField): boolean {
  const unwrapped = unwrapType(field.type);
  return unwrapped.kind === "SCALAR" || unwrapped.kind === "ENUM";
}

export async function discoverNodeTypes(
  client: ApolloClient<unknown>,
  config: DatasetConfig,
): Promise<DiscoveredNodeType[]> {
  const introspection = await client.query<IntrospectionResponse>({
    query: INTROSPECTION_QUERY,
  });

  const schema = introspection.data.__schema;
  const typeMap = new Map(schema.types.map((typeDef) => [typeDef.name, typeDef]));

  const included = new Set((config.nodeInclude ?? []).map((name) => name.toLowerCase()));
  const excluded = new Set((config.nodeExclude ?? []).map((name) => name.toLowerCase()));
  const fieldExcluded = new Set((config.fieldExclude ?? []).map((name) => name.toLowerCase()));

  const discovered = schema.queryType.fields
    .map((queryField) => {
      const unwrapped = unwrapType(queryField.type);
      if (!unwrapped.name) {
        return null;
      }

      const typeDef = typeMap.get(unwrapped.name);
      if (!typeDef || typeDef.kind !== "OBJECT" || typeDef.name.startsWith("__")) {
        return null;
      }

      const normalizedName = typeDef.name.toLowerCase();
      if (included.size > 0 && !included.has(normalizedName)) {
        return null;
      }
      if (excluded.has(normalizedName)) {
        return null;
      }

      const fields = (typeDef.fields ?? [])
        .filter(isScalarField)
        .map((field) => field.name)
        .filter((fieldName) => !fieldExcluded.has(fieldName.toLowerCase()));

      if (fields.length === 0) {
        return null;
      }

      return {
        name: typeDef.name,
        queryField: queryField.name,
        fields,
      };
    })
    .filter((node): node is DiscoveredNodeType => node !== null);

  return discovered;
}
