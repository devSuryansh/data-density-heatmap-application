"use client";

import React, { useState, useCallback } from "react";
import type { HeatmapConfig, HeatmapData, DisplayOptions, DensityCell, FetchState } from "@/lib/types";
import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/types";
import { DEMO_CONFIG } from "@/lib/config";
import { generateDemoData } from "@/lib/demo-data";
import { fetchHeatmapData } from "@/lib/graphql-client";

import { HeatmapChart } from "@/components/heatmap-chart";
import { StatsOverview } from "@/components/stats-overview";
import { NodeTypeDetail } from "@/components/node-type-detail";
import { DisplayControls } from "@/components/display-controls";
import { ConfigEditor } from "@/components/config-editor";
import { ColorLegend, DensityDistribution } from "@/components/color-legend";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Settings2,
  BarChart3,
  Grid3X3,
  List,
  Loader2,
  Database,
  Wifi,
  WifiOff,
  Download,
} from "lucide-react";

type DataMode = "demo" | "live";

export default function HeatmapApp() {
  const [config, setConfig] = useState<HeatmapConfig>(DEMO_CONFIG);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(() => generateDemoData(DEMO_CONFIG));
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);
  const [dataMode, setDataMode] = useState<DataMode>("demo");
  const [fetchState, setFetchState] = useState<FetchState>({
    isLoading: false,
    error: null,
    progress: 0,
    currentNodeType: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCell, setSelectedCell] = useState<DensityCell | null>(null);

  const handleFetchLiveData = useCallback(async () => {
    setFetchState({ isLoading: true, error: null, progress: 0, currentNodeType: null });
    setDataMode("live");

    try {
      const data = await fetchHeatmapData(config, (progress, currentType) => {
        setFetchState((prev) => ({
          ...prev,
          progress,
          currentNodeType: currentType,
        }));
      });
      setHeatmapData(data);
      setFetchState({ isLoading: false, error: null, progress: 100, currentNodeType: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setFetchState({ isLoading: false, error: message, progress: 0, currentNodeType: null });
    }
  }, [config]);

  const handleLoadDemo = useCallback(() => {
    setDataMode("demo");
    setConfig(DEMO_CONFIG);
    const demoData = generateDemoData(DEMO_CONFIG);
    setHeatmapData(demoData);
    setFetchState({ isLoading: false, error: null, progress: 0, currentNodeType: null });
  }, []);

  const handleConfigApply = useCallback((newConfig: HeatmapConfig) => {
    setConfig(newConfig);
    const demoData = generateDemoData(newConfig);
    setHeatmapData(demoData);
    setDataMode("demo");
  }, []);

  const handleCellClick = useCallback((cell: DensityCell) => {
    setSelectedCell(cell);
  }, []);

  const handleExportData = useCallback(() => {
    if (!heatmapData) return;
    const exportData = {
      config: { title: config.title, endpoint: config.endpoint },
      data: heatmapData,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heatmap-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [heatmapData, config]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-bold text-lg leading-tight">Data Density Heatmap</h1>
                <p className="text-xs text-muted-foreground">Dataset Quality Visualization</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={dataMode === "live" ? "default" : "secondary"} className="gap-1">
                {dataMode === "live" ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {dataMode === "live" ? "Live" : "Demo"}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadDemo}
                disabled={fetchState.isLoading}
              >
                <Database className="h-3.5 w-3.5 mr-1" />
                Demo Data
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleFetchLiveData}
                disabled={fetchState.isLoading}
              >
                {fetchState.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                {fetchState.isLoading ? "Fetching..." : "Fetch Live Data"}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar during fetch */}
          {fetchState.isLoading && (
            <div className="pb-2 space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${fetchState.progress}%` }}
                />
              </div>
              {fetchState.currentNodeType && (
                <p className="text-xs text-muted-foreground">
                  Fetching: {fetchState.currentNodeType}...
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Title & description */}
            <div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              {config.description && (
                <p className="text-muted-foreground mt-1">{config.description}</p>
              )}
              {heatmapData && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {heatmapData.lastUpdated.toLocaleString()}
                </p>
              )}
            </div>

            {/* Error display */}
            {fetchState.error && (
              <Card className="border-destructive">
                <CardContent className="p-4">
                  <p className="text-sm text-destructive">{fetchState.error}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats overview */}
            {heatmapData && <StatsOverview data={heatmapData} />}

            {/* Main visualization tabs */}
            {heatmapData && (
              <Tabs defaultValue="heatmap" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="heatmap" className="gap-1.5">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Heatmap
                    </TabsTrigger>
                    <TabsTrigger value="details" className="gap-1.5">
                      <List className="h-3.5 w-3.5" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="distribution" className="gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Distribution
                    </TabsTrigger>
                  </TabsList>

                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export
                  </Button>
                </div>

                <TabsContent value="heatmap">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Data Density Heatmap</CardTitle>
                          <CardDescription>
                            Each cell shows the percentage of non-null values for the attribute
                            across all records of the node type.
                          </CardDescription>
                        </div>
                        <ColorLegend
                          emptyColor={displayOptions.colorScheme.emptyColor}
                          fullColor={displayOptions.colorScheme.fullColor}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <HeatmapChart
                        data={heatmapData}
                        options={displayOptions}
                        onCellClick={handleCellClick}
                      />
                    </CardContent>
                  </Card>

                  {/* Selected cell detail */}
                  {selectedCell && (
                    <Card className="mt-4">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {selectedCell.nodeType} &rarr; {selectedCell.attribute}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedCell.filledCount.toLocaleString()} of{" "}
                              {selectedCell.totalCount.toLocaleString()} records have data (
                              {(selectedCell.density * 100).toFixed(1)}% complete)
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCell(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="details">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Node Type Details</CardTitle>
                      <CardDescription>
                        Detailed breakdown of data density by node type and attribute.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <NodeTypeDetail data={heatmapData} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="distribution">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Density Distribution</CardTitle>
                      <CardDescription>
                        Distribution of data density values across all data points.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DensityDistribution data={heatmapData} />

                      <Separator className="my-6" />

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Per-Node-Type Averages</h4>
                        <div className="space-y-2">
                          {Object.entries(heatmapData.nodeTypeDensities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([typeName, density]) => (
                              <div key={typeName} className="flex items-center gap-3">
                                <span className="text-sm w-36 truncate">{typeName}</span>
                                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${density * 100}%`,
                                      backgroundColor:
                                        density >= 0.8
                                          ? "#16a34a"
                                          : density >= 0.5
                                          ? "#f59e0b"
                                          : "#ef4444",
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-mono w-12 text-right">
                                  {(density * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Settings sidebar */}
          {showSettings && (
            <aside className="w-80 shrink-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Display Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <DisplayControls options={displayOptions} onChange={setDisplayOptions} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configuration</CardTitle>
                  <CardDescription>
                    Configure the GraphQL endpoint and node types.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfigEditor currentConfig={config} onApply={handleConfigApply} />
                </CardContent>
              </Card>
            </aside>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Data Density Heatmap Application — Configuration-driven visualization from GraphQL endpoints
          </p>
        </div>
      </footer>
    </div>
  );
}
