"use client";

import React, { useState } from "react";
import type { HeatmapConfig } from "@/lib/types";
import { parseConfig, generateConfigTemplate } from "@/lib/config";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Upload,
  FileJson,
} from "lucide-react";

interface ConfigEditorProps {
  currentConfig: HeatmapConfig;
  onApply: (config: HeatmapConfig) => void;
}

export function ConfigEditor({ currentConfig, onApply }: ConfigEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(currentConfig, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Quick settings
  const [endpoint, setEndpoint] = useState(currentConfig.endpoint);
  const [title, setTitle] = useState(currentConfig.title);

  const handleValidate = () => {
    try {
      parseConfig(jsonText);
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid configuration");
      setSuccess(false);
    }
  };

  const handleApply = () => {
    try {
      const config = parseConfig(jsonText);
      setError(null);
      onApply(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid configuration");
    }
  };

  const handleQuickApply = () => {
    try {
      const config = { ...currentConfig, endpoint, title };
      onApply(config);
      setJsonText(JSON.stringify(config, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error applying changes");
    }
  };

  const handleLoadTemplate = () => {
    setJsonText(generateConfigTemplate());
    setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      try {
        parseConfig(text);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid configuration file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="quick">
        <TabsList className="w-full">
          <TabsTrigger value="quick" className="flex-1">
            Quick Settings
          </TabsTrigger>
          <TabsTrigger value="json" className="flex-1">
            JSON Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="config-title">Title</Label>
            <Input
              id="config-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Heatmap title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-endpoint">GraphQL Endpoint</Label>
            <Input
              id="config-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-api.com/graphql"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Current Configuration:</p>
            <p>{currentConfig.nodeTypes.length} node types configured</p>
            <p>
              {currentConfig.nodeTypes.reduce((sum, nt) => sum + nt.attributes.length, 0)} total
              attributes
            </p>
          </div>

          <Button onClick={handleQuickApply} className="w-full">
            Apply Quick Settings
          </Button>
        </TabsContent>

        <TabsContent value="json" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
              <FileJson className="h-3.5 w-3.5 mr-1" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <Textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            className="font-mono text-xs min-h-[300px]"
            placeholder="Paste your configuration JSON here..."
          />

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950 rounded-md p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Configuration is valid!</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleValidate} className="flex-1">
              Validate
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Configuration
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
