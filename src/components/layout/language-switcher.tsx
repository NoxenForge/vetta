"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "tw", label: "繁體中文" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");

  function switchTo(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("toggleLanguage")}
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Globe className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchTo(l.code)}
            disabled={l.code === locale}
          >
            {l.label}
            {l.code === locale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
