# Architecture Overview

## System Context Diagram (ASCII)

```text
+-----------------------------+
|         Researcher UI       |
|  Next.js App Router Client  |
+-------------+---------------+
              |
              | POST /api/heatmap (ConfigSchema)
              v
+-------------+---------------+
|     Heatmap API Route       |
|  Zod validate + orchestrate |
+-------------+---------------+
              |
              | Apollo Client
              v
+-------------+---------------+
|   GraphQL Endpoint Layer    |
|  /api/graphql demo or remote|
+-------------+---------------+
              |
              | Introspection + batched fetch
              v
+-------------+---------------+
| Heatmap Service + Density   |
|  model builder + timestamps |
+-------------+---------------+
              |
              | HeatmapModel JSON
              v
+-------------+---------------+
|  D3 Heatmap + Table + Export|
+-----------------------------+
```

## Data Flow Walkthrough

1. UI submits runtime config to `POST /api/heatmap`.
2. API validates payload with Zod `ConfigSchema`.
3. Introspection retrieves schema metadata and finds queryable node types.
4. Batched fetcher loads scalar/enum records per node using `first/after`.
5. If relay pagination fails, fetcher falls back to `limit/offset`.
6. Density service computes `density = nonNullCount / totalRecords`.
7. Heatmap model is returned and rendered by D3 in the client.

## Key Design Decisions

1. Introspection-first vs static config
- Rationale: schema-aware discovery avoids brittle hardcoding and supports evolving datasets.

2. Batched fetching vs single large query
- Rationale: reduces memory spikes, supports progress tracking, and works with large datasets.

3. D3.js vs Recharts/Victory
- Rationale: granular control over SVG joins, transitions, tooltip placement, and matrix rendering.

4. Zod vs manual validation
- Rationale: strong runtime safety at API boundaries with clear error shaping.

5. App Router API routes vs separate backend
- Rationale: simpler deployment, shared TypeScript contracts, and lower ops overhead.

## Known Limitations

- Relay pagination fallback is schema-agnostic and depends on endpoint argument compatibility.
- Progress states are currently coarse in the UI and can be expanded for per-node live labels.
- In-repo demo data is static and not persisted across sessions.

## Roadmap

- Add per-node progress panel with detailed throughput metrics
- Add authentication header support in config panel
- Add persisted historical snapshots for trend analysis
- Add drill-down route for record-level missingness analysis
