/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: fix types
import { Octokit } from "@octokit/rest";
import { Activity, Reward } from "../types/structures";
import { calculateDynamicMultiplier } from "./calc-dynamic-multiplier";
import { fetchActivityData } from "./fetch-activity-data";
import { findStreaks } from "./find-streaks";
import dotenv from "dotenv";
dotenv.config();

export async function getStreaks() {
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
