import { Octokit } from "@octokit/rest";
import { Activity } from "../types/structures";
import { chunker } from "./chunks";

/**
 * Fetches activity data for a user from GitHub.
 *
 * @param octokit - The Octokit instance used for making API requests.
 * @param user - The username of the user.
 * @param org - The name of the organization.
 * @returns A promise that resolves to an array of activity data.
 */
export async function fetchActivityData(octokit: Octokit, user: string, org: string) {
  // Fetch activity data between startDate and endDate
  const activities: Activity[] = [];

  // grabs all `IssueCommentEvent`
  const publicEventsForUser = await octokit.paginate(octokit.activity.listPublicEventsForUser, {
    username: user,
  });

  // grabs all their pull requests
  const userPullRequests = await octokit.paginate(octokit.search.issuesAndPullRequests, {
    q: `author:${user} type:pr`,
  });

  // grabs all org public repos
  const orgPublicRepos = await octokit.paginate(octokit.repos.listForOrg, {
    org,
  });

  const repos: Set<string> = new Set();

  orgPublicRepos.forEach((repo: any) => {
    repos.add(repo.full_name.split("/")[1]);
  });

  const repoActivityTimeline: Record<string, unknown[]> = {};

  publicEventsForUser
    .sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime())
    .forEach((event: any) => {
      const url = event.repo?.url ?? event.repo?.name ?? event.repo?.full_name ?? event.repo?.repository_url ?? event.repo?.html_url ?? "";
      const repo = url.split("/")[5];

      if (!repos.has(repo)) {
        publicEventsForUser.splice(publicEventsForUser.indexOf(event), 1);
        return;
      }

      if (!repoActivityTimeline[repo]) {
        repoActivityTimeline[repo] = [];
      }

      repoActivityTimeline[repo].push(event);
    });

  for (const pr of userPullRequests) {
    const repo = pr.repository_url.split("/")[5];

    if (!repos.has(repo)) {
      continue;
    }

    if (!repoActivityTimeline[repo]) {
      repoActivityTimeline[repo] = [];
    }
    repoActivityTimeline[repo].push(pr);
  }

  const chunks = await chunker(repoActivityTimeline);
}
