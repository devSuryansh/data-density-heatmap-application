import { gql, type ApolloClient } from "@apollo/client";
import { getIntrospectionQuery } from "graphql";
import type { ParsedConfig } from "@/src/config/schema";
import type { NodeTypeFieldMap } from "@/src/types";

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}

interface IntrospectionField {
  name: string;
  type: TypeRef;
  args?: Array<{ name: string }>;
}

interface IntrospectionType {
  kind: string;
  name: string;
  fields?: IntrospectionField[];
}

interface IntrospectionData {
  __schema: {
    queryType: { name: string };
    types: IntrospectionType[];
  };
}

export interface IntrospectionSchemaShape {
  __schema: IntrospectionData["__schema"];
}

const INTERNAL_TYPES = new Set([
  "__Schema",
  "__Type",
  "__Field",
  "__InputValue",
  "__EnumValue",
  "__Directive",
]);

const INTROSPECTION_QUERY = gql(getIntrospectionQuery());
const introspectionCache = new Map<string, IntrospectionData>();

function unwrapType(input: TypeRef): TypeRef {
  let cursor: TypeRef | null | undefined = input;
  while (cursor?.ofType) {
    cursor = cursor.ofType;
  }

  return cursor ?? input;
}

function isScalarOrEnum(field: IntrospectionField): boolean {
  const unwrapped = unwrapType(field.type);
  return unwrapped.kind === "SCALAR" || unwrapped.kind === "ENUM";
}

interface QueryFieldCandidate {
  fieldName: string;
  prefersRelay: boolean;
}

function chooseBetterCandidate(
  existing: QueryFieldCandidate | undefined,
  next: QueryFieldCandidate,
): QueryFieldCandidate {
  if (!existing) {
    return next;
  }

  if (next.prefersRelay && !existing.prefersRelay) {
    return next;
  }

  return existing;
}

function buildQueryFieldToTypeMap(queryType: IntrospectionType): Map<string, string> {
  const candidateMap = new Map<string, QueryFieldCandidate>();

  for (const field of queryType.fields ?? []) {
    const resolved = unwrapType(field.type);
    const resolvedName = resolved.name;
    if (!resolvedName) {
      continue;
    }

    const argNames = new Set((field.args ?? []).map((arg) => arg.name));
    const supportsRelay = argNames.has("first") || argNames.has("after");
    const candidate: QueryFieldCandidate = {
      fieldName: field.name,
      prefersRelay: supportsRelay,
    };

    if (resolvedName.endsWith("Connection")) {
      const nodeTypeName = resolvedName.slice(0, -"Connection".length);
      const existing = candidateMap.get(nodeTypeName);
      candidateMap.set(nodeTypeName, chooseBetterCandidate(existing, candidate));
      continue;
    }

    const existing = candidateMap.get(resolvedName);
    candidateMap.set(resolvedName, chooseBetterCandidate(existing, candidate));
  }

  const map = new Map<string, string>();
  for (const [typeName, queryField] of candidateMap.entries()) {
    map.set(typeName, queryField.fieldName);
  }

  return map;
}

export function mapQueryableNodeTypes(
  data: IntrospectionSchemaShape,
  config: ParsedConfig,
): NodeTypeFieldMap[] {
  const { nodeTypeInclude, nodeTypeExclude, attributeExcludeList } = config;
  const schemaTypes = data.__schema.types;
  const queryTypeName = data.__schema.queryType.name;

  const includeSet = new Set(nodeTypeInclude.map((value) => value.toLowerCase()));
  const excludeSet = new Set(nodeTypeExclude.map((value) => value.toLowerCase()));
  const attributeExcludeSet = new Set(attributeExcludeList.map((value) => value.toLowerCase()));

  const queryType = schemaTypes.find((typeEntry) => typeEntry.name === queryTypeName);
  if (!queryType) {
    return [];
  }

  const queryFieldToType = buildQueryFieldToTypeMap(queryType);

  const candidates = schemaTypes.filter((typeEntry) => {
    if (typeEntry.kind !== "OBJECT") {
      return false;
    }
    if (typeEntry.name.startsWith("__") || INTERNAL_TYPES.has(typeEntry.name)) {
      return false;
    }

    return queryFieldToType.has(typeEntry.name);
  });

  return candidates
    .filter((entry) => {
      const normalized = entry.name.toLowerCase();
      if (includeSet.size > 0 && !includeSet.has(normalized)) {
        return false;
      }
      if (excludeSet.has(normalized)) {
        return false;
      }
      return true;
    })
    .map((entry) => {
      const queryField = queryFieldToType.get(entry.name) ?? entry.name;
      const attributes = (entry.fields ?? [])
        .filter(isScalarOrEnum)
        .map((field) => field.name)
        .filter((field) => !attributeExcludeSet.has(field.toLowerCase()));

      return {
        nodeType: entry.name,
        queryField,
        attributes,
      };
    })
    .filter((entry) => entry.attributes.length > 0)
    .sort((a, b) => a.nodeType.localeCompare(b.nodeType));
}

export async function getQueryableNodeTypes(
  client: ApolloClient<unknown>,
  config: ParsedConfig,
): Promise<NodeTypeFieldMap[]> {
  const { endpointUrl } = config;
  const cached = introspectionCache.get(endpointUrl);

  const data =
    cached ??
    (
      await client.query<IntrospectionSchemaShape>({
        query: INTROSPECTION_QUERY,
      })
    ).data;

  if (!cached) {
    introspectionCache.set(endpointUrl, data as IntrospectionData);
  }

  return mapQueryableNodeTypes(data as IntrospectionSchemaShape, config);
}

export function clearIntrospectionCache(): void {
  introspectionCache.clear();
}
