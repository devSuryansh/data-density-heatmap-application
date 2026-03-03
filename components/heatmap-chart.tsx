"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { HeatmapData, DisplayOptions, DensityCell } from "@/lib/types";
import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/types";

interface HeatmapChartProps {
  data: HeatmapData;
  options?: Partial<DisplayOptions>;
  onCellClick?: (cell: DensityCell) => void;
}

export function HeatmapChart({
  data,
  options: optionOverrides,
  onCellClick,
}: HeatmapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<{
    cell: DensityCell;
    x: number;
    y: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const options: DisplayOptions = useMemo(
    () => ({ ...DEFAULT_DISPLAY_OPTIONS, ...optionOverrides }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(optionOverrides)]
  );

  // Observe container resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const renderHeatmap = useCallback(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Determine row/column ordering
    const nodeTypes = [...data.nodeTypes];
    const attributes = [...data.attributes];

    if (options.sortByDensity) {
      nodeTypes.sort(
        (a, b) => (data.nodeTypeDensities[b] || 0) - (data.nodeTypeDensities[a] || 0)
      );
      attributes.sort(
        (a, b) => (data.attributeDensities[b] || 0) - (data.attributeDensities[a] || 0)
      );
    }

    // Layout calculations
    const margin = { top: 140, right: options.showSummary ? 80 : 30, bottom: options.showSummary ? 60 : 30, left: 160 };
    const availableWidth = dimensions.width - margin.left - margin.right;
    const availableHeight = Math.max(
      nodeTypes.length * options.cellSize + (options.showSummary ? 30 : 0),
      300
    );

    const cellWidth = Math.max(
      Math.min(availableWidth / attributes.length, options.cellSize * 2),
      options.cellSize
    );
    const cellHeight = options.cellSize;

    const totalWidth = margin.left + attributes.length * cellWidth + margin.right;
    const totalHeight = margin.top + availableHeight + margin.bottom;

    svg.attr("width", totalWidth).attr("height", totalHeight);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 0.25, 0.5, 0.75, 1])
      .range([
        options.colorScheme.emptyColor,
        "#fbbf24",
        "#f59e0b",
        "#22c55e",
        options.colorScheme.fullColor,
      ])
      .clamp(true);

    // Draw cells
    const cellData = data.cells.map((cell) => ({
      ...cell,
      row: nodeTypes.indexOf(cell.nodeType),
      col: attributes.indexOf(cell.attribute),
    })).filter((c) => c.row >= 0 && c.col >= 0);

    g.selectAll(".heatmap-cell")
      .data(cellData)
      .join("rect")
      .attr("class", "heatmap-cell")
      .attr("x", (d) => d.col * cellWidth + 1)
      .attr("y", (d) => d.row * cellHeight + 1)
      .attr("width", cellWidth - 2)
      .attr("height", cellHeight - 2)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", (d) =>
        d.isError ? options.colorScheme.nullColor : colorScale(d.density)
      )
      .attr("stroke", "transparent")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.15s ease")
      .on("mouseenter", function (event: MouseEvent, d) {
        d3.select(this)
          .attr("stroke", "hsl(224, 71.4%, 4.1%)")
          .attr("stroke-width", 2);
        
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltipData({
          cell: d,
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top,
        });
      })
      .on("mousemove", function (event: MouseEvent, d) {
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltipData({
          cell: d,
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top,
        });
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", "transparent");
        setTooltipData(null);
      })
      .on("click", function (_event: MouseEvent, d) {
        onCellClick?.(d);
      });

    // Cell text values
    if (options.showValues) {
      g.selectAll(".cell-text")
        .data(cellData)
        .join("text")
        .attr("class", "cell-text")
        .attr("x", (d) => d.col * cellWidth + cellWidth / 2)
        .attr("y", (d) => d.row * cellHeight + cellHeight / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", Math.min(cellWidth, cellHeight) * 0.28)
        .attr("font-weight", 600)
        .attr("fill", (d) => {
          if (d.isError) return "#9ca3af";
          return d.density > 0.6 ? "#fff" : "#1f2937";
        })
        .attr("pointer-events", "none")
        .text((d) => (d.isError ? "ERR" : `${Math.round(d.density * 100)}%`));
    }

    // Row labels (node types)
    g.selectAll(".row-label")
      .data(nodeTypes)
      .join("text")
      .attr("class", "row-label")
      .attr("x", -12)
      .attr("y", (_, i) => i * cellHeight + cellHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("font-size", 13)
      .attr("font-weight", 500)
      .attr("fill", "currentColor")
      .text((d) => d);

    // Column labels (attributes)
    g.selectAll(".col-label")
      .data(attributes)
      .join("text")
      .attr("class", "col-label")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "central")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", "currentColor")
      .attr(
        "transform",
        (_, i) => `translate(${i * cellWidth + cellWidth / 2}, -10) rotate(-45)`
      )
      .text((d) => d);

    // Summary bars (row averages on the right side)
    if (options.showSummary) {
      const summaryBarWidth = 50;
      const summaryX = attributes.length * cellWidth + 16;

      // Row summary header
      g.append("text")
        .attr("x", summaryX + summaryBarWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .attr("fill", "currentColor")
        .attr("opacity", 0.6)
        .text("AVG");

      // Row summary bars
      g.selectAll(".row-summary")
        .data(nodeTypes)
        .join("g")
        .attr("class", "row-summary")
        .each(function (typeName, i) {
          const group = d3.select(this);
          const density = data.nodeTypeDensities[typeName] || 0;

          group
            .append("rect")
            .attr("x", summaryX)
            .attr("y", i * cellHeight + 4)
            .attr("width", summaryBarWidth)
            .attr("height", cellHeight - 8)
            .attr("rx", 3)
            .attr("fill", "#f3f4f6");

          group
            .append("rect")
            .attr("x", summaryX)
            .attr("y", i * cellHeight + 4)
            .attr("width", summaryBarWidth * density)
            .attr("height", cellHeight - 8)
            .attr("rx", 3)
            .attr("fill", colorScale(density));

          group
            .append("text")
            .attr("x", summaryX + summaryBarWidth / 2)
            .attr("y", i * cellHeight + cellHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", 10)
            .attr("font-weight", 700)
            .attr("fill", density > 0.5 ? "#fff" : "#374151")
            .text(`${Math.round(density * 100)}%`);
        });

      // Column summary bars (at bottom)
      const summaryY = nodeTypes.length * cellHeight + 16;

      g.selectAll(".col-summary")
        .data(attributes)
        .join("g")
        .attr("class", "col-summary")
        .each(function (attrName, i) {
          const group = d3.select(this);
          const density = data.attributeDensities[attrName] || 0;
          const barHeight = 24;

          group
            .append("rect")
            .attr("x", i * cellWidth + 2)
            .attr("y", summaryY)
            .attr("width", cellWidth - 4)
            .attr("height", barHeight)
            .attr("rx", 3)
            .attr("fill", "#f3f4f6");

          group
            .append("rect")
            .attr("x", i * cellWidth + 2)
            .attr("y", summaryY + barHeight * (1 - density))
            .attr("width", cellWidth - 4)
            .attr("height", barHeight * density)
            .attr("rx", 3)
            .attr("fill", colorScale(density));

          group
            .append("text")
            .attr("x", i * cellWidth + cellWidth / 2)
            .attr("y", summaryY + barHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", 9)
            .attr("font-weight", 700)
            .attr("fill", density > 0.5 ? "#fff" : "#374151")
            .text(`${Math.round(density * 100)}%`);
        });
    }
  }, [data, options, dimensions, onCellClick]);

  useEffect(() => {
    renderHeatmap();
  }, [renderHeatmap]);

  return (
    <div ref={containerRef} className="relative w-full min-h-[400px]">
      <div className="overflow-auto">
        <svg ref={svgRef} className="block" />
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="absolute z-50 pointer-events-none bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-sm"
          style={{
            left: tooltipData.x + 16,
            top: tooltipData.y - 16,
            maxWidth: 280,
          }}
        >
          <div className="font-semibold">
            {tooltipData.cell.nodeType} → {tooltipData.cell.attribute}
          </div>
          {tooltipData.cell.isError ? (
            <div className="text-destructive mt-1">{tooltipData.cell.errorMessage}</div>
          ) : (
            <>
              <div className="mt-1 space-y-0.5">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Density:</span>
                  <span className="font-mono font-semibold">
                    {(tooltipData.cell.density * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Filled:</span>
                  <span className="font-mono">
                    {tooltipData.cell.filledCount.toLocaleString()} /{" "}
                    {tooltipData.cell.totalCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Missing:</span>
                  <span className="font-mono">
                    {(tooltipData.cell.totalCount - tooltipData.cell.filledCount).toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Mini density bar */}
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${tooltipData.cell.density * 100}%`,
                    backgroundColor:
                      tooltipData.cell.density > 0.75
                        ? "#16a34a"
                        : tooltipData.cell.density > 0.5
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
