import { Octokit } from "@octokit/rest";
import { Activity } from "../types/structures";
import { isIssue, isPullRequest, mapEventTypeToActivityType } from "./utils";

export async function fetchActivityData(octokit: Octokit, user: string, org: string): Promise<Activity[]> {
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

  // filter pull requests to only those that are in the org
  const matchedPrsToOrgRepos = userPullRequests.filter((pr: any) => pr.repository_url.includes(org));

  // grabs all org public repos
  const orgPublicRepos = await octokit.paginate(octokit.repos.listForOrg, {
    org,
  });

  // create a map of the org's repos
  const orgRepoMap = new Map(orgPublicRepos.map((repo: any) => [repo.full_name, true]));

  // matches the user's events to the org's repos
  const matchedEventsToOrgRepos = publicEventsForUser.filter((event: any) => orgRepoMap.has(event.repo.name));

  // Merge and sort events by date
  const mergedEvents = [...matchedEventsToOrgRepos, ...matchedPrsToOrgRepos].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // eslint-disable-next-line sonarjs/cognitive-complexity
  mergedEvents.forEach(async (event: any) => {
    const type = mapEventTypeToActivityType(event);

    let repo = event.repo?.name ?? event.repository?.full_name ?? "";

    if (!repo && event.pull_request) {
      repo = event.pull_request.html_url.split("/")[3] + "/" + event.pull_request.html_url.split("/")[4];

      // if the repo owner is not the org, then it's not a valid repo
      // or its an edge case that might get handled TODO: handle edge case
      // seen via Keyrxng/ubiquity-dollar PRs appearing
      if (!repo.includes(org)) {
        return;
      }
    }

    let labels: string[] = [];

    let issueNumber;
    let pullNumber;
    let body;

    if ("payload" in event && "issue" in event.payload) {
      issueNumber = event.payload.issue.number;
      body = event.payload.issue.body;
      labels = event.payload.issue.labels.map((label: any) => label.name);
    }

    if ("payload" in event && "pull_request" in event.payload) {
      pullNumber = event.payload.pull_request.number;
      body = event.payload.pull_request.body;
    }

    if (!pullNumber && event.pull_request) {
      pullNumber = event.pull_request.number;
      body = event.pull_request.body;
    }

    if (!issueNumber && event.issue) {
      issueNumber = event.issue.number;
      body = event.issue.body;
      labels = event.issue.labels.map((label: any) => label.name);
    }

    if (issueNumber && (await isIssue(octokit, issueNumber, org, repo))) {
      try {
        labels = (await octokit.issues.listLabelsOnIssue({ owner: org, repo: repo.split("/")[1], issue_number: issueNumber })).data.map(
          (label: any) => label.name
        );
      } catch (err) {
        console.error("err", err);
      }
    }

    if (pullNumber && (await isPullRequest(octokit, pullNumber, org, repo))) {
      const regex = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+)/gi;
      const matches = body.match(regex);
      if (matches) {
        const issueNumber = matches[0].split("/")[6];
        try {
          labels = (await octokit.issues.listLabelsOnIssue({ owner: org, repo: repo.split("/")[1], issue_number: issueNumber })).data.map(
            (label: any) => label.name
          );
        } catch (err) {
          console.error("err", err);
        }
      }
    }

    activities.push({
      date: new Date(event.created_at),
      type,
      repo,
      labels,
      pullNumber,
      issueNumber,
    });
  });

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
}
