/** 复刻趋势折线图 — 仅在 ≥2 个数据点时显示 */
"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MetricsHistoryPoint } from "@/types/ui";

interface ForkTrendChartProps {
  history: MetricsHistoryPoint[];
}

function formatAxis(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function ForkTrendChart({ history }: ForkTrendChartProps) {
  const t = useTranslations("Repo");
  const i18nLocale = useLocale();
  const locale = i18nLocale || "en";

  const chartData = useMemo(() => {
    // 防御性排序：确保按 snapshot_at 升序（service 层已排序，此处作为安全网）
    return [...history]
      .sort(
        (a, b) =>
          new Date(a.snapshot_at).getTime() -
          new Date(b.snapshot_at).getTime(),
      )
      .map((h) => ({
        date: new Date(h.snapshot_at).toLocaleString(locale, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        forks: h.forks_count,
      }));
  }, [history, locale]);

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
              tickFormatter={(n) => formatAxis(n, locale)}
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
                Number(value).toLocaleString(locale),
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
