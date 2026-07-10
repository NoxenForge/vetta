import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Code2 } from "lucide-react";

export async function Footer() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const navLinks = [
    { href: "/", label: t("navigation") + " Home" },
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
  ];

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-foreground"
            >
              <Code2 className="h-5 w-5" />
              <span>GitHub Trending Intelligence</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("navigation")}
            </h3>
            <ul className="space-y-1.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Data Source */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("legal")}
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {t("github")}
                </a>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground pt-2">
              {t("dataSource")}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
