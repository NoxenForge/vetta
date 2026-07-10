import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepoDetail } from "@/lib/repository.service";
import { RepoHeader } from "@/components/repo/repo-header";
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
        <Suspense fallback={null}>
          <RepoHeader detail={detail} />
        </Suspense>

        <Suspense
          fallback={
            <div className="rounded-lg border bg-card p-8">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          }
        >
          <ReadmeViewer content={detail.readme_content} />
        </Suspense>

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
