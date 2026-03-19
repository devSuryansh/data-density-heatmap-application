"use client";

import { useMemo, useState } from "react";
import { DensityTable } from "@/src/components/heatmap/DensityTable";
import { HeatmapChart, HEATMAP_SVG_SELECTOR } from "@/src/components/heatmap/HeatmapChart";
import { HeatmapLegend } from "@/src/components/heatmap/HeatmapLegend";
import { ConfigPanel } from "@/src/components/ui/ConfigPanel";
import { ExportButton } from "@/src/components/ui/ExportButton";
import { OrgHeader } from "@/src/components/ui/OrgHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useHeatmapConfig } from "@/src/hooks/useHeatmapConfig";
import { useHeatmapData } from "@/src/hooks/useHeatmapData";
import type { ParsedConfig } from "@/src/config/schema";

const APP_TITLE = "Data Density Heatmap";

type ActiveTab = "heatmap" | "table";

export default function HeatmapPage(): JSX.Element {
  const { config, setConfig } = useHeatmapConfig();
  const { model, loading, error, status, runAnalysis } = useHeatmapData();
  const [activeTab, setActiveTab] = useState<ActiveTab>("heatmap");

  const lastUpdated = useMemo(() => {
    if (!model?.generatedAt) {
      return undefined;
    }
    return new Date(model.generatedAt).toLocaleString();
  }, [model?.generatedAt]);

  const run = async (nextConfig: ParsedConfig): Promise<void> => {
    setConfig(nextConfig);
    await runAnalysis(nextConfig);
  };

  const testConnection = async (): Promise<void> => {
    await runAnalysis({
      ...config,
      maxRecordsPerNode: 10,
      batchSize: Math.min(10, config.batchSize),
    });
  };

  const onRefresh = async (): Promise<void> => {
    await run(config);
  };

  return (
    <div className="page-enter min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <OrgHeader
        appTitle={APP_TITLE}
        orgName={config.orgName ?? "D4CG"}
        orgLogoUrl={config.orgLogoUrl}
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        isRefreshing={loading}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <ConfigPanel
          config={config}
          onChange={setConfig}
          onTestConnection={testConnection}
          onRunAnalysis={async () => run(config)}
          loading={loading}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              {error ? <span className="text-xs text-[var(--color-danger)]">{error}</span> : null}
            </div>
            <ExportButton model={model} chartSelector={HEATMAP_SVG_SELECTOR} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("heatmap")}
              className={`border px-3 py-1 text-xs ${
                activeTab === "heatmap"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                  : "border-[var(--color-border)]"
              }`}
            >
              Heatmap
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`border px-3 py-1 text-xs ${
                activeTab === "table"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                  : "border-[var(--color-border)]"
              }`}
            >
              Density Table
            </button>
          </div>

          {model ? <HeatmapLegend /> : null}
          {model && activeTab === "heatmap" ? <HeatmapChart model={model} /> : null}
          {model && activeTab === "table" ? <DensityTable model={model} /> : null}
        </section>
      </main>
    </div>
  );
}
