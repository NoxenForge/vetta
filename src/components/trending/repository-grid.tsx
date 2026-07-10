import { RepositoryCard } from "./repository-card";
import type { TrendingRepo } from "@/types/ui";
import { getTranslations } from "next-intl/server";

/** Responsive grid of RepositoryCard — used by page.tsx */
export async function RepositoryGrid({ repos }: { repos: TrendingRepo[] }) {
  const t = await getTranslations("Trending");

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-semibold text-foreground">
          {t("noRepos")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("noReposHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <RepositoryCard key={`${repo.id}:${repo.since}`} repo={repo} />
      ))}
    </div>
  );
}
