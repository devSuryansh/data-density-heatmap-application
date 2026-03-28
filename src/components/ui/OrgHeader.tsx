"use client";

import Image from "next/image";

interface OrgHeaderProps {
  appTitle: string;
  orgName: string;
  orgLogoUrl?: string;
  lastUpdated?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const LAST_UPDATED_LABEL = "Last updated";
const REFRESH_BUTTON_LABEL = "Refresh";

export function OrgHeader({
  appTitle,
  orgName,
  orgLogoUrl,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: OrgHeaderProps): JSX.Element {
  return (
    <header className="border-b border-(--color-border) bg-(--color-surface) px-4 py-3 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {orgLogoUrl ? (
            <Image
              src={orgLogoUrl}
              alt={`${orgName} logo`}
              width={36}
              height={36}
              className="h-9 w-9 rounded-sm border border-(--color-border) bg-(--color-surface) object-contain"
            />
          ) : (
            <div className="h-9 w-9 rounded-sm border border-(--color-border) bg-(--color-accent-soft)" />
          )}
          <p className="text-sm font-medium uppercase tracking-widest text-(--color-text)">{orgName}</p>
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-(--color-text) lg:text-xl">{appTitle}</h1>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-(--color-text-muted) lg:inline">
            {LAST_UPDATED_LABEL}: {lastUpdated ?? "-"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-sm border border-(--color-accent) bg-(--color-accent) px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : REFRESH_BUTTON_LABEL}
          </button>
        </div>
      </div>
    </header>
  );
}
