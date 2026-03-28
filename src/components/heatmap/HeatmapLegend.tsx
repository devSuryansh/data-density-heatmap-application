"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export function HeatmapLegend(): JSX.Element {
  const gradientRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!gradientRef.current) {
      return;
    }

    const svg = d3.select(gradientRef.current);
    const bar = svg.select<SVGRectElement>("rect.legend-bar");
    bar.attr("width", 0).transition().duration(400).ease(d3.easeCubicOut).attr("width", 240);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
      <span>0%</span>
      <svg ref={gradientRef} width={240} height={12}>
        <defs>
          <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <rect
          className="legend-bar"
          x="0"
          y="0"
          width="240"
          height="12"
          fill="url(#legendGradient)"
          stroke="var(--color-border)"
        />
      </svg>
      <span>100%</span>
    </div>
  );
}
