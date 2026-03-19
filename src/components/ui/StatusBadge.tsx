"use client";

import type { StatusInfo } from "@/src/types";

const STATUS_STYLES: Record<StatusInfo["state"], string> = {
  idle: "bg-slate-700 text-slate-100",
  connecting: "bg-blue-600/20 text-blue-300",
  introspecting: "bg-indigo-600/20 text-indigo-300",
  fetching: "bg-cyan-600/20 text-cyan-300",
  computing: "bg-amber-600/20 text-amber-300",
  ready: "bg-emerald-600/20 text-emerald-300",
  error: "bg-rose-600/20 text-rose-300",
};

interface StatusBadgeProps {
  status: StatusInfo;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return (
    <span className={`status-slide rounded border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status.state]}`}>
      {status.label}
    </span>
  );
}
