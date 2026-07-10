import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: t("title"), description: t("intro").slice(0, 160) };
}

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  const sections = [
    "description", "useOfService", "intellectualProperty",
    "disclaimer", "limitation", "apiUsage", "changes",
    "governingLaw", "contact",
  ] as const;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section><p>{t("intro")}</p></section>
        {sections.map((s) => (
          <section key={s}>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t(s)}
            </h2>
            <p className="text-muted-foreground">{t(`${s}Desc` as keyof typeof t)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
