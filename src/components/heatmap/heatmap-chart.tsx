"use client";

import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { HeatmapResult } from "@/src/types/heatmap";

interface HeatmapChartProps {
  data: HeatmapResult;
  colorMin?: string;
  colorMax?: string;
}

export function HeatmapChart({
  data,
  colorMin = "#f5f5f4",
  colorMax = "#14532d",
}: HeatmapChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const matrix = useMemo(() => {
    const nodeTypes = data.nodeTypes;
    const attributes = data.attributes;
    const cells = data.cells.map((cell) => ({
      ...cell,
      row: nodeTypes.indexOf(cell.nodeType),
      col: attributes.indexOf(cell.attribute),
    }));

    return { nodeTypes, attributes, cells };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const margin = { top: 120, right: 24, bottom: 32, left: 180 };
    const cellWidth = 26;
    const cellHeight = 32;

    const width = margin.left + matrix.attributes.length * cellWidth + margin.right;
    const height = margin.top + matrix.nodeTypes.length * cellHeight + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const colorScale = d3.scaleLinear<string>().domain([0, 1]).range([colorMin, colorMax]);

    const root = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    const rects = root
      .selectAll("rect")
      .data(matrix.cells)
      .join("rect")
      .attr("x", (d) => d.col * cellWidth)
      .attr("y", (d) => d.row * cellHeight)
      .attr("width", cellWidth - 2)
      .attr("height", cellHeight - 2)
      .attr("fill", (d) => colorScale(d.density));

    rects
      .append("title")
      .text(
        (d) =>
          `${d.nodeType} / ${d.attribute}\nDensity: ${(d.density * 100).toFixed(2)}%\nNon-null: ${d.nonNullCount} / ${d.totalCount}`,
      );

    root
      .selectAll(".row-label")
      .data(matrix.nodeTypes)
      .join("text")
      .attr("class", "row-label")
      .attr("x", -12)
      .attr("y", (_, index) => index * cellHeight + cellHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 12)
      .text((value) => value);

    root
      .selectAll(".col-label")
      .data(matrix.attributes)
      .join("text")
      .attr("class", "col-label")
      .attr("transform", (_, index) => `translate(${index * cellWidth + 10}, -8) rotate(-45)`)
      .attr("font-size", 10)
      .text((value) => value);
  }, [matrix, colorMin, colorMax]);

  return (
    <div className="relative overflow-x-auto rounded border bg-white p-3">
      <svg ref={svgRef} className="min-w-225" />
    </div>
  );
}
