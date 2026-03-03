"use client";

import React from "react";
import type { HeatmapData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodeTypeDetailProps {
  data: HeatmapData;
}

function getDensityColor(density: number): string {
  if (density >= 0.8) return "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950";
  if (density >= 0.5) return "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
  return "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950";
}

function getDensityBadgeVariant(density: number): "default" | "secondary" | "destructive" | "outline" {
  if (density >= 0.8) return "default";
  if (density >= 0.5) return "secondary";
  return "destructive";
}

export function NodeTypeDetail({ data }: NodeTypeDetailProps) {
  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-6 pr-4">
        {data.nodeTypes.map((typeName) => {
          const typeDensity = data.nodeTypeDensities[typeName] || 0;
          const typeCells = data.cells.filter((c) => c.nodeType === typeName);
          const totalRecords = typeCells[0]?.totalCount || 0;

          return (
            <div key={typeName} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{typeName}</h3>
                  <Badge variant={getDensityBadgeVariant(typeDensity)}>
                    {(typeDensity * 100).toFixed(1)}%
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {totalRecords.toLocaleString()} records
                </span>
              </div>

              {/* Overall bar */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${typeDensity * 100}%`,
                    backgroundColor:
                      typeDensity >= 0.8
                        ? "#16a34a"
                        : typeDensity >= 0.5
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>

              {/* Attribute breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {typeCells
                  .sort((a, b) => b.density - a.density)
                  .map((cell) => (
                    <div
                      key={`${cell.nodeType}-${cell.attribute}`}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm ${getDensityColor(
                        cell.density
                      )}`}
                    >
                      <span className="truncate mr-2">{cell.attribute}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${cell.density * 100}%`,
                              backgroundColor: "currentColor",
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold w-10 text-right">
                          {(cell.density * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
