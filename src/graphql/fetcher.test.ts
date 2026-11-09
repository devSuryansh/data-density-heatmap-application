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

  it("handles normal offset pagination with unique identifiers correctly", async () => {
    const query = vi
      .fn()
      // Relay unsupported
      .mockResolvedValueOnce({
        data: { patient: [{ id: "1", name: "A" }] },
        errors: undefined,
      })
      // Offset page 1 (offset 0)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
        },
        errors: undefined,
      })
      // Offset page 2 (offset 2)
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "3", name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ]);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("defensively removes overlapping duplicate records caused by insertion-induced offset shifts", async () => {
    const query = vi
      .fn()
      // Relay unsupported
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay unsupported" }],
      })
      // Offset page 1 (offset 0, limit 2): returns A (id:1) and B (id:2)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
        },
        errors: undefined,
      })
      // An insertion shifts records; offset page 2 (offset 2, limit 2) returns B (id:2) and C (id:3)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "2", name: "B" },
            { id: "3", name: "C" },
          ],
        },
        errors: undefined,
      })
      // Offset page 3 (offset 4, limit 2): end of collection
      .mockResolvedValueOnce({
        data: {
          patient: [],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    // B must appear only once despite overlapping response across pages
    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ]);
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(rows.length);
    expect(ids.filter((id) => id === "2")).toHaveLength(1);
  });

  it("preserves identical records with different unique IDs without false deduplication", async () => {
    const query = vi
      .fn()
      // Relay unsupported
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay unsupported" }],
      })
      // Two records with identical data attributes but distinct IDs
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "Smith", age: 30 },
            { id: "2", name: "Smith", age: 30 },
          ],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "3", name: "Jones", age: 40 }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toHaveLength(3);
    expect(rows).toEqual([
      { id: "1", name: "Smith", age: 30 },
      { id: "2", name: "Smith", age: 30 },
      { id: "3", name: "Jones", age: 40 },
    ]);
  });

  it("verifies and documents the limitation that deletion-induced offset shifts cause skipped records", async () => {
    const query = vi
      .fn()
      // Relay unsupported
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay unsupported" }],
      })
      // Page 1 (offset 0): returns A (id:1) and B (id:2)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
        },
        errors: undefined,
      })
      // A deletion occurs before offset 2, shifting C (id:3) to index 1.
      // Page 2 (offset 2) therefore returns D (id:4), and C is skipped by the backend.
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "4", name: "D" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    // Documents fundamental offset limitation: skipped record C cannot be recovered client-side without backend snapshot support
    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "4", name: "D" },
    ]);
    expect(rows.some((r) => r.id === "3")).toBe(false);
  });

  it("preserves identical records when unique identifiers are missing without heuristic attribute deduplication", async () => {
    const query = vi
      .fn()
      // Relay unsupported
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay unsupported" }],
      })
      // Records without unique IDs (e.g. when 'id' is excluded)
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "A" }],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "B" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    // Legitimate identical rows must NOT be falsely deduplicated when unique IDs are missing
    expect(rows).toEqual([{ name: "A" }, { name: "A" }, { name: "B" }]);
  });

  it("prevents duplicate records when relay fails mid-stream and falls back to offset pagination", async () => {
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
        data: { patient: null },
        errors: [{ message: "Relay pagination error" }],
      })
      // Offset fallback page 1 (offset 0): returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      // Offset fallback page 2 (offset 2): returns C
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("returns more complete relay records when relay retrieves more records than offset fallback before offset fails", async () => {
    const query = vi
      .fn()
      // Relay page 1: returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { name: "A" } }, { node: { name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2: returns C
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
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Offset fallback page 1 (offset 0): returns A, B
      .mockResolvedValueOnce({
        data: {
          patient: [{ name: "A" }, { name: "B" }],
        },
        errors: undefined,
      })
      // Offset fallback page 2: fails with error
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Offset failed" }],
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
    expect(query).toHaveBeenCalledTimes(5);
  });

  it("does not discard relay-only records when fallback returns different records of the same count", async () => {
    const query = vi
      .fn()
      // Relay returns records A and B
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }, { node: { id: "2", name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Fallback returns C and D (same count: 2, but completely different records)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "3", name: "C" },
            { id: "4", name: "D" },
          ],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: { patient: [] },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    // Relay records 1 and 2 must not be discarded; non-duplicate fallback records are merged
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).toContain("4");
    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
      { id: "4", name: "D" },
    ]);
  });

  it("safely selects fallback results when fallback genuinely covers all relay records", async () => {
    const query = vi
      .fn()
      // Relay returns records 1 and 2
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }, { node: { id: "2", name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Fallback page 1 returns 1 and 2 (covers Relay)
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
        },
        errors: undefined,
      })
      // Fallback page 2 returns 3
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "3", name: "C" }],
        },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ]);
  });

  it("preserves available relay records when the first offset fallback request rejects with a network error", async () => {
    const query = vi
      .fn()
      // Relay returns records A and B
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }, { node: { id: "2", name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // First offset request rejects with network error
      .mockRejectedValueOnce(new Error("Network connection dropped"));

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    // Relay records must not be discarded due to offset network failure
    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
  });

  it("preserves collected records when a later offset fallback request rejects with a network error", async () => {
    const query = vi
      .fn()
      // Relay returns records A
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }],
            pageInfo: { hasNextPage: true, endCursor: "c1" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Offset page 1 succeeds: returns A and B
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
        },
        errors: undefined,
      })
      // Offset page 2 rejects with network error
      .mockRejectedValueOnce(new Error("Timeout on page 2"));

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config);

    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
  });

  it("re-throws network error when offset fails and no records were previously obtained", async () => {
    const query = vi
      .fn()
      // Relay fails on first page
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay unsupported" }],
      })
      // Offset fails with network error on first request
      .mockRejectedValueOnce(new Error("GraphQL server offline"));

    const client = { query } as unknown as ApolloClient<unknown>;

    await expect(fetchNodeRecords(client, node, config)).rejects.toThrow(
      "GraphQL server offline",
    );
  });

  it("ensures progress reporting is strictly monotonic and never moves backward during fallback", async () => {
    const progressHistory: number[] = [];
    const onProgress = (_nodeType: string, fetched: number) => {
      progressHistory.push(fetched);
    };

    const query = vi
      .fn()
      // Relay page 1 returns 2 records
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }, { node: { id: "2", name: "B" } }],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Fallback page 1 returns 1 record (must not regress progress to 1)
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "1", name: "A" }],
        },
        errors: undefined,
      })
      // Fallback page 2 returns records 2 and 3
      .mockResolvedValueOnce({
        data: {
          patient: [
            { id: "2", name: "B" },
            { id: "3", name: "C" },
          ],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: { patient: [] },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config, onProgress);

    // Progress must never decrease
    for (let i = 1; i < progressHistory.length; i++) {
      expect(progressHistory[i]).toBeGreaterThanOrEqual(progressHistory[i - 1]);
    }
    // Final progress must be at least the returned record count
    const lastProgress = progressHistory[progressHistory.length - 1];
    expect(lastProgress).toBeGreaterThanOrEqual(rows.length);
  });

  it("ensures final progress is at least the returned record count even when records are merged", async () => {
    const progressHistory: number[] = [];
    const onProgress = (_nodeType: string, fetched: number) => {
      progressHistory.push(fetched);
    };

    const query = vi
      .fn()
      // Relay returns record 1
      .mockResolvedValueOnce({
        data: {
          patient: {
            edges: [{ node: { id: "1", name: "A" } }],
            pageInfo: { hasNextPage: true, endCursor: "c1" },
          },
        },
        errors: undefined,
      })
      // Relay page 2 fails
      .mockResolvedValueOnce({
        data: { patient: null },
        errors: [{ message: "Relay failed" }],
      })
      // Fallback returns record 2
      .mockResolvedValueOnce({
        data: {
          patient: [{ id: "2", name: "B" }],
        },
        errors: undefined,
      })
      .mockResolvedValueOnce({
        data: { patient: [] },
        errors: undefined,
      });

    const client = { query } as unknown as ApolloClient<unknown>;
    const rows = await fetchNodeRecords(client, node, config, onProgress);

    expect(rows).toHaveLength(2);
    const lastProgress = progressHistory[progressHistory.length - 1];
    expect(lastProgress).toBeGreaterThanOrEqual(rows.length);
  });
});
