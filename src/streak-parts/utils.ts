import { Octokit } from "@octokit/rest";
import { Activity } from "../types/structures";

export function mapEventTypeToActivityType(event: any): Activity["type"] {
  switch (event.type) {
    case "IssueCommentEvent":
      return "comment";
    case "PullRequestReviewEvent":
      return "pull_request_review";
    case "PullRequestReviewCommentEvent":
      return "pull_request_comment";
    case "PullRequestEvent":
      return "pull_request";
    default:
      if (event.pull_request) {
        return "pull_request";
      }
      return "other";
  }
}

export async function isIssue(octokit: Octokit, issueNumber: number, org: string, repo: string) {
  try {
    const issue = await octokit.issues.get({
      owner: org,
      repo: repo.split("/")[1],
      issue_number: issueNumber,
    });

    if (issue.data) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

export async function isPullRequest(octokit: Octokit, pullNumber: number, org: string, repo: string) {
  try {
    const pull = await octokit.pulls.get({
      owner: org,
      repo: repo.split("/")[1],
      pull_number: pullNumber,
    });

    if (pull.data) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}
