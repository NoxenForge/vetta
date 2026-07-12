"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { RepoDetail, DailyCommitWeek } from "@/types/ui";

interface MetricsDashboardProps {
  detail: RepoDetail;
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function computeRadarData(detail: RepoDetail) {
  const weeks = detail.commit_activity ?? [];
  const totalCommits = weeks.reduce((sum, w) => {
    // 兼容旧格式（number[]）和新格式（{ days[] }）
    if (typeof w === "number") return sum + w;
    if (w && typeof w === "object" && Array.isArray(w.days)) {
      return sum + w.days.reduce((a, b) => a + b, 0);
    }
    return sum;
  }, 0);

  // 线性扫描找 oldest/newest stars（替代 O(n log n) 排序）
  let oldestStars = Infinity;
  let newestStars = -Infinity;
  for (const h of detail.history) {
    if (h.stargazers_count < oldestStars) oldestStars = h.stargazers_count;
    if (h.stargazers_count > newestStars) newestStars = h.stargazers_count;
  }
  if (!isFinite(oldestStars)) oldestStars = 0;
  if (!isFinite(newestStars)) newestStars = 0;
  const starGrowth = newestStars - oldestStars;
  const daysSinceCreation = Math.max(
    1,
    (Date.now() - new Date(detail.github_created_at).getTime()) /
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
      score: clamp(detail.release_count * 20),
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

/** 根据 commit 数量映射到 5 级颜色强度（GitHub 风格） */
function heatColor(commits: number, maxCommits: number): string {
  if (commits === 0) return "bg-muted";
  const ratio = commits / Math.max(1, maxCommits);
  if (ratio <= 0.25) return "bg-emerald-200 dark:bg-emerald-900";
  if (ratio <= 0.5) return "bg-emerald-400 dark:bg-emerald-700";
  if (ratio <= 0.75) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-300";
}

interface CellData {
  count: number;
  date: Date;
  weekCol: number;
  dayRow: number;
}

function CommitPulseChart({
  commitActivity,
}: {
  commitActivity: DailyCommitWeek[];
}) {
  const t = useTranslations("Repo");
  const locale = useLocale();

  // 根据当前 locale 生成本地化星期缩写
  const DAY_ROWS = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          new Date(2024, 0, i + 1),
        ),
      ),
    [locale],
  );
  const CELL_SIZE = 12;
  const GAP = 2;

  // 检测数据格式：旧格式 number[]（52 周总量）vs 新格式 DailyCommitWeek[]（每日数据）
  const isNewFormat =
    commitActivity &&
    commitActivity.length > 0 &&
    typeof commitActivity[0] === "object" &&
    "days" in commitActivity[0];

  // ── 旧格式：1 行 × 52 列周热力图 ──
  const oldData = useMemo(() => {
    if (isNewFormat || !commitActivity) return null;
    const arr = commitActivity as unknown as number[];
    const reversed = [...arr].reverse(); // 最早排最左
    const max = Math.max(1, ...reversed);
    return { data: reversed, maxCommits: max, count: reversed.length };
  }, [commitActivity, isNewFormat]);

