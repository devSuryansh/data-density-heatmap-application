"use client";

import type { ParsedConfig } from "@/src/config/schema";

interface ConfigPanelProps {
  config: ParsedConfig;
  onChange: (next: ParsedConfig) => void;
  onTestConnection: () => Promise<void>;
  onRunAnalysis: () => Promise<void>;
  loading: boolean;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function ConfigPanel({
  config,
  onChange,
  onTestConnection,
  onRunAnalysis,
  loading,
}: ConfigPanelProps): JSX.Element {
  const update = <K extends keyof ParsedConfig>(key: K, value: ParsedConfig[K]): void => {
    onChange({ ...config, [key]: value });
  };

  return (
    <aside className="panel-enter h-fit border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-4 font-mono text-sm uppercase tracking-wide text-[var(--color-text)]">Configuration</h2>
      <div className="space-y-3 text-sm">
        <label className="block text-[var(--color-text-muted)]">
          Endpoint URL
          <input
            value={config.endpointUrl}
            onChange={(event) => update("endpointUrl", event.target.value)}
            className="mt-1 w-full border border-[var(--color-border)] bg-[#11141c] px-2 py-1.5 text-[var(--color-text)]"
          />
        </label>

        <button
          type="button"
          onClick={onTestConnection}
          className="w-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)]"
        >
          Test Connection
        </button>

        <label className="block text-[var(--color-text-muted)]">
          Include node types
          <input
            value={config.nodeTypeInclude.join(", ")}
            onChange={(event) => update("nodeTypeInclude", parseTags(event.target.value))}
            className="mt-1 w-full border border-[var(--color-border)] bg-[#11141c] px-2 py-1.5 text-[var(--color-text)]"
          />
        </label>

        <label className="block text-[var(--color-text-muted)]">
          Exclude node types
          <input
            value={config.nodeTypeExclude.join(", ")}
            onChange={(event) => update("nodeTypeExclude", parseTags(event.target.value))}
            className="mt-1 w-full border border-[var(--color-border)] bg-[#11141c] px-2 py-1.5 text-[var(--color-text)]"
          />
        </label>

        <label className="block text-[var(--color-text-muted)]">
          Exclude attributes
          <input
            value={config.attributeExcludeList.join(", ")}
            onChange={(event) => update("attributeExcludeList", parseTags(event.target.value))}
            className="mt-1 w-full border border-[var(--color-border)] bg-[#11141c] px-2 py-1.5 text-[var(--color-text)]"
          />
        </label>

        <label className="block text-[var(--color-text-muted)]">
          Max records per node ({config.maxRecordsPerNode})
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={config.maxRecordsPerNode}
            onChange={(event) => update("maxRecordsPerNode", Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-[var(--color-text-muted)]">
          Batch size ({config.batchSize})
          <input
            type="range"
            min={10}
            max={200}
            step={1}
            value={config.batchSize}
            onChange={(event) => update("batchSize", Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={loading}
          className="w-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Running..." : "Run Analysis"}
        </button>
      </div>
    </aside>
  );
}
