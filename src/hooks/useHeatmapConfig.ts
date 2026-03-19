"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_DATASET_CONFIG } from "@/src/config/dataset.config";
import { ConfigSchema, type ParsedConfig } from "@/src/config/schema";

const STORAGE_KEY = "d4cg-heatmap-config-v1";

function deserializeConfig(raw: string | null): ParsedConfig {
  if (!raw) {
    return DEFAULT_DATASET_CONFIG;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const validated = ConfigSchema.safeParse(parsed);
    if (!validated.success) {
      return DEFAULT_DATASET_CONFIG;
    }
    return validated.data;
  } catch {
    return DEFAULT_DATASET_CONFIG;
  }
}

export function useHeatmapConfig(): {
  config: ParsedConfig;
  setConfig: (next: ParsedConfig) => void;
  updateConfig: (patch: Partial<ParsedConfig>) => void;
  resetConfig: () => void;
} {
  const [config, setConfigState] = useState<ParsedConfig>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_DATASET_CONFIG;
    }

    return deserializeConfig(window.localStorage.getItem(STORAGE_KEY));
  });

  const setConfig = useCallback((next: ParsedConfig) => {
    setConfigState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<ParsedConfig>) => {
      const merged = { ...config, ...patch };
      const validated = ConfigSchema.safeParse(merged);
      if (!validated.success) {
        return;
      }
      setConfig(validated.data);
    },
    [config, setConfig],
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_DATASET_CONFIG);
  }, [setConfig]);

  return useMemo(
    () => ({
      config,
      setConfig,
      updateConfig,
      resetConfig,
    }),
    [config, resetConfig, setConfig, updateConfig],
  );
}
