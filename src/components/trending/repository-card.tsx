import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Star, GitFork, Clock, TrendingUp } from "lucide-react";
import type { TrendingRepo } from "@/types/ui";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

/** GitHub-style language colors */
const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-[#3178c6]",
  JavaScript: "bg-[#f1e05a]",
  Python: "bg-[#3572A5]",
  Go: "bg-[#00ADD8]",
  Rust: "bg-[#dea584]",
  Java: "bg-[#b07219]",
  "C++": "bg-[#f34b7d]",
  C: "bg-[#555555]",
  "C#": "bg-[#178600]",
  Ruby: "bg-[#701516]",
  PHP: "bg-[#4F5D95]",
  Swift: "bg-[#F05138]",
  Kotlin: "bg-[#A97BFF]",
  Dart: "bg-[#00B4AB]",
  Shell: "bg-[#89e051]",
  HTML: "bg-[#e34c26]",
  CSS: "bg-[#563d7c]",
  Vue: "bg-[#41b883]",
  Lua: "bg-[#000080]",
  Scala: "bg-[#c22d40]",
  Haskell: "bg-[#5e5086]",
  Elixir: "bg-[#6e4a7e]",
  Clojure: "bg-[#db5855]",
  Zig: "bg-[#ec915c]",
  MDX: "bg-[#fcb32c]",
};

function langColor(language: string | null): string {
  if (!language) return "bg-muted-foreground/40";
  return LANG_COLORS[language] ?? "bg-muted-foreground/40";
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function timeAgo(
  dateStr: string,
  t: (key: string, values?: { count: number }) => string,
): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return t("timeAgo.today");
  if (days === 1) return t("timeAgo.oneDay");
  if (days < 30) return t("timeAgo.days", { count: days });
  const months = Math.floor(days / 30);
  if (months === 1) return t("timeAgo.oneMonth");
  if (months < 12) return t("timeAgo.months", { count: months });
  const years = Math.floor(months / 12);
  if (years === 1) return t("timeAgo.oneYear");
  return t("timeAgo.years", { count: years });
}

function starGrowth(repo: TrendingRepo): number {
  return repo.stargazers_count - repo.oldest_stargazers_count;
}

interface RepositoryCardProps {
  repo: TrendingRepo;
}

export async function RepositoryCard({ repo }: RepositoryCardProps) {
  const t = await getTranslations("Trending");
  const growth = starGrowth(repo);
  const color = langColor(repo.language);

  return (
    <Link
      href={`/repo/${repo.owner}/${repo.repo}`}
      className="group relative flex flex-col rounded-lg border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      {/* Header: avatar + name */}
      <div className="flex items-start gap-3">
        <Image
          src={repo.avatar_url}
          alt={repo.owner}
          width={32}
          height={32}
          className="mt-0.5 rounded-full ring-1 ring-border"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
              <span className="text-muted-foreground font-normal">
                {repo.owner}/
              </span>
              {repo.repo}
            </h3>
            {growth > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                {t("starGrowth", { count: formatNumber(growth) })}
              </span>
            )}
          </div>
          {repo.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {repo.description}
            </p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-auto pt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
          <Star className="h-3 w-3" />
          {formatNumber(repo.stargazers_count)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
          <GitFork className="h-3 w-3" />
          {formatNumber(repo.forks_count)}
        </span>
        <span className="inline-flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {timeAgo(repo.pushed_at, t)}
        </span>
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {repo.topics.slice(0, 5).map((topic) => (
            <Badge
              key={topic}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-normal"
            >
              {topic}
            </Badge>
          ))}
          {repo.topics.length > 5 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{repo.topics.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
