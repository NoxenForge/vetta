/** 仓库统计 KPI 卡片行 — 大数字 + sparkline 迷你图 */
"use client";

import { useTranslations } from "next-intl";
import { Star, GitFork, CircleDot, TrendingUp, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepoDetail, TrendSnapshot } from "@/types/ui";

interface StatsCardsProps {
  detail: RepoDetail;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** 计算全面快照范围内 star 的增长量（最新 - 最旧） */
function computeTotalGrowth(snapshots: TrendSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
  );
  const newest = sorted[sorted.length - 1];
  const oldest = sorted[0];
  return newest.stargazers_count - oldest.stargazers_count;
}

/** 迷你 sparkline 折线 — 纯 SVG，不依赖 recharts */
function Sparkline({
  data,
  height,
  strokeColor,
}: {
  data: number[];
  height: number;
  strokeColor: string;
}) {

  if (data.length < 2) return null;

  const width = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatsCards({ detail }: StatsCardsProps) {
  const t = useTranslations("Repo");

  const totalGrowth = computeTotalGrowth(detail.snapshots);

  // 提取 snapshots 的 star/forks 数据用于 sparkline
  const sortedSnapshots = [...detail.snapshots].sort(
    (a, b) =>
      new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
  );
  const starData = sortedSnapshots.map((s) => s.stargazers_count);
  const forkData = sortedSnapshots.map((s) => s.forks_count);

  const cards = [
    {
      icon: Star,
      value: detail.stargazers_count,
      label: t("statsStars"),
      data: starData,
    },
    {
      icon: GitFork,
      value: detail.forks_count,
      label: t("statsForks"),
      data: forkData,
    },
    {
      icon: CircleDot,
      value: detail.open_issues_count,
      label: t("statsIssues"),
      data: null,
    },
    {
      icon: TrendingUp,
      value: totalGrowth,
      label: t("totalGrowth"),
      growth: true,
      data: null,
    },
    {
      icon: Users,
      value: detail.contributor_count ?? 0,
      label: t("statsContributors"),
      data: null,
    },
    {
      icon: Package,
      value: detail.release_count ?? 0,
      label: t("statsReleases"),
      data: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-1 rounded-lg border bg-card p-4"
        >
          <div className="flex items-start justify-between">
            <card.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            {card.data && card.data.length >= 2 && (
              <Sparkline
                data={card.data}
                height={28}
                strokeColor="var(--color-chart-1, hsl(var(--primary)))"
              />
            )}
          </div>
          <div className="mt-1">
            <div
              className={cn(
                "text-lg font-bold tabular-nums",
                card.growth && totalGrowth >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : card.growth
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground",
              )}
            >
              {card.growth
                ? `${totalGrowth >= 0 ? "+" : ""}${formatNumber(totalGrowth)}`
                : formatNumber(card.value)}
            </div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
