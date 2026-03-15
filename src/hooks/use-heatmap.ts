"use client";

import { useCallback, useState } from "react";
import type { DatasetConfig, HeatmapResult } from "@/src/types/heatmap";

interface HeatmapState {
  data: HeatmapResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useHeatmap() {
  const [state, setState] = useState<HeatmapState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const analyze = useCallback(async (config: DatasetConfig) => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/heatmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const payload = (await response.json()) as HeatmapResult | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Unknown API error");
      }

      setState({
        data: payload,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Request failed",
      });
    }
  }, []);

  return {
    ...state,
    analyze,
  };
}
