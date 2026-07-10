"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Menu, X, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t("home"), active: pathname === "/" },
    { href: "/privacy", label: t("privacy"), active: pathname === "/privacy" },
    { href: "/terms", label: t("terms"), active: pathname === "/terms" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          <Code2 className="h-5 w-5" />
          <span className="hidden sm:inline">{t("title")}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                link.active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="GitHub"
          >
            <Code2 className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("navMenu")}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background px-4 py-3">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  link.active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
