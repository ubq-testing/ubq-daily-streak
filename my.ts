/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: fix types
import { Octokit } from "@octokit/rest";
import { Activity, Reward } from "./src/types/structures";

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

(async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || "" });

  const user = "Keyrxng";
  const org = "ubiquity";
  const firstDayMultiplier = 3; // On day 3, the multiplier begins.
  const maxMultiplier = 5; // The maximum multiplier allowed.

  const activities = await fetchActivityData(octokit, user, org);

  const streaks = await findStreaks(octokit, user, org);

  console.log(activities);

  const formattedStreaks = streaks
    // filter out streaks that are less than 2 days
    .filter((streak) => streak.streak > 1)
    // sort the streaks by the length of the streak
    .sort((a, b) => b.streak - a.streak);

  const rewards = formattedStreaks.map((streak, i) => {
    const userActivities: Record<number, Activity[]> = {};

    // grouping the activities by streak, indexed with formatted array index
    activities.forEach((activity) => {
      if (!activity.date) return;
      if (!activity.repo) {
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
async function findStreaks(octokit: Octokit, user: string, org: string, gracePeriodLimit = 2): Promise<StreakInfo[]> {
  const activities = await fetchActivityData(octokit, user, org);

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
        console.error("err");
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
          console.error("err");
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

//  TODO: labels not being assigned to every activity but will try
//  grouping by pr/issue number & repo name then flattening the array
//  better this time around than yesterday

/**
 * {
    date: 2024-03-15T16:40:42.000Z,
    type: 'comment',
    repo: 'ubiquity/.github',
    labels: [ 'Price: 100 USD', 'Time: <2 Hours', 'Priority: 2 (Medium)' ],
    pullNumber: undefined,
    issueNumber: 100
  },
  {
    date: 2024-03-14T12:17:29.000Z,
    type: 'comment',
    repo: 'ubiquity/devpool-directory',
    labels: [],
    pullNumber: undefined,
    issueNumber: 1102
  },
  {
    date: 2024-03-15T13:48:21.000Z,
    type: 'comment',
    repo: 'ubiquity/devpool-directory-bounties',
    labels: [ 'Time: <1 Hour', 'Priority: 1 (Normal)', 'Price: 25 USD' ],
    pullNumber: undefined,
    issueNumber: 22
  },
  {
    date: 2024-03-13T18:01:58.000Z,
    type: 'pull_request_comment',
    repo: 'ubiquity/work.ubq.fi',
    labels: [],
    pullNumber: 22,
    issueNumber: undefined
  },
  {
    date: 2024-03-08T16:52:09.000Z,
    type: 'pull_request_review',
    repo: 'ubiquity/ts-template',
    labels: [],
    pullNumber: 23,
    issueNumber: undefined
  },
  {
    date: 2024-03-15T17:02:35.000Z,
    type: 'comment',
    repo: 'ubiquity/.github',
    labels: [ 'Price: 100 USD', 'Time: <2 Hours', 'Priority: 2 (Medium)' ],
    pullNumber: undefined,
    issueNumber: 100
  },
 * 
 *  
 */
// function parseLabelsForHoursWorked(activity: Activity): number {
//   let hoursWorked = 0;
//   /**
//         'Time: <1 Day',
//         'Time: <1 Hour',
//         'Time: <1 Month',
//         'Time: <1 Week',
//         'Time: <2 Hours',
//         'Time: <2 Weeks',
//         'Time: <3 Hours',
//         'Time: <4 Hours'

//         'Priority: 1 (Normal)',
//         'Priority: 2 (Medium)',
//         'Priority: 3 (High)',
//         'Priority: 4 (Urgent)',
//         'Priority: 5 (Emergency)'
//        */

//   const timeLabels = activity.labels.filter((label) => label.includes("Time:"));
//   const priorityLabels = activity.labels.filter((label) => label.includes("Priority:"));

//   if (timeLabels.length === 0) {
//     return hoursWorked;
//   }

//   return hoursWorked;
// }

async function isIssue(octokit: Octokit, issueNumber: number, org: string, repo: string) {
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

async function isPullRequest(octokit: Octokit, pullNumber: number, org: string, repo: string) {
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
