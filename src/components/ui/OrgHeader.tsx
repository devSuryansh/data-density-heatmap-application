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
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-3 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {orgLogoUrl ? (
            <Image src={orgLogoUrl} alt={`${orgName} logo`} width={36} height={36} className="h-9 w-9 object-contain" />
          ) : (
            <div className="h-9 w-9 border border-[var(--color-border)] bg-black/20" />
          )}
          <p className="font-mono text-sm uppercase tracking-wider text-[var(--color-text)]">{orgName}</p>
        </div>

        <h1 className="font-mono text-lg tracking-wide text-[var(--color-text)] lg:text-xl">{appTitle}</h1>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[var(--color-text-muted)] lg:inline">
            {LAST_UPDATED_LABEL}: {lastUpdated ?? "-"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border border-[var(--color-accent)] bg-[var(--color-accent-glow)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : REFRESH_BUTTON_LABEL}
          </button>
        </div>
      </div>
    </header>
  );
}
