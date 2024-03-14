/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: fix types
import { Octokit } from "@octokit/rest";
import { Activity, Reward } from "./src/types/structures";

(async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || "" });

  const user = "Keyrxng";
  const org = "ubiquity";
  const firstDayMultiplier = 3; // On day 3, the multiplier begins.
  const maxMultiplier = 5; // The maximum multiplier allowed.

  const activities = await fetchActivityData(octokit, user, org);

  const streaks = await findStreaks(octokit, user, org);

  const rewards = streaks
    // filter out streaks that are less than 2 days
    .filter((streak) => streak.streak > 1)
    // sort the streaks by the length of the streak
    .sort((a, b) => b.streak - a.streak)
    .map((streak, i) => {
      const userActivities: Record<number, Activity[]> = {};

      // grouping the activities by streak, indexed with formatted array index
      activities.forEach((activity) => {
        if (!activity.date) return;
        if (!activity.repo) {
          console.log(activity);

          throw new Error("Repo is undefined");
        }
        if (activity.date >= streak.startDate && activity.date <= streak.endDate) {
          if (!userActivities[i]) {
            userActivities[i] = [];
          }
          userActivities[i].push(activity);
        }
      });

      // calculate the total hours worked by parsing the related issue labels
      // tried but not v effective
      const totalHoursWorked = 0;

      const multiplier = calculateDynamicMultiplier(streak.streak, totalHoursWorked, firstDayMultiplier, maxMultiplier);

      const reward: Reward = {
        contributor: {
          username: user,
          activities: userActivities,
        },
        multiplier: multiplier,
        period: [streak.startDate.toISOString(), streak.endDate.toISOString()],
        streak: streak.streak,
      };

      return reward;
    });

  for (const reward of rewards) {
    console.log(reward.contributor.username, "\n", reward.contributor.activities);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

class StreakInfo {
  constructor(
    public startDate: Date,
    public endDate: Date,
    public streak: number,
    public gracePeriodUsed = 0,
    public gracePeriodLimit = 2
  ) {}

  updateGracePeriodUsed(days: number): void {
    this.gracePeriodUsed += days;
  }

  updateStreakBasedOnGracePeriod(): void {
    const daysToAdd = this.gracePeriodUsed > 0 ? 1 : 0;
    this.streak += daysToAdd;
  }
}

// TODO: probably swap out hours worked for streak length + weight activity type
function calculateDynamicMultiplier(streakLength: number, totalHoursWorked: number, firstDayMultiplier: number, maxMultiplier: number): number {
  let baseMultiplier = 1;

  // Determine caste based on total hours worked and apply base multiplier adjustments
  if (totalHoursWorked >= 80) {
    // Assuming hardcore working two weeks straight without specifying exact hours
    baseMultiplier = 3; // Higher base for hardcore contributors
  } else if (totalHoursWorked >= 40) {
    // Normal 40-hour work week
    baseMultiplier = 2; // Standard base multiplier
  } else if (totalHoursWorked >= 20) {
    // Part-time
    baseMultiplier = 1.5; // Slightly reduced base multiplier
  }

  // Calculate the preliminary multiplier based on the streak length and adjusted for the caste
  const preliminaryMultiplier = Math.max(1, streakLength - firstDayMultiplier + baseMultiplier);

  // Apply the maximum limit to the multiplier.
  return Math.min(maxMultiplier, preliminaryMultiplier);
}
async function findStreaks(octokit, username: string, org: string, gracePeriodLimit = 2): Promise<StreakInfo[]> {
  const activities = await fetchActivityData(octokit, username, org);
  const streaks: StreakInfo[] = [];
  activities.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentStreakStart = activities[0].date;
  let lastActivityDate = activities[0].date;
  let gracePeriodUsed = 0;

  activities.forEach((activity, index) => {
    const nextActivity = activities[index + 1];
    const daysBetweenActivities = nextActivity ? (nextActivity.date.getTime() - activity.date.getTime()) / (1000 * 3600 * 24) : 0;

    if (daysBetweenActivities <= 1) {
      // Continue current streak
    } else if (daysBetweenActivities <= gracePeriodUsed + gracePeriodLimit) {
      gracePeriodUsed += daysBetweenActivities - 1;
    } else {
      // Streak ends, push the current streak to streaks array
      const streakLength = Math.round((lastActivityDate.getTime() - currentStreakStart.getTime()) / (1000 * 3600 * 24)) + 1;
      streaks.push(new StreakInfo(currentStreakStart, lastActivityDate, streakLength, gracePeriodUsed));
      currentStreakStart = nextActivity ? nextActivity.date : lastActivityDate;
      gracePeriodUsed = 0;
    }

    if (index === activities.length - 1) {
      // Finalize the last streak
      const streakLength = Math.round((activity.date.getTime() - currentStreakStart.getTime()) / (1000 * 3600 * 24)) + 1;
      streaks.push(new StreakInfo(currentStreakStart, activity.date, streakLength, gracePeriodUsed));
    }

    lastActivityDate = activity.date;
  });

  streaks.forEach((streak) => {
    streak.updateStreakBasedOnGracePeriod();
  });

  return streaks;
}

function mapEventTypeToActivityType(event: any): Activity["type"] {
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

async function fetchActivityData(octokit, user: string, org: string): Promise<Activity[]> {
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

  mergedEvents.forEach((event: any) => {
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

    activities.push({
      date: new Date(event.created_at),
      type,
      repo,
      labels: event.labels,
    });
  });

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
}
