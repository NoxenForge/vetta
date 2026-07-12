import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getTrendingRepos, getAvailableLanguages } from "@/lib/repository.service";
import { TrendingHeader } from "@/components/trending/trending-header";
import { LanguageFilter } from "@/components/trending/language-filter";
import { RepositoryGrid } from "@/components/trending/repository-grid";
import { RepositoryCardSkeleton } from "@/components/trending/repository-card-skeleton";
import type { TrendingRepo } from "@/types/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Trending");
  return {
    title: t("title"),
    description: t("subtitle", { count: 50 }),
    openGraph: {
      title: t("title"),
      description: t("subtitle", { count: 50 }),
    },
  };
}

interface PageProps {
  searchParams: Promise<{ language?: string }>;
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <RepositoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  let repos: TrendingRepo[];
  let languages: string[] = [];

  try {
    const [reposResult, langsResult] = await Promise.all([
      getTrendingRepos({ language: params.language }),
      getAvailableLanguages(),
    ]);
    repos = reposResult;
    languages = langsResult;
  } catch (error) {
    console.error("Failed to fetch trending data:", error);
    repos = [];
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Suspense fallback={<HeaderSkeleton />}>
          <TrendingHeader count={repos.length} updatedAt={repos[0]?.pushed_at} />
        </Suspense>

        <Suspense fallback={null}>
          <LanguageFilter languages={languages} />
        </Suspense>

        <Suspense fallback={<GridSkeleton />}>
          <RepositoryGrid repos={repos} />
        </Suspense>
      </div>
    </main>
  );
}
