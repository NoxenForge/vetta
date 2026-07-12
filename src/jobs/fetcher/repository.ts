import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, Repository } from "./types";

function toRepository(data: Record<string, unknown>): Repository {
  return {
    id: Number(data.id ?? 0),
    full_name: String(data.full_name ?? ""),
    owner: String((data.owner as Record<string, unknown>)?.login ?? ""),
    repo: String(data.name ?? ""),
    html_url: String(data.html_url ?? ""),
    avatar_url: String(
      (data.owner as Record<string, unknown>)?.avatar_url ?? "",
    ),
    description: typeof data.description === "string" ? data.description : null,
    language: typeof data.language === "string" ? data.language : null,
    topics: Array.isArray(data.topics) ? data.topics : [],
    license:
      data.license && typeof data.license === "object"
        ? String(
            (data.license as Record<string, unknown>).spdx_id ??
              (data.license as Record<string, unknown>).key ??
              "",
          )
        : null,
    homepage: typeof data.homepage === "string" ? data.homepage : null,
    default_branch: String(data.default_branch ?? "main"),
    visibility: String(data.visibility ?? "public"),
    archived: Boolean(data.archived),
    fork: Boolean(data.fork),
    is_template: Boolean(data.is_template),
    github_created_at: String(data.created_at ?? ""),
    github_updated_at: String(data.updated_at ?? ""),
    pushed_at: String(data.pushed_at ?? ""),
    stargazers_count: Number(data.stargazers_count ?? 0),
    forks_count: Number(data.forks_count ?? 0),
    open_issues_count: Number(data.open_issues_count ?? 0),
    fetched_at: new Date().toISOString(),
  };
}

export const repositoryFetcher: Fetcher<Repository> = {
  name: "repository",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<Repository> {
    const response = await githubFetch(`/repos/${owner}/${repo}`, {
      signal: ctx.signal,
    });
    const data = (await response.json()) as Record<string, unknown>;
    return toRepository(data);
  },
};
