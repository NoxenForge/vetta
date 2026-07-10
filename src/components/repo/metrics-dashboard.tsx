"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RepoDetail } from "@/types/ui";

interface MetricsDashboardProps {
  detail: RepoDetail;
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function computeRadarData(detail: RepoDetail) {
  const commits = detail.commit_activity ?? [];
  const totalCommits = commits.reduce((a, b) => a + b, 0);

  const sortedSnapshots = [...detail.snapshots].sort(
    (a, b) =>
      new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
  );
  const oldestStars = sortedSnapshots[0]?.stargazers_count ?? 0;
  const newestStars =
    sortedSnapshots[sortedSnapshots.length - 1]?.stargazers_count ?? 0;
  const starGrowth = newestStars - oldestStars;
  const daysSinceCreation = Math.max(
    1,
    (Date.now() - new Date(detail.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return [
    {
      dimension: "Activity",
      score: clamp(totalCommits > 0 ? (totalCommits / 52) * 10 : 0),
    },
    {
      dimension: "Community",
      score: clamp(
        (detail.contributor_count ?? 0) > 0
          ? Math.min(100, (detail.contributor_count ?? 0) * 2)
          : Math.min(100, (starGrowth / Math.max(1, daysSinceCreation)) * 365),
      ),
    },
    {
      dimension: "Issues",
      score: clamp(
        detail.open_issues_count > 100
          ? Math.max(20, 100 - detail.open_issues_count / 5)
          : 100 - detail.open_issues_count,
      ),
    },
    {
      dimension: "Releases",
      score: clamp((detail.release_count ?? 0) * 20),
    },
    {
      dimension: "Code",
      score: clamp(
        daysSinceCreation > 365
          ? Math.min(100, daysSinceCreation / 7.3)
          : 50,
      ),
    },
    {
      dimension: "Maintenance",
      score: clamp(
        detail.pushed_at
          ? Math.max(
              0,
              100 -
                (Date.now() - new Date(detail.pushed_at).getTime()) /
                  (1000 * 60 * 60 * 24 * 3),
            )
          : 0,
      ),
    },
  ];
}

function CommitPulseChart({
  commitActivity,
}: {
  commitActivity: number[];
}) {
  const t = useTranslations("Repo");

  const data = useMemo(() => {
    return commitActivity.map((count, i) => ({
      week: i + 1,
      commits: count,
    }));
  }, [commitActivity]);

  const maxCommits = Math.max(1, ...commitActivity);

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("metricsCommitPulse")}
        </h2>
      </div>
      <div className="px-4 py-6">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={3} />
            <YAxis hide domain={[0, maxCommits]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelFormatter={(week) => `Week ${week}`}
            />
            <Bar
              dataKey="commits"
              fill="var(--color-chart-1)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{t("metricsOneYearAgo")}</span>
          <span>{t("metricsNow")}</span>
        </div>
      </div>
    </div>
  );
}

export function MetricsDashboard({ detail }: MetricsDashboardProps) {
  const t = useTranslations("Repo");

  const radarData = useMemo(() => computeRadarData(detail), [detail]);

  if (
    !detail.commit_activity &&
    !detail.contributor_count &&
    !detail.release_count
  ) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("metricsNotEnoughData")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card">
        <div className="border-b border-border px-6 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t("metricsRadar")}
          </h2>
        </div>
        <div className="px-4 py-6">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="var(--color-chart-1)"
                fill="var(--color-chart-1)"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detail.commit_activity && detail.commit_activity.length > 0 && (
        <CommitPulseChart commitActivity={detail.commit_activity} />
      )}
    </div>
  );
}
