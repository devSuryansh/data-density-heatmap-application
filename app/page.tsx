"use client";

import { useMemo, useState } from "react";
import { DEFAULT_DATASET_CONFIG, parseDatasetConfig } from "@/src/config/dataset.config";
import { HeatmapChart } from "@/src/components/heatmap/heatmap-chart";
import { HeatmapLegend } from "@/src/components/heatmap/heatmap-legend";
import { DensityTable } from "@/src/components/heatmap/density-table";
import { useHeatmap } from "@/src/hooks/use-heatmap";

function commaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function HomePage() {
  const [endpoint, setEndpoint] = useState(DEFAULT_DATASET_CONFIG.endpoint);
  const [title, setTitle] = useState(DEFAULT_DATASET_CONFIG.title);
  const [description, setDescription] = useState(DEFAULT_DATASET_CONFIG.description);
  const [nodeInclude, setNodeInclude] = useState("");
  const [nodeExclude, setNodeExclude] = useState(
    (DEFAULT_DATASET_CONFIG.nodeExclude ?? []).join(", "),
  );
  const [fieldExclude, setFieldExclude] = useState(
    (DEFAULT_DATASET_CONFIG.fieldExclude ?? []).join(", "),
  );
  const [configError, setConfigError] = useState<string | null>(null);

  const { data, isLoading, error, analyze } = useHeatmap();

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    return {
      overall: (data.overallDensity * 100).toFixed(2),
      nodes: data.nodeTypes.length,
      attributes: data.attributes.length,
      cells: data.cells.length,
    };
  }, [data]);

  async function handleAnalyze() {
    try {
      const config = parseDatasetConfig({
        title,
        description,
        endpoint,
        headers: {},
        nodeInclude: commaSeparated(nodeInclude),
        nodeExclude: commaSeparated(nodeExclude),
        fieldExclude: commaSeparated(fieldExclude),
        maxRecordsPerNode: DEFAULT_DATASET_CONFIG.maxRecordsPerNode,
        queryBatchSize: DEFAULT_DATASET_CONFIG.queryBatchSize,
      });

      setConfigError(null);
      await analyze(config);
    } catch (validationError) {
      setConfigError(
        validationError instanceof Error
          ? validationError.message
          : "Invalid configuration values.",
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="space-y-2 border-b pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Data Density Heatmap Application</h1>
        <p className="max-w-3xl text-sm text-zinc-600">
          Configuration-driven GraphQL schema analysis for measuring attribute-level data
          completeness across node types.
        </p>
      </header>

      <section className="grid gap-4 rounded border bg-white p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            className="rounded border px-3 py-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          GraphQL Endpoint
          <input
            className="rounded border px-3 py-2"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Description
          <input
            className="rounded border px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Include Node Types (comma-separated)
          <input
            className="rounded border px-3 py-2"
            value={nodeInclude}
            onChange={(event) => setNodeInclude(event.target.value)}
            placeholder="Patient, Specimen"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Exclude Node Types (comma-separated)
          <input
            className="rounded border px-3 py-2"
            value={nodeExclude}
            onChange={(event) => setNodeExclude(event.target.value)}
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1 text-sm">
          Exclude Attributes (comma-separated)
          <input
            className="rounded border px-3 py-2"
            value={fieldExclude}
            onChange={(event) => setFieldExclude(event.target.value)}
          />
        </label>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAnalyze}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? "Analyzing..." : "Analyze Density"}
          </button>

          {summary ? (
            <p className="text-sm text-zinc-600">
              Overall density: <span className="font-semibold text-zinc-900">{summary.overall}%</span>
            </p>
          ) : null}
        </div>

        {configError ? <p className="md:col-span-2 text-sm text-red-700">{configError}</p> : null}
        {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      </section>

      {summary ? (
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Overall</p>
            <p className="text-2xl font-semibold">{summary.overall}%</p>
          </div>
          <div className="rounded border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Node Types</p>
            <p className="text-2xl font-semibold">{summary.nodes}</p>
          </div>
          <div className="rounded border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Attributes</p>
            <p className="text-2xl font-semibold">{summary.attributes}</p>
          </div>
          <div className="rounded border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Matrix Cells</p>
            <p className="text-2xl font-semibold">{summary.cells}</p>
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Heatmap Matrix</h2>
            <HeatmapLegend />
          </div>
          <HeatmapChart data={data} colorMin="#f5f5f4" colorMax="#14532d" />
        </section>
      ) : null}

      {data ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Node Type | Attribute | Density Score</h2>
          <DensityTable data={data} />
        </section>
      ) : null}
    </main>
  );
}
