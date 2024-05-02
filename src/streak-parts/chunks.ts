/**
 * Tracked:
 * - PR creation > PR merge
 * - First commit > Last commit
 * - Consecutive days of work
 * - Grace period
 * - Grace period decay
 * - Streak
 * - Streak reset
 * - Average streak
 *
 * //// Chunks \\\\
 *
 * A workable chunk is expected at least once every three chunks,
 * otherwise the grace period begins to decay.
 *
 * Workable chunks are considered ONTIME
 * Non-workable chunks are considered OFFTIME
 *
 * We are seeing it like this:
 *
 * 1. OFFTIME
 * 2. ONTIME
 * 3. OFFTIME
 *
 * //// Streak Tracking \\\\
 *
 * 1. Task start to merge event (first estimate)
 * 2. First commit to last commit (second estimate)
 * 3. Consecutive days of work (third estimate)
 *
 * Because a contributor may work on multiple tasks at once
 * we'll track the streaks for each task and then average
 * the streaks to get a final streak for the active period.
 *
 * //// Grace Period \\\\
 *
 * The grace period is attached to the streak, not the task.
 *
 * The streak can be extended from task 1 to task 2
 * which transfers whatever grace period balance they have. A user
 * can work task A day 1, task B day 2, task A day 3,4,...,9, task B on days
 * 10,...,15 and they'll have a streak of 15 days and a fresh grace period of 2 days.
 *
 * The grace period begins to decay after 24 hours of inactivity.
 * The grace period is reset to 2 days after a streak is broken.
 *
 * Additionally, we'll consume price and priority labels which should give us
 * some good analytics such as:
 * - Avg time allocated : Avg time taken
 * - Avg price allocated : Avg hours:Earnings
 * - Avg priority allocated : Avg time taken
 */

function ms(time: number) {
  return time * 60 * 60 * 1000;
}

const ONTIME = ms(24 / 3); // 8 hours
const OFFTIME = ms((24 * 2) / 3); // 16 hours
const GRACE_PERIOD_RESET = ms(14 * 24); // 14 days
const GRACE_PERIOD = ms(2 * 24); // 2 days
const GRACE_PERIOD_DECAY = ms(24); // 1 day

/**
 * Converts a given date into a chunk index based on a specific time interval.
 * @notice maps a date to a wo
 * @param date The date to be converted.
 * @returns The chunk index.
 */
export function dateToChunk(date: Date) {
  return Math.floor(date.getTime() / ONTIME);
}

/**
 * Converts a chunk number to a Date object.
 * @notice maps a workable chunk index to a date
 * @param chunk - The chunk number to convert.
 * @returns A Date object representing the converted chunk number.
 */
export function chunkToDate(chunk: number): Date {
  return new Date(chunk * ONTIME);
}

/**
 * Returns the chunk index of the last workable chunk.
 * @notice maps a date to a non-workable chunk index
 * @param date The date to be converted.
 * @returns The chunk index.
 */
export function lastWorkableChunk(date: Date): number {
  return Math.floor(date.getTime() / OFFTIME);
}
