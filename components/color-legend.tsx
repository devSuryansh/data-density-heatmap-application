"use client";

import React from "react";
import type { HeatmapData } from "@/lib/types";

interface ColorLegendProps {
  emptyColor: string;
  fullColor: string;
}

export function ColorLegend({ emptyColor, fullColor }: ColorLegendProps) {
  const steps = 10;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground font-medium">0%</span>
      <div className="flex h-5 rounded overflow-hidden">
        {Array.from({ length: steps }).map((_, i) => {
          const t = i / (steps - 1);
          // Interpolate colors
          const color = interpolateColor(emptyColor, fullColor, t);
          return (
            <div
              key={i}
              className="w-6 h-full"
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <span className="text-muted-foreground font-medium">100%</span>
    </div>
  );
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

interface DensityDistributionProps {
  data: HeatmapData;
}

export function DensityDistribution({ data }: DensityDistributionProps) {
  const validCells = data.cells.filter((c) => !c.isError);

  // Create histogram buckets
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    min: i * 10,
    max: (i + 1) * 10,
    count: 0,
  }));

  for (const cell of validCells) {
    const bucketIdx = Math.min(Math.floor(cell.density * 10), 9);
    buckets[bucketIdx].count++;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Density Distribution
      </p>
      <div className="flex items-end gap-1 h-20">
        {buckets.map((bucket) => (
          <div
            key={bucket.min}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(bucket.count / maxCount) * 100}%`,
                minHeight: bucket.count > 0 ? 4 : 0,
                backgroundColor:
                  bucket.min >= 70
                    ? "#16a34a"
                    : bucket.min >= 40
                    ? "#f59e0b"
                    : "#ef4444",
                opacity: 0.8,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
