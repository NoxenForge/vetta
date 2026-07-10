import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Star, GitFork, CircleDot, ExternalLink, ArrowLeft, Code2, Globe } from "lucide-react";
import type { RepoDetail } from "@/types/ui";

interface RepoHeaderProps {
  detail: RepoDetail;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export async function RepoHeader({ detail }: RepoHeaderProps) {
  const t = await getTranslations("Repo");

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("backToTrending")}
      </Link>

      <div className="flex items-start gap-4">
        <Image
          src={detail.avatar_url}
          alt={detail.owner}
          width={64}
          height={64}
          className="rounded-full ring-2 ring-border shrink-0"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              <span className="text-muted-foreground font-normal">
                {detail.owner}
              </span>
              <span className="text-muted-foreground">/</span>
              {detail.repo}
            </h1>
            <a
              href={`https://github.com/${detail.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium rounded-lg border bg-background hover:bg-muted hover:text-foreground transition-colors"
            >
              <Code2 className="h-3.5 w-3.5" />
              {t("viewOnGitHub")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {detail.description && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {detail.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {detail.language && (
              <Badge variant="outline" className="gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {detail.language}
              </Badge>
            )}
            {detail.license && (
              <Badge variant="outline" className="text-xs">
                {detail.license}
              </Badge>
            )}
            {detail.homepage && (
              <a
                href={detail.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="h-3 w-3" />
                {t("homepage")}
              </a>
            )}
            {detail.archived && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
              >
                {t("archived")}
              </Badge>
            )}
            {detail.fork && (
              <Badge variant="outline" className="text-xs">
                {t("fork")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground border-b border-border pb-4">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4" />
          <span className="font-mono tabular-nums font-medium text-foreground">
            {formatNumber(detail.stargazers_count)}
          </span>
          {t("stars", { count: detail.stargazers_count }).replace(formatNumber(detail.stargazers_count), "").trim()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GitFork className="h-4 w-4" />
          <span className="font-mono tabular-nums font-medium text-foreground">
            {formatNumber(detail.forks_count)}
          </span>
          {t("forks", { count: detail.forks_count }).replace(formatNumber(detail.forks_count), "").trim()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleDot className="h-4 w-4" />
          <span className="font-mono tabular-nums font-medium text-foreground">
            {formatNumber(detail.open_issues_count)}
          </span>
          {t("issues", { count: detail.open_issues_count }).replace(formatNumber(detail.open_issues_count), "").trim()}
        </span>
        {detail.created_at && (
          <span className="text-xs">
            {t("created", { date: new Date(detail.created_at).toLocaleDateString() })}
          </span>
        )}
      </div>

      {detail.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detail.topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
