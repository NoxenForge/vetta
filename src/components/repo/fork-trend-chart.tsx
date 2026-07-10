/** 复刻趋势折线图 — 展示全部快照时间序列，仅在 ≥2 个数据点时显示 */
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

interface ForkTrendChartProps {
  snapshots: TrendSnapshot[];
}

function formatAxis(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}

export function ForkTrendChart({ snapshots }: ForkTrendChartProps) {
  const t = useTranslations("Repo");

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
        forks: s.forks_count,
      }));
  }, [snapshots]);

  if (chartData.length < 2) {
    return null;
  }

  const forkValues = chartData.map((d) => d.forks);
  const yMin = Math.min(...forkValues);
  const yMax = Math.max(...forkValues);
  const yRange = yMax - yMin || 1;
  const yDomain = [Math.max(0, yMin - yRange * 0.1), yMax + yRange * 0.1];

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("forkTrendChart")}
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
                t("statsForks"),
              ]}
            />
            <Line
              type="monotone"
              dataKey="forks"
              stroke="var(--color-chart-2, hsl(var(--chart-2)))"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-chart-2, hsl(var(--chart-2)))" }}
              activeDot={{
                r: 5,
                fill: "var(--color-chart-2, hsl(var(--chart-2)))",
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
