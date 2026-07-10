import { TimeRangeSelector } from "./time-range-selector";
import type { TimeRange } from "@/types/ui";
import { getTranslations } from "next-intl/server";

type SubtitleKey = "subtitleDaily" | "subtitleWeekly" | "subtitleMonthly";

function getSubtitleKey(since: TimeRange): SubtitleKey {
  if (since === "weekly") return "subtitleWeekly";
  if (since === "monthly") return "subtitleMonthly";
  return "subtitleDaily";
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

interface TrendingHeaderProps {
  count: number;
  since: TimeRange;
  updatedAt?: string | null;
  locale: string;
}

/** Page header with title and time range selector */
export async function TrendingHeader({
  count,
  since,
  updatedAt,
  locale,
}: TrendingHeaderProps) {
  const t = await getTranslations("Trending");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(getSubtitleKey(since), { count })}
          {updatedAt && (
            <>
              {" · "}
              {t("lastUpdated")}{" "}
              {formatDate(updatedAt, locale)}
            </>
          )}
        </p>
      </div>
      <TimeRangeSelector />
    </div>
  );
}
