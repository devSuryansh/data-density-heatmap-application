import { describe, expect, it, vi } from "vitest";
import type { ApolloClient } from "@apollo/client";
import { fetchNodeRecords } from "@/src/graphql/fetcher";

const node = {
  nodeType: "Patient",
  queryField: "patient",
  attributes: ["name", "email"],
};

const config = {
  endpointUrl: "http://localhost:3000/api/graphql",
  nodeTypeInclude: [],
  nodeTypeExclude: [],
  attributeExcludeList: ["id", "__typename"],
  maxRecordsPerNode: 5,
  batchSize: 2,
};

describe("fetchNodeRecords", () => {
  it("uses relay pagination when available", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "C" } }],
            pageInfo: { hasNextPage: false, endCursor: "c3" },
          },
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("falls back to offset pagination when relay shape is unsupported", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("returns an empty list when both relay and offset paths produce no records", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: [],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([]);
    expect(query).toHaveBeenCalledTimes(2);
  });
});