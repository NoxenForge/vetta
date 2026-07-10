"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RepoDetailError({ error, reset }: ErrorProps) {
  const t = useTranslations("Repo");
  const c = useTranslations("Common");

  useEffect(() => {
    console.error("Repo detail error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-20 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        {t("errorLoading")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {c("error")}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={reset} variant="outline">
          {c("retry")}
        </Button>
        <Link href="/">
          <Button variant="ghost">{t("backToTrending")}</Button>
        </Link>
      </div>
    </main>
  );
}
