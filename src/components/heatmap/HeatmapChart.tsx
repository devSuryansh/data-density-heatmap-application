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
    const positioned: PositionedCell[] = model.cells.map((cell) => ({
      ...cell,
      x: model.attributes.indexOf(cell.attribute),
      y: model.nodeTypes.indexOf(cell.nodeType),
      key: `${cell.nodeType}|${cell.attribute}`,
    }));
    return positioned;
  }, [model.attributes, model.cells, model.nodeTypes]);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) {
      return;
    }

    const margin = { top: 140, right: 16, bottom: 16, left: 210 };
    const cellWidth = 26;
    const cellHeight = 30;
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
      .scaleSequential(d3.interpolateBlues)
      .domain([0, 1])
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

    xLabels.append("title").text((d) => d);

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
            .attr("opacity", 0)
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
      .delay((_d, index) => index * 8)
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr("opacity", 1)
      .attr("x", (d) => d.x * cellWidth)
      .attr("y", (d) => d.y * cellHeight)
      .attr("fill", (d) => (d.density === 0 ? "#f5f5f5" : colorScale(d.density)))
      .attr("stroke", (d) => (d.density === 0 ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.04)"))
      .attr("stroke-dasharray", (d) => (d.density === 0 ? "3 2" : "0"));

    cells
      .transition()
      .duration(600)
      .ease(d3.easeCubicInOut)
      .attrTween("fill", function fillTween(datum) {
        const key = datum.key;
        const previousDensity = previousDensityRef.current.get(key) ?? datum.density;
        const interpolator = d3.interpolateNumber(previousDensity, datum.density);
        return (progress) => {
          const value = interpolator(progress);
          return value === 0 ? "#f5f5f5" : colorScale(value);
        };
      });

    previousDensityRef.current = new Map(matrix.map((entry) => [entry.key, entry.density]));
  }, [matrix, model.attributes, model.nodeTypes, onCellClick]);

  return (
    <div ref={wrapperRef} className="chart-enter relative overflow-x-auto border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <svg ref={svgRef} id={CHART_ID} className="min-w-[860px]" />
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
