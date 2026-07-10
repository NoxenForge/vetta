"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/types/ui";

const RANGES: { value: TimeRange; i18nKey: string }[] = [
  { value: "daily", i18nKey: "today" },
  { value: "weekly", i18nKey: "thisWeek" },
  { value: "monthly", i18nKey: "thisMonth" },
];

/** Toggle between daily/weekly/monthly time ranges via URL search param "since" */
export function TimeRangeSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Trending");

  const current = (searchParams.get("since") as TimeRange) || "daily";

  function handleChange(value: TimeRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "daily") {
      params.delete("since");
    } else {
      params.set("since", value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex rounded-lg border bg-muted/30 p-0.5" role="group">
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => handleChange(range.value)}
          className={cn(
            "relative px-3.5 py-1.5 text-xs font-medium rounded-md transition-all",
            current === range.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(range.i18nKey)}
        </button>
      ))}
    </div>
  );
}
