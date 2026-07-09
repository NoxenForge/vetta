import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, Readme } from "./types";

export const readmeFetcher: Fetcher<Readme> = {
  name: "readme",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<Readme> {
    const response = await githubFetch(`/repos/${owner}/${repo}/readme`, {
      accept: "application/vnd.github.v3.raw",
      signal: ctx.signal,
    });
    const content = await response.text();

    return {
      repo_id: 0, // 由 Job 层在外层补填
      content,
      size_bytes: content.length,
      fetched_at: new Date().toISOString(),
    };
  },
};
