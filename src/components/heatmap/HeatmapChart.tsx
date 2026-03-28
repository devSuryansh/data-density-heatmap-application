"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { truncateWithEllipsis } from "@/src/lib/utils";
import type { HeatmapCell, HeatmapModel } from "@/src/types";
import { HeatmapTooltip } from "@/src/components/heatmap/HeatmapTooltip";

interface HeatmapChartProps {
  model: HeatmapModel;
  onCellClick?: (cell: HeatmapCell) => void;
}

interface PositionedCell extends HeatmapCell {
  x: number;
  y: number;
  key: string;
}

const CHART_ID = "density-heatmap-svg";

export function HeatmapChart({ model, onCellClick }: HeatmapChartProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const previousDensityRef = useRef<Map<string, number>>(new Map());
  const [tooltipState, setTooltipState] = useState<{
    cell: HeatmapCell | null;
    visible: boolean;
    x: number;
    y: number;
  }>({ cell: null, visible: false, x: 0, y: 0 });

  const matrix = useMemo(() => {
    const attributeIndex = new Map(model.attributes.map((attribute, index) => [attribute, index]));
    const nodeTypeIndex = new Map(model.nodeTypes.map((nodeType, index) => [nodeType, index]));

    const positioned: PositionedCell[] = model.cells.map((cell) => ({
      ...cell,
      x: attributeIndex.get(cell.attribute) ?? -1,
      y: nodeTypeIndex.get(cell.nodeType) ?? -1,
      key: `${cell.nodeType}|${cell.attribute}`,
    }));

    return positioned.filter((cell) => cell.x >= 0 && cell.y >= 0);
  }, [model.attributes, model.cells, model.nodeTypes]);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      const densityRows = matrix.map((entry) => ({
        nodeType: entry.nodeType,
        attribute: entry.attribute,
        density: Number(entry.density.toFixed(3)),
        nonNullCount: entry.nonNullCount,
        totalRecords: entry.totalRecords,
      }));

      const densityValues = densityRows.map((row) => row.density);
      const min = densityValues.length > 0 ? Math.min(...densityValues) : 0;
      const max = densityValues.length > 0 ? Math.max(...densityValues) : 0;
      const avg =
        densityValues.length > 0
          ? densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length
          : 0;

      // Debug output to verify range and non-trivial distribution before paint.
      console.debug("[heatmap] density summary", {
        rows: densityRows.length,
        min: Number(min.toFixed(3)),
        max: Number(max.toFixed(3)),
        avg: Number(avg.toFixed(3)),
      });
      console.table(densityRows);
    }

    const margin = { top: 140, right: 16, bottom: 16, left: 210 };
    const cellWidth = 34;
    const cellHeight = 36;
    const chartWidth = model.attributes.length * cellWidth;
    const chartHeight = model.nodeTypes.length * cellHeight;
    const width = margin.left + chartWidth + margin.right;
    const height = margin.top + chartHeight + margin.bottom;

    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    const root = svg
      .selectAll<SVGGElement, null>("g.chart-root")
      .data([null])
      .join("g")
      .attr("class", "chart-root")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 0.5, 1])
      .range(["#b91c1c", "#f59e0b", "#15803d"])
      .clamp(true);

    const xLabels = root
      .selectAll<SVGTextElement, string>("text.x-label")
      .data(model.attributes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "x-label")
            .attr("fill", "var(--color-text-muted)")
            .attr("font-size", 10),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("transform", (_d, index) => `translate(${index * cellWidth + 9}, -8) rotate(-45)`)
      .text((d) => truncateWithEllipsis(d, 20));

    xLabels.selectAll("title").data((d) => [d]).join("title").text((d) => d);

    root
      .selectAll<SVGTextElement, string>("text.y-label")
      .data(model.nodeTypes, (d) => d)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("fill", "var(--color-text-muted)")
            .attr("font-size", 11),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("x", -10)
      .attr("y", (_d, index) => index * cellHeight + cellHeight / 2)
      .text((d) => d);

    const cells = root
      .selectAll<SVGRectElement, PositionedCell>("rect.cell")
      .data(matrix, (d) => d.key)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "cell")
            .attr("opacity", 1)
            .attr("x", (d) => d.x * cellWidth)
            .attr("y", (d) => d.y * cellHeight)
            .attr("width", cellWidth - 1)
            .attr("height", cellHeight - 1)
            .style("transition", "filter 100ms ease"),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(220)
            .attr("opacity", 0)
            .remove(),
      );

            // Always paint a solid color immediately so cells never appear colorless.
            cells
          .attr("opacity", 1)
          .attr("x", (d) => d.x * cellWidth)
          .attr("y", (d) => d.y * cellHeight)
          .attr("fill", (d) => colorScale(d.density))
          .attr("stroke", "#d1d5db")
          .attr("stroke-dasharray", "0");

    cells
      .on("mouseenter", (event, datum) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const rawX = event.clientX + 14;
        const rawY = event.clientY + 14;
        const clampedX = Math.min(rawX, viewportWidth - 240);
        const clampedY = Math.min(rawY, viewportHeight - 120);

        setTooltipState({ cell: datum, visible: true, x: clampedX, y: clampedY });
        d3.select<SVGRectElement, PositionedCell>(event.currentTarget).style("filter", "brightness(1.15)");
      })
      .on("mouseleave", (event) => {
        setTooltipState((previous) => ({ ...previous, visible: false }));
        d3.select<SVGRectElement, PositionedCell>(event.currentTarget).style("filter", "none");
      })
      .on("mousemove", (event) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        setTooltipState((previous) => ({
          ...previous,
          x: Math.min(event.clientX + 14, viewportWidth - 240),
          y: Math.min(event.clientY + 14, viewportHeight - 120),
        }));
      })
      .on("click", (_event, datum) => {
        onCellClick?.(datum);
      });

    cells
      .transition()
      .delay((_d, index) => index * 6)
      .duration(220)
      .ease(d3.easeCubicOut)
      .attr("opacity", 1);

    const showDensityValues = matrix.length <= 220;
    const valueLabels = root
      .selectAll<SVGTextElement, PositionedCell>("text.cell-value")
      .data(showDensityValues ? matrix : [], (d) => d.key)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "cell-value")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", 9)
            .attr("fill", "#0f172a")
            .attr("opacity", 0),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("x", (d) => d.x * cellWidth + cellWidth / 2)
      .attr("y", (d) => d.y * cellHeight + cellHeight / 2)
      .text((d) => `${Math.round(d.density * 100)}`);

    valueLabels
      .transition()
      .duration(350)
      .attr("fill", "#000000")
      .attr("opacity", (d) => (d.density >= 0.08 ? 0.8 : 0));

    previousDensityRef.current = new Map(matrix.map((entry) => [entry.key, entry.density]));
  }, [matrix, model.attributes, model.nodeTypes, onCellClick]);

  return (
    <div
      ref={wrapperRef}
      className="chart-enter relative overflow-x-auto rounded-md border border-(--color-border) bg-(--color-surface) p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
    >
      <svg ref={svgRef} id={CHART_ID} className="min-w-215" />
      <HeatmapTooltip
        cell={tooltipState.cell}
        visible={tooltipState.visible}
        x={tooltipState.x}
        y={tooltipState.y}
      />
    </div>
  );
}

export const HEATMAP_SVG_SELECTOR = `#${CHART_ID}`;