  // ── 新格式：7 行 × N 列日热力图 ──
  const newData = useMemo(() => {
    if (!isNewFormat || !commitActivity) return null;
    const weeks = commitActivity as DailyCommitWeek[];
    const allCells: CellData[] = [];
    let max = 1;

    for (let col = 0; col < weeks.length; col++) {
      const week = weeks[col];
      const weekStart = new Date(week.week * 1000);
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const count = week.days[d] ?? 0;
        if (count > max) max = count;
        const dayRow = d === 0 ? 6 : d - 1;
        allCells.push({ count, date, weekCol: col, dayRow });
      }
    }
    // 预计算位置查找表，避免渲染时 O(n²) cells.find()
    const cellByPosition: number[][] = Array.from({ length: 7 }, () =>
      Array(weeks.length).fill(0),
    );
    for (const c of allCells) {
      cellByPosition[c.dayRow][c.weekCol] = c.count;
    }
    return {
      cells: allCells,
      cellByPosition,
      maxCommits: max,
      weekCount: weeks.length,
    };
  }, [commitActivity, isNewFormat]);

  if (!oldData && !newData) return null;

  // ── 旧格式渲染：1 行 ──
  if (oldData) {
    const totalCommits = oldData.data.reduce((a, b) => a + b, 0);
    return (
      <div className="rounded-lg border bg-card">
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {t("metricsCommitPulse")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t("metricsCommitCount", { count: totalCommits })}
          </span>
        </div>
        <div className="px-4 py-4 overflow-x-auto">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${oldData.count}, ${CELL_SIZE}px)`,
            }}
          >
            {oldData.data.map((count, i) => (
              <div
                key={i}
                role="img"
                aria-label={t("metricsCommitCount", { count })}
                className={`rounded-sm ${heatColor(count, oldData.maxCommits)}`}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{t("metricsLess")}</span>
            {[0, 0.25, 0.5, 0.75, 1].map((level) => (
              <div
                key={level}
                role="img"
                aria-label={`${Math.round(level * 100)}%`}
                className={`w-2.5 h-2.5 rounded-sm ${heatColor(Math.round(level * oldData.maxCommits), oldData.maxCommits)}`}
              />
            ))}
            <span>{t("metricsMore")}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── 新格式渲染：7×N GitHub 风格 ──
  if (!newData) return null;
  const { cells, maxCommits, weekCount } = newData;
  const totalCommits = cells.reduce((s, c) => s + c.count, 0);
  const weeks = commitActivity as DailyCommitWeek[];

  // 月份标签
  const monthLabels: { label: string; col: number }[] = [];
  for (let col = 0; col < weekCount; col++) {
    const d = new Date(weeks[col].week * 1000);
    d.setDate(d.getDate() + 3);
    const month = d.toLocaleDateString(locale, { month: "short" });
    if (col === 0 || month !== monthLabels[monthLabels.length - 1]?.label) {
      monthLabels.push({ label: month, col });
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {t("metricsCommitPulse")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("metricsCommitCount", { count: totalCommits })}
        </span>
      </div>
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex" style={{ minWidth: weekCount * (CELL_SIZE + GAP) + 32 }}>
          {/* 左侧日标签 */}
          <div className="flex flex-col gap-[2px] mr-1 pt-[18px]">
            {DAY_ROWS.map((day, i) => (
              <div
                key={day}
                className="text-[9px] text-muted-foreground leading-none"
                style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
              >
                {i % 2 === 0 ? day.charAt(0) : ""}
              </div>
            ))}
          </div>

          <div>
            <div className="flex mb-[2px] h-[14px] relative">
              <div style={{ width: weekCount * (CELL_SIZE + GAP), position: "relative" }}>
                {monthLabels.map((m) => (
                  <span
                    key={m.col}
                    className="text-[10px] text-muted-foreground absolute"
                    style={{ left: m.col * (CELL_SIZE + GAP) }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weekCount}, ${CELL_SIZE}px)`,
                gap: GAP,
              }}
            >
              {Array.from({ length: 7 }).map((_, row) =>
                Array.from({ length: weekCount }).map((_, col) => {
                  const { cellByPosition } = newData;
                  const count = cellByPosition[row]?.[col] ?? 0;
                  const dateLabel = (() => {
                    if (count === 0) return "";
                    const d = new Date(weeks[col].week * 1000);
                    d.setDate(d.getDate() + (col > 0 ? 0 : row === 6 ? 0 : row + 1));
                    return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
                  })();
                  return (
                    <div
                      key={`${col}-${row}`}
                      role="img"
                      aria-label={t("metricsCommitCount", { count })}
                      className={`rounded-sm ${heatColor(count, maxCommits)}`}
                      title={dateLabel ? `${dateLabel}: ${count}` : ""}
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    />
                  );
                }),
              )}
            </div>

            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{t("metricsLess")}</span>
              {[0, 0.25, 0.5, 0.75, 1].map((level) => (
                <div
                  key={level}
                  role="img"
                  aria-label={`${Math.round(level * 100)}%`}
                  className={`w-2.5 h-2.5 rounded-sm ${heatColor(Math.round(level * maxCommits), maxCommits)}`}
                />
              ))}
              <span>{t("metricsMore")}</span>
            </div>
          </div>
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
    <>
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

    </div>

      {detail.commit_activity && detail.commit_activity.length > 0 && (
        <CommitPulseChart commitActivity={detail.commit_activity} />
      )}
    </>
  );
}
