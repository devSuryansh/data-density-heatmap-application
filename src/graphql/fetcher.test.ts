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

  it("does not duplicate records when relay fails on a subsequent page and falls back to offset pagination", async () => {
    const query = vi
      .fn()
      // Relay page 1: returns A, B; hasNextPage: true
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2: fails with error or unsupported shape
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: [{ message: "Relay pagination failed midway" }],
      })
      // Offset fallback request at offset 0: returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      // Offset fallback request at offset 2: returns C
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    const names = rows.map((row) => row.name);
    expect(new Set(names).size).toBe(rows.length);
    expect(names.filter((n) => n === "A")).toHaveLength(1);
    expect(names.filter((n) => n === "B")).toHaveLength(1);
    expect(names.filter((n) => n === "C")).toHaveLength(1);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("recovers without duplicate records when relay response shape is malformed on a subsequent page", async () => {
    const query = vi
      .fn()
      // Relay page 1: returns A, B; hasNextPage: true
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2: malformed response (edges missing or not an array)
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: null,
            pageInfo: { hasNextPage: true, endCursor: "c3" },
          },
        },
        errors: undefined,
      })
      // Offset fallback request at offset 0: returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      // Offset fallback request at offset 2: returns C
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    const names = rows.map((row) => row.name);
    expect(new Set(names).size).toBe(rows.length);
    expect(names.filter((n) => n === "A")).toHaveLength(1);
    expect(names.filter((n) => n === "B")).toHaveLength(1);
    expect(names.filter((n) => n === "C")).toHaveLength(1);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("preserves partial relay records if relay fails midway and offset fallback returns no records", async () => {
    const query = vi
      .fn()
      // Relay page 1: returns A, B; hasNextPage: true
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2: fails
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: [{ message: "Relay pagination failed midway" }],
      })
      // Offset fallback request at offset 0: fails with errors
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: [{ message: "Offset pagination not supported" }],
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }]);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("returns more complete relay records when relay retrieves more records than offset fallback before offset fails", async () => {
    const query = vi
      .fn()
      // Relay page 1: returns A, B; hasNextPage: true
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2: returns C; hasNextPage: true
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "C" } }],
            pageInfo: { hasNextPage: true, endCursor: "c3" },
          },
        },
        errors: undefined,
      })
      // Relay page 3: fails
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: [{ message: "Relay pagination failed midway" }],
      })
      // Offset fallback request at offset 0: returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      // Next offset request at offset 2: fails
      .mockResolvedValueOnce({
        data: {
          patient: null,
        },
        errors: [{ message: "Offset pagination network failure" }],
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    expect(query).toHaveBeenCalledTimes(5);
  });
});
