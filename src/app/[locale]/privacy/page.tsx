import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title"), description: t("intro").slice(0, 160) };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section><p>{t("intro")}</p></section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("infoWeCollect")}</h2>
          <p className="text-muted-foreground">{t("infoWeCollectDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("cookies")}</h2>
          <p className="text-muted-foreground">{t("cookiesDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("thirdPartyServices")}</h2>
          <p className="text-muted-foreground">{t("thirdPartyServicesDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("dataRetention")}</h2>
          <p className="text-muted-foreground">{t("dataRetentionDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("yourRights")}</h2>
          <p className="text-muted-foreground">{t("yourRightsDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("changes")}</h2>
          <p className="text-muted-foreground">{t("changesDesc")}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("contact")}</h2>
          <p className="text-muted-foreground">{t("contactDesc")}</p>
        </section>
      </div>
    </main>
  );
}
