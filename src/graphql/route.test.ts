import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/graphql/route";

describe("demo GraphQL API route", () => {
  it("returns 400 when query is missing", async () => {
    const request = new Request("http://localhost:3000/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variables: {} }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { errors?: Array<{ message: string }> };

    expect(response.status).toBe(400);
    expect(payload.errors?.[0]?.message).toContain("Missing GraphQL query");
  });

  it("returns data for a valid query including nested objects", async () => {
    const request = new Request("http://localhost:3000/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "{ patients(limit: 1, offset: 0) { id name email contact { preferredChannel timezone } } }",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      data?: {
        patients?: Array<Record<string, unknown>>;
      };
      errors?: Array<{ message: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.errors).toBeUndefined();
    expect(Array.isArray(payload.data?.patients)).toBe(true);
    expect(payload.data?.patients?.[0]).toHaveProperty("id");
    expect(payload.data?.patients?.[0]).toHaveProperty("contact");
  });

  it("returns 400 for invalid GraphQL field selection", async () => {
    const request = new Request("http://localhost:3000/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ patients(limit: 1) { id doesNotExist } }",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { errors?: Array<{ message: string }> };

    expect(response.status).toBe(400);
    expect(payload.errors?.length).toBeGreaterThan(0);
  });
});