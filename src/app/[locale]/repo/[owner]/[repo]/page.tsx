import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepoDetail } from "@/lib/repository.service";
import { RepoHeader } from "@/components/repo/repo-header";
import { StatsCards } from "@/components/repo/stats-cards";
import { StarGrowthChart } from "@/components/repo/star-growth-chart";
import { ForkTrendChart } from "@/components/repo/fork-trend-chart";
import { ReadmeViewer } from "@/components/repo/readme-viewer";
import { TrendChart } from "@/components/repo/trend-chart";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  const detail = await getRepoDetail(owner, repo);
  if (!detail) {
    return { title: "Repository not found" };
  }
  const description =
    detail.description || `${detail.full_name} - View on Vetta`;
  return {
    title: `${detail.full_name}`,
    description,
    openGraph: {
      title: `${detail.full_name} — Vetta`,
      description,
      images: [{ url: detail.avatar_url }],
    },
  };
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const detail = await getRepoDetail(owner, repo);

  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* 1. 仓库头部元信息 + 内联 KPI */}
        <Suspense fallback={null}>
          <RepoHeader detail={detail} />
        </Suspense>

        {/* 2. KPI 统计卡片（大数字 + sparkline） */}
        <Suspense fallback={null}>
          <StatsCards detail={detail} />
        </Suspense>

        {/* 3. 星星增长折线图 */}
        <Suspense
          fallback={
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-3">
                <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="px-4 py-6">
                <div className="h-54 w-full rounded-md bg-muted animate-pulse" />
              </div>
            </div>
          }
        >
          <StarGrowthChart snapshots={detail.snapshots} />
        </Suspense>

        {/* 4. 复刻趋势折线图（仅在 ≥2 快照时渲染） */}
        {detail.snapshots.length >= 2 && (
          <Suspense
            fallback={
              <div className="rounded-lg border bg-card">
                <div className="border-b px-6 py-3">
                  <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
                </div>
                <div className="px-4 py-6">
                  <div className="h-54 w-full rounded-md bg-muted animate-pulse" />
                </div>
              </div>
            }
          >
            <ForkTrendChart snapshots={detail.snapshots} />
          </Suspense>
        )}

        {/* 5. README */}
        <Suspense
          fallback={
            <div className="rounded-lg border bg-card p-8">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          }
        >
          <ReadmeViewer content={detail.readme_content} />
        </Suspense>

        {/* 6. 趋势历史表 */}
        <Suspense
          fallback={
            <div className="rounded-lg border bg-card p-8">
              <div className="h-4 w-40 rounded-md bg-muted animate-pulse" />
            </div>
          }
        >
          <TrendChart snapshots={detail.snapshots} />
        </Suspense>
      </div>
    </main>
  );
}
