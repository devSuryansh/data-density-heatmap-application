import { describe, expect, it } from "vitest";
import { mapQueryableNodeTypes } from "@/src/graphql/introspection";

const baseConfig = {
  endpointUrl: "https://example.org/graphql",
  nodeTypeInclude: [],
  nodeTypeExclude: [],
  attributeExcludeList: ["id", "__typename"],
  maxRecordsPerNode: 500,
  batchSize: 50,
};

const schemaFixture = {
  __schema: {
    queryType: {
      name: "Query",
    },
    types: [
      {
        kind: "OBJECT",
        name: "Query",
        fields: [
          {
            name: "patient",
            type: {
              kind: "OBJECT",
              name: "Patient",
            },
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "Patient",
        fields: [
          {
            name: "id",
            type: { kind: "SCALAR", name: "String" },
          },
          {
            name: "gender",
            type: { kind: "SCALAR", name: "String" },
          },
          {
            name: "status",
            type: { kind: "ENUM", name: "PatientStatus" },
          },
          {
            name: "samples",
            type: { kind: "OBJECT", name: "Sample" },
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "UnqueryableType",
        fields: [{ name: "value", type: { kind: "SCALAR", name: "String" } }],
      },
      {
        kind: "OBJECT",
        name: "__Schema",
        fields: [],
      },
    ],
  },
};

describe("introspection", () => {
  it("internal __ types are filtered out", () => {
    const mapped = mapQueryableNodeTypes(schemaFixture, baseConfig);
    const internalPresent = mapped.some((item) => item.nodeType.startsWith("__"));
    expect(internalPresent).toBe(false);
  });

  it("non-queryable types are excluded", () => {
    const mapped = mapQueryableNodeTypes(schemaFixture, baseConfig);
    const hasUnqueryable = mapped.some((item) => item.nodeType === "UnqueryableType");
    expect(hasUnqueryable).toBe(false);
  });

  it("non-scalar fields are excluded", () => {
    const mapped = mapQueryableNodeTypes(schemaFixture, baseConfig);
    const patient = mapped.find((item) => item.nodeType === "Patient");
    expect(patient?.attributes).toEqual(["gender", "status"]);
  });

  it("prefers relay query field over list query field for the same type", () => {
    const mapped = mapQueryableNodeTypes(
      {
        __schema: {
          queryType: { name: "Query" },
          types: [
            {
              kind: "OBJECT",
              name: "Query",
              fields: [
                {
                  name: "patient",
                  args: [{ name: "first" }, { name: "after" }],
                  type: {
                    kind: "OBJECT",
                    name: "PatientConnection",
                  },
                },
                {
                  name: "patients",
                  args: [{ name: "limit" }, { name: "offset" }],
                  type: {
                    kind: "LIST",
                    name: null,
                    ofType: {
                      kind: "OBJECT",
                      name: "Patient",
                    },
                  },
                },
              ],
            },
            {
              kind: "OBJECT",
              name: "Patient",
              fields: [
                { name: "id", type: { kind: "SCALAR", name: "String" } },
                { name: "gender", type: { kind: "SCALAR", name: "String" } },
              ],
            },
            {
              kind: "OBJECT",
              name: "PatientConnection",
              fields: [],
            },
          ],
        },
      },
      baseConfig,
    );

    expect(mapped).toEqual([
      {
        nodeType: "Patient",
        queryField: "patient",
        attributes: ["gender"],
      },
    ]);
  });
});
