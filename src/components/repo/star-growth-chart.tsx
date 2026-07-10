/** 星星增长折线图 — recharts LineChart，展示全部快照时间序列 */
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendSnapshot } from "@/types/ui";

interface StarGrowthChartProps {
  snapshots: TrendSnapshot[];
}

function formatAxis(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}

export function StarGrowthChart({ snapshots }: StarGrowthChartProps) {
  const t = useTranslations("Repo");

  // 所有快照按时间排序，展开为折线数据
  const chartData = useMemo(() => {
    return [...snapshots]
      .sort(
        (a, b) =>
          new Date(a.fetched_at).getTime() -
          new Date(b.fetched_at).getTime(),
      )
      .map((s) => ({
        date: new Date(s.fetched_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        stars: s.stargazers_count,
      }));
  }, [snapshots]);

  if (chartData.length < 2) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("notEnoughData")}</p>
      </div>
    );
  }

  const starValues = chartData.map((d) => d.stars);
  const yMin = Math.min(...starValues);
  const yMax = Math.max(...starValues);
  const yRange = yMax - yMin || 1;
  const yDomain = [Math.max(0, yMin - yRange * 0.1), yMax + yRange * 0.1];

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("starGrowthChart")}
        </h2>
      </div>

      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border, hsl(var(--border)))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={formatAxis}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card, hsl(var(--card)))",
                border: "1px solid var(--border, hsl(var(--border)))",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              labelStyle={{
                color: "var(--muted-foreground)",
                marginBottom: 4,
              }}
              formatter={(value) => [
                Number(value).toLocaleString(),
                t("statsStars"),
              ]}
            />
            <Line
              type="monotone"
              dataKey="stars"
              stroke="var(--color-chart-1, hsl(var(--primary)))"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-chart-1, hsl(var(--primary)))" }}
              activeDot={{
                r: 5,
                fill: "var(--color-chart-1, hsl(var(--primary)))",
                stroke: "var(--card, white)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
