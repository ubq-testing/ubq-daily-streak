import { StreakInfo } from "./streak-info";
import { Activity } from "../types/structures";

export async function findStreaks(activities: Activity[], gracePeriodLimit = 2): Promise<StreakInfo[]> {
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
