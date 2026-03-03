# Data Density Heatmap Application

A web-based heatmap visualization tool that represents the completeness and distribution of data across datasets. The application displays data "density" by GraphQL node types and their specific attributes, enabling users to quickly identify areas with high or low data availability.

## Features

- **Interactive D3.js Heatmap** — Color-coded cells showing data completeness (0%–100%) per node type and attribute, with hover tooltips revealing detailed stats
- **Configuration-Driven** — Supply a JSON configuration pointing to any GraphQL endpoint with custom node types and attributes
- **Live GraphQL Fetching** — Connect to real GraphQL endpoints and compute density in real-time with progress tracking
- **Built-in Demo Mode** — Ships with realistic clinical trials demo data (Patient, Specimen, Genomic Profile, Treatment, Diagnosis, Imaging)
- **Multiple Views** — Heatmap, detailed per-node breakdowns, and density distribution charts
- **Display Controls** — Toggle value labels, summary bars, sort by density, adjust cell size, and pick from multiple color schemes
- **JSON Config Editor** — In-app editor with validation, template generation, and file import
- **Data Export** — Export heatmap data as JSON for external analysis
- **Responsive UI** — Built with ShadCN UI components, Tailwind CSS, and dark mode support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Runtime | Bun |
| Visualization | D3.js |
| Styling | Tailwind CSS v4 |
| UI Components | ShadCN UI (Radix primitives) |
| Data Layer | GraphQL (graphql-request) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+

### Install & Run

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build for production
bun run build

# Start production server
bun start
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Configuration

The application is configuration-driven. Create a JSON config to connect to your own GraphQL endpoint:

```json
{
  "title": "My Dataset — Data Density",
  "description": "Describe your dataset",
  "endpoint": "https://your-graphql-endpoint.com/graphql",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "nodeTypes": [
    {
      "typeName": "Patient",
      "displayName": "Patient",
      "query": "query { patients { id name age gender } }",
      "dataPath": "patients",
      "attributes": [
        { "fieldName": "name", "displayName": "Name" },
        { "fieldName": "age", "displayName": "Age" },
        { "fieldName": "gender", "displayName": "Gender" }
      ]
    }
  ]
}
```

Paste this into the **JSON Editor** tab in the settings sidebar, or import a `.json` file.

## Project Structure

```
├── app/
│   ├── api/graphql/route.ts   # Mock GraphQL API for demo data
│   ├── globals.css             # Tailwind + ShadCN theme
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main application page
├── components/
│   ├── ui/                     # ShadCN UI components
│   ├── heatmap-chart.tsx       # D3.js heatmap visualization
│   ├── stats-overview.tsx      # Summary statistics cards
│   ├── node-type-detail.tsx    # Per-node-type detail view
│   ├── display-controls.tsx    # Visualization settings panel
│   ├── config-editor.tsx       # Configuration JSON editor
│   └── color-legend.tsx        # Color legend & distribution chart
├── lib/
│   ├── types.ts                # TypeScript type definitions
│   ├── config.ts               # Configuration parsing & validation
│   ├── graphql-client.ts       # GraphQL client & density computation
│   ├── demo-data.ts            # Demo data generator
│   └── utils.ts                # Utility functions (cn)
```

## License

MIT
