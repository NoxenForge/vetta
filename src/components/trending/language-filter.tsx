"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LanguageFilterProps {
  languages: string[];
}

/** Clickable language badges that filter via URL search param "language" */
export function LanguageFilter({ languages }: LanguageFilterProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Trending");

  const current = searchParams.get("language") || "";

  function handleSelect(language: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (language === current) {
      params.delete("language");
    } else {
      params.set("language", language);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (languages.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* "All" button to clear filter */}
      <button
        onClick={() => {
          if (current) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("language");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }
        }}
        className={cn(
          "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors border",
          current === ""
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
        )}
      >
        {t("allLanguages")}
      </button>
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleSelect(lang)}
          className={cn(
            "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors border",
            current === lang
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
