"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TrendSnapshot } from "@/types/ui";

interface TrendChartProps {
  snapshots: TrendSnapshot[];
}

type TabKey = "daily" | "weekly" | "monthly" | "all";

export function TrendChart({ snapshots }: TrendChartProps) {
  const t = useTranslations("Repo");
  const [tab, setTab] = useState<TabKey>("all");

  const filtered =
    tab === "all"
      ? snapshots
      : snapshots.filter((s) => s.since === tab);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "daily", label: t("daily") },
    { key: "weekly", label: t("weekly") },
    { key: "monthly", label: t("monthly") },
  ];

  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("noSnapshots")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {t("trendHistory")}
        </h2>
        <div className="flex gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                tab === key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-6 py-2 font-medium text-muted-foreground">
                {t("snapshotDate")}
              </th>
              <th className="text-right px-6 py-2 font-medium text-muted-foreground">
                {t("snapshotStars")}
              </th>
              <th className="text-right px-6 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                {t("forks", { count: "" }).trim()}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr
                key={`${s.since}-${s.fetched_at}`}
                className={cn(
                  "border-b border-border/50 hover:bg-muted/20 transition-colors",
                  i === 0 && "bg-primary/5",
                )}
              >
                <td className="px-6 py-2 text-muted-foreground font-mono">
                  {new Date(s.fetched_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-2 text-right font-mono tabular-nums">
                  {s.stargazers_count.toLocaleString()}
                </td>
                <td className="px-6 py-2 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                  {s.forks_count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
