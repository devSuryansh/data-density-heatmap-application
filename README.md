# Data Density Heatmap Application

[![Build](https://img.shields.io/github/actions/workflow/status/devSuryansh/data-density-heatmap-application/ci.yml?branch=main)](https://github.com/devSuryansh/data-density-heatmap-application/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./CHANGELOG.md)
[![Affiliation](https://img.shields.io/badge/D4CG-Chicago%20PCDC-0ea5e9)](https://chicagopcdc.org)

Data Density Heatmap Application is a production-grade, configuration-driven web tool that visualizes GraphQL dataset completeness as an interactive matrix so D4CG / Chicago PCDC researchers and data managers can quickly identify quality gaps and prioritize curation.

![Data Density Heatmap dashboard demo placeholder](public/heatmap-demo-placeholder.png)

## Features

- Introspection-first schema discovery with queryable node filtering
- Scalar/enum attribute extraction with include/exclude controls
- Batched GraphQL record fetching with relay cursor and offset fallback
- Density model based on $density = \frac{nonNullCount}{totalRecords}$
- D3 SVG heatmap with tooltips, transitions, and click callbacks
- Sortable density table with severity badges
- Runtime config panel with persisted settings
- API boundary validation through Zod
- CSV and SVG export controls

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Runtime | Bun 1.1+ |
| Data | GraphQL + Apollo Client |
| Visualization | D3.js v7 |
| Validation | Zod |
| Testing | Vitest + jsdom + coverage-v8 |
| Styling | Tailwind CSS v4 |

## Getting Started

### Prerequisites

- Bun >= 1.1.0
- Node.js >= 18 (for ecosystem tooling compatibility)

### Installation

```bash
bun install --frozen-lockfile
```

### Running Locally

```bash
bun run dev
```

Open http://localhost:3000.

### Environment Variables

Copy `.env.example` to `.env.local` and adjust values:

```bash
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3000/api/graphql
NEXT_PUBLIC_ORG_NAME=D4CG
NEXT_PUBLIC_ORG_LOGO_URL=
```

## Architecture Overview

See [docs/architecture.md](docs/architecture.md) for system diagrams, request flow, design decisions, and roadmap notes.

## Configuration Reference

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `endpointUrl` | `string (url)` | none | GraphQL endpoint used for introspection and record retrieval |
| `nodeTypeInclude` | `string[]` | `[]` | Optional allow-list of node types |
| `nodeTypeExclude` | `string[]` | `[]` | Optional deny-list of node types |
| `attributeExcludeList` | `string[]` | `["id","__typename"]` | Attributes excluded from density computation |
| `maxRecordsPerNode` | `number` | `500` | Max rows to fetch per node type |
| `batchSize` | `number` | `50` | Page/query batch size |
| `orgName` | `string?` | undefined | Branding text used in header |
| `orgLogoUrl` | `string(url)?` | undefined | Optional logo URL |

## API Reference

### `POST /api/heatmap`

Request body: `ConfigSchema`

```json
{
  "endpointUrl": "http://localhost:3000/api/graphql",
  "nodeTypeInclude": [],
  "nodeTypeExclude": [],
  "attributeExcludeList": ["id", "__typename"],
  "maxRecordsPerNode": 500,
  "batchSize": 50,
  "orgName": "D4CG"
}
```

Success response: `HeatmapModel`

```json
{
  "cells": [{ "nodeType": "Patient", "attribute": "age", "density": 0.85, "nonNullCount": 51, "totalRecords": 60 }],
  "nodeTypes": ["Patient", "Sample", "Study"],
  "attributes": ["age", "diagnosisCode", "title"],
  "generatedAt": "2026-03-19T10:30:00.000Z",
  "endpointUrl": "http://localhost:3000/api/graphql"
}
```

Error response:

```json
{
  "error": "Invalid request body.",
  "details": {}
}
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
