# Data Density Heatmap Application

This repository contains a modular MVP for analyzing GraphQL dataset completeness and visualizing it as a heatmap matrix.

It is designed as a practical demonstration for the D4CG / Chicago PCDC context, with an emphasis on clear architecture, maintainability, and correctness.

## What It Does

1. Introspects a GraphQL schema.
1. Discovers queryable node types and scalar/enum attributes.
1. Fetches records in batches using Apollo Client.
1. Computes per-attribute density:

$$
density = \frac{non\_null\_values}{total\_records}
$$

1. Produces a matrix and renders it with D3.js heatmap cells.

## Tech Stack

- Next.js App Router + TypeScript
- Apollo Client
- GraphQL
- D3.js
- Zod
- Vitest

## Architecture

The codebase is organized by responsibilities:

- `app/`
  - API routes and Next.js app entrypoints
  - `app/api/graphql/route.ts`: in-repo GraphQL demo endpoint (supports introspection)
  - `app/api/heatmap/route.ts`: computes heatmap data from runtime config
- `src/config/`
  - config schema + default config + validation
- `src/graphql/`
  - Apollo client setup, schema discovery, batched record fetch
- `src/services/`
  - density calculations and heatmap model transformation
- `src/components/heatmap/`
  - D3 chart, legend, and density table
- `src/hooks/`
  - UI data-fetch orchestration
- `src/types/`
  - shared domain types

## Configuration

Default runtime config lives in `src/config/dataset.config.ts` and is fully validated with Zod.

You can configure:

- endpoint URL
- node type include/exclude filters
- attribute exclude list
- max records per node
- query batch size

At runtime, the UI exposes these controls, and the API validates the config before analysis.

## Running Locally

```bash
npm install
npm run dev
```

App URL:

- `http://localhost:3000`

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## Deployment

Deploy with Vercel:

1. Import this repository into Vercel.
2. Set `NEXT_PUBLIC_GRAPHQL_ENDPOINT` if using a remote GraphQL source.
3. Deploy.

## Design Decisions

- Configuration-driven behavior instead of hardcoded node queries.
- Introspection-based discovery to adapt to changing schemas.
- Batched query execution for fewer round-trips.
- Separation of UI, GraphQL integration, and density logic for maintainability.
- Unit tests on critical transformation logic.
