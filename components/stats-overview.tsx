"use client";

import React from "react";
import type { HeatmapData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface StatsOverviewProps {
  data: HeatmapData;
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const totalCells = data.cells.length;
  const errorCells = data.cells.filter((c) => c.isError).length;
  const highDensity = data.cells.filter((c) => !c.isError && c.density >= 0.8).length;
  const lowDensity = data.cells.filter((c) => !c.isError && c.density < 0.3).length;

  const stats = [
    {
      label: "Overall Completeness",
      value: `${(data.overallDensity * 100).toFixed(1)}%`,
      icon: BarChart3,
      description: `Across ${data.nodeTypes.length} types, ${data.attributes.length} attributes`,
      color: data.overallDensity >= 0.7 ? "text-green-600" : data.overallDensity >= 0.4 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Total Data Points",
      value: totalCells.toLocaleString(),
      icon: Database,
      description: `${data.nodeTypes.length} node types × ${data.attributes.length} max attributes`,
      color: "text-blue-600",
    },
    {
      label: "High Density (≥80%)",
      value: highDensity.toLocaleString(),
      icon: CheckCircle2,
      description: `${((highDensity / Math.max(totalCells - errorCells, 1)) * 100).toFixed(0)}% of data points well-populated`,
      color: "text-green-600",
    },
    {
      label: "Low Density (<30%)",
      value: lowDensity.toLocaleString(),
      icon: AlertTriangle,
      description: `${((lowDensity / Math.max(totalCells - errorCells, 1)) * 100).toFixed(0)}% of data points need attention`,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color} opacity-70`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
