"use client";

import type { StatusInfo } from "@/src/types";

const STATUS_STYLES: Record<StatusInfo["state"], string> = {
  idle: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  connecting: "border-[#dbe3f0] bg-[#f7f9fc] text-[#31517a]",
  introspecting: "border-[#e2ddf3] bg-[#f9f7fd] text-[#4f3e82]",
  fetching: "border-[#d8eaf0] bg-[#f5fafc] text-[#2d5f6e]",
  computing: "border-[#f0e3cf] bg-[#fdf9f2] text-[#7c5b2a]",
  ready: "border-[#d7eadc] bg-[#f4faf6] text-[#2c5c3a]",
  error: "border-[#f3d7d5] bg-[#fdf5f4] text-[#8c2f2b]",
};

interface StatusBadgeProps {
  status: StatusInfo;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return (
    <span
      className={`status-slide rounded-sm border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${STATUS_STYLES[status.state]}`}
    >
      {status.label}
    </span>
  );
}
