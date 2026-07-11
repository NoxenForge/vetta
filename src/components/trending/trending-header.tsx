import { getTranslations } from "next-intl/server";

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
  updatedAt?: string | null;
  locale?: string;
}

export async function TrendingHeader({
  count,
  updatedAt,
  locale = "en",
}: TrendingHeaderProps) {
  const t = await getTranslations("Trending");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("subtitle", { count })}
        {updatedAt && (
          <>
            {" · "}
            {t("lastUpdated")}{" "}
            {formatDate(updatedAt, locale)}
          </>
        )}
      </p>
    </div>
  );
}
