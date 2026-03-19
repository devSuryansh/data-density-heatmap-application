"use client";

import { useCallback, useMemo, useState } from "react";
import { ConfigSchema, type ParsedConfig } from "@/src/config/schema";
import type { HeatmapModel, StatusInfo } from "@/src/types";

interface HeatmapApiError {
  error: string;
  details?: unknown;
}

const STATUS_LABELS = {
  idle: "idle",
  connecting: "connecting",
  introspecting: "introspecting",
  fetching: "fetching",
  computing: "computing",
  ready: "ready",
  error: "error",
} as const;

export function useHeatmapData(): {
  model: HeatmapModel | null;
  loading: boolean;
  error: string | null;
  status: StatusInfo;
  runAnalysis: (config: ParsedConfig) => Promise<void>;
} {
  const [model, setModel] = useState<HeatmapModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusInfo>({ state: "idle", label: STATUS_LABELS.idle });

  const runAnalysis = useCallback(async (config: ParsedConfig) => {
    setLoading(true);
    setError(null);
    setStatus({ state: "connecting", label: STATUS_LABELS.connecting });

    const parsed = ConfigSchema.safeParse(config);
    if (!parsed.success) {
      setError("Invalid configuration.");
      setStatus({ state: "error", label: STATUS_LABELS.error });
      setLoading(false);
      return;
    }

    try {
      setStatus({ state: "introspecting", label: STATUS_LABELS.introspecting });
      const response = await fetch("/api/heatmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const failure = (await response.json()) as HeatmapApiError;
        throw new Error(failure.error || "Heatmap request failed.");
      }

      setStatus({ state: "computing", label: STATUS_LABELS.computing });
      const payload = (await response.json()) as HeatmapModel;
      setModel(payload);
      setStatus({ state: "ready", label: STATUS_LABELS.ready });
    } catch (requestError) {
      setStatus({ state: "error", label: STATUS_LABELS.error });
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({
      model,
      loading,
      error,
      status,
      runAnalysis,
    }),
    [error, loading, model, runAnalysis, status],
  );
}
