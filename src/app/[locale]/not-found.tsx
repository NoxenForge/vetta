"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function LocaleNotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="mx-auto max-w-7xl px-4 py-20 text-center">
      <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/">
          <Button>{t("goHome")}</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">{t("goTrending")}</Button>
        </Link>
      </div>
    </main>
  );
}
