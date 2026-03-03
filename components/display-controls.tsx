"use client";

import React from "react";
import type { DisplayOptions, ColorScheme } from "@/lib/types";
import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

interface DisplayControlsProps {
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
}

const COLOR_PRESETS: Record<string, ColorScheme> = {
  "Red → Green": {
    emptyColor: "#fee2e2",
    fullColor: "#16a34a",
    nullColor: "#e5e7eb",
    steps: 10,
  },
  "Blue Sequential": {
    emptyColor: "#eff6ff",
    fullColor: "#1d4ed8",
    nullColor: "#e5e7eb",
    steps: 10,
  },
  "Purple Sequential": {
    emptyColor: "#faf5ff",
    fullColor: "#7c3aed",
    nullColor: "#e5e7eb",
    steps: 10,
  },
  "Warm (Yellow → Red)": {
    emptyColor: "#fefce8",
    fullColor: "#dc2626",
    nullColor: "#e5e7eb",
    steps: 10,
  },
  "Cool (Cyan → Indigo)": {
    emptyColor: "#ecfeff",
    fullColor: "#4338ca",
    nullColor: "#e5e7eb",
    steps: 10,
  },
};

export function DisplayControls({ options, onChange }: DisplayControlsProps) {
  const update = (partial: Partial<DisplayOptions>) => {
    onChange({ ...options, ...partial });
  };

  return (
    <div className="space-y-5">
      {/* Toggle controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-values" className="cursor-pointer">
            Show percentage values
          </Label>
          <Switch
            id="show-values"
            checked={options.showValues}
            onCheckedChange={(checked) => update({ showValues: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-summary" className="cursor-pointer">
            Show summary bars
          </Label>
          <Switch
            id="show-summary"
            checked={options.showSummary}
            onCheckedChange={(checked) => update({ showSummary: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sort-density" className="cursor-pointer">
            Sort by density
          </Label>
          <Switch
            id="sort-density"
            checked={options.sortByDensity}
            onCheckedChange={(checked) => update({ sortByDensity: checked })}
          />
        </div>
      </div>

      {/* Cell size */}
      <div className="space-y-2">
        <Label htmlFor="cell-size">Cell size: {options.cellSize}px</Label>
        <Input
          id="cell-size"
          type="range"
          min={32}
          max={80}
          step={4}
          value={options.cellSize}
          onChange={(e) => update({ cellSize: parseInt(e.target.value) })}
          className="cursor-pointer"
        />
      </div>

      {/* Color scheme preset */}
      <div className="space-y-2">
        <Label>Color scheme</Label>
        <Select
          defaultValue="Red → Green"
          onValueChange={(value) => {
            const preset = COLOR_PRESETS[value];
            if (preset) update({ colorScheme: preset });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select color scheme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COLOR_PRESETS).map(([name, scheme]) => (
              <SelectItem key={name} value={name}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: scheme.emptyColor }}
                    />
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: scheme.fullColor }}
                    />
                  </div>
                  {name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom colors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="empty-color" className="text-xs">
            Empty (0%)
          </Label>
          <div className="flex gap-2 items-center">
            <input
              id="empty-color"
              type="color"
              value={options.colorScheme.emptyColor}
              onChange={(e) =>
                update({
                  colorScheme: { ...options.colorScheme, emptyColor: e.target.value },
                })
              }
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {options.colorScheme.emptyColor}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="full-color" className="text-xs">
            Full (100%)
          </Label>
          <div className="flex gap-2 items-center">
            <input
              id="full-color"
              type="color"
              value={options.colorScheme.fullColor}
              onChange={(e) =>
                update({
                  colorScheme: { ...options.colorScheme, fullColor: e.target.value },
                })
              }
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {options.colorScheme.fullColor}
            </span>
          </div>
        </div>
      </div>

      {/* Reset button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(DEFAULT_DISPLAY_OPTIONS)}
        className="w-full"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Reset to defaults
      </Button>
    </div>
  );
}
