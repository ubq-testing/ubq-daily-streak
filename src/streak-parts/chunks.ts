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

import { writeFile } from "fs/promises";
import {
  CreateEvent,
  IssueCommentEvent,
  IssuesEvent,
  PublicEvents,
  PublicEventTypes,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  PushEvent,
} from "../types/github";

type Chunk = {
  start: Date;
  end: Date;
  events: PublicEvents[];
  repo: string;
};

export const ONTIME = ms(24 / 3); // 8 hours
export const OFFTIME = ms((24 * 2) / 3); // 16 hours
export const GRACE_PERIOD_RESET = ms(14 * 24); // 14 days
export const GRACE_PERIOD = ms(2 * 24); // 2 days
export const GRACE_PERIOD_DECAY = ms(24); // 1 day
export const MAX_ALLOWANCE_TIME_DISTANCE = ms(24 * 3); // 3 days

type Streak = {
  count: number;
  gracePeriod: number;
};
type PRStreakData = {
  timeToMerge: number | false;
  timeToClose: number | false;
  closedOrMerged: "closed" | "merged";
  event_created_at: Date;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  merged_at: Date | null;
};
export async function chunker(timeline: Record<string, unknown[]>) {
  const timelineChunks = timelineChunker(timeline);
  const avgLinearStreaks = averageStreaksAcrossLinearTimelineChunks(timelineChunks);
  const avgRepoStreaks = avgRepoSpecificStreaks(timelineChunks);
}

function fancyStreaks(timelineChunks: Chunk[]) {
  let { streak, lastViewedChunk } = setupStreakAndChunk();

  for (const chunk of timelineChunks) {
    const { start, end, events, repo } = chunk;
    const eventMap = {} as Record<PublicEventTypes, PublicEvents[]>; // eventMap[PushEvent] = [PushEvent, PushEvent, ...]
    const dataMap = {} as Record<PublicEventTypes, unknown[]>; // dataMap[PushEvent] = { pusher, commits, etc... }

    for (const event of events) {
      eventMap[event.type].push(event);
      dataMap[event.type].push(handleEvent(event));
    }

    const comments = dataMap["IssueCommentEvent"] as IssueCommentEvent[];
    const pushes = dataMap["PushEvent"] as PushEvent[];
    const prReviewComments = dataMap["PullRequestReviewCommentEvent"] as PullRequestReviewCommentEvent[];
    const prReviews = dataMap["PullRequestReviewEvent"] as PullRequestReviewEvent[];
    const prs = dataMap["PullRequestEvent"] as PullRequestEvent[];
    const issues = dataMap["IssuesEvent"] as IssuesEvent[];
    const creates = dataMap["CreateEvent"] as CreateEvent[];

    const prMap = {} as Record<string, PRStreakData[]>;

    for (const pr of prs) {
      const { created_at, payload, repo } = pr;
      const { pull_request } = payload;
      const { closed_at, created_at: prCreatedAt, merged_at, updated_at } = pull_request;

      const times = {
        event_created_at: new Date(created_at),
        created_at: new Date(prCreatedAt),
        updated_at: new Date(updated_at),
        closed_at: closed_at ? new Date(closed_at) : null,
        merged_at: merged_at ? new Date(merged_at) : null,
      };

      const timeToMerge = !!times.merged_at && times.merged_at.getTime() - times.created_at.getTime();
      const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
      const closedOrMerged = !times.merged_at ? "closed" : ("merged" as "closed" | "merged");

      const prStreakData = {
        timeToMerge,
        timeToClose,
        closedOrMerged,
        ...times,
      };

      if (!prMap[repo.name]) {
        prMap[repo.name] = [];
      }

      prMap[repo.name].push(prStreakData);
    }
  }
}

function isValidDate(date: Date) {
  return date instanceof Date && !isNaN(date.getTime());
}

function handleEvent(event: PublicEvents) {
  switch (event.type) {
    case "IssueCommentEvent":
      return handleIssueCommentEvent(event as IssueCommentEvent);
    case "PushEvent":
      return handlePushEvent(event as PushEvent);
    case "PullRequestReviewCommentEvent":
      return handlePullRequestReviewCommentEvent(event as PullRequestReviewCommentEvent);
    case "PullRequestReviewEvent":
      return handlePullRequestReviewEvent(event as PullRequestReviewEvent);
    case "PullRequestEvent":
      return handlePullRequestEvent(event as PullRequestEvent);
    case "IssuesEvent":
      return handleIssuesEvent(event as IssuesEvent);
    case "CreateEvent":
      return handleCreateEvent(event as CreateEvent);
    default:
      return null;
  }
}
/**
 * These will be weighted as the least important actions
 *
 * @param event an issue comment event
 * @returns
 */
function handleIssueCommentEvent(event: IssueCommentEvent) {
  const { actor, created_at, id, org, payload, repo, type } = event;

  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
  };
}
function handlePushEvent(event: PushEvent) {
  const { actor, created_at, id, payload, repo, public, type } = event;
  return {
    actor,
    created_at,
    id,
    payload,
    repo,
    public,
    type,
  };
}
function handlePullRequestReviewCommentEvent(event: PullRequestReviewCommentEvent) {
  const { actor, created_at, id, org, payload, public, repo, type } = event;

  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
    public,
  };
}
function handlePullRequestReviewEvent(event: PullRequestReviewEvent) {
  const { actor, created_at, id, org, payload, repo, type } = event;

  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
  };
}
function handlePullRequestEvent(event: PullRequestEvent) {
  const { actor, created_at, id, org, payload, public, repo, type } = event;

  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
    public,
  };
}
function handleIssuesEvent(event: IssuesEvent) {
  const { actor, created_at, id, org, payload, public, repo, type } = event;
  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
    public,
  };
}
function handleCreateEvent(event: CreateEvent) {
  const { actor, created_at, id, org, payload, public, repo, type } = event;
  return {
    actor,
    org,
    type,
    id,
    repo,
    created_at,
    payload,
    public,
  };
}

/**
 * Gathers the streaks for each repo
 * @param timelineChunks Timeline chunks
 * @returns Detailed streaks
 */
function avgRepoSpecificStreaks(timelineChunks: Record<string, Chunk[]>) {
  const detailedStreaks: Record<string, Streak[]> = {};

  for (const repo of Object.keys(timelineChunks)) {
    const chunks = timelineChunks[repo];
    detailedStreaks[repo] = [];

    let streak = {
      count: 0,
      gracePeriod: GRACE_PERIOD,
      chunkCount: 0,
    };

    let lastViewedChunk: Chunk = {
      start: new Date(),
      end: new Date(),
      events: [],
      repo: "",
    };

    for (const chunk of chunks) {
      const { start: lastStart, end: lastEnd } = lastViewedChunk;
      const { start, end } = chunk;

      const distance = end.getTime() - lastStart.getTime(); // time between chunks
      const isGraceDecayActive = distance > GRACE_PERIOD_DECAY; // 1 day
      const isWithinMaxAllowance = distance < MAX_ALLOWANCE_TIME_DISTANCE; // 3 days - first 16 hours
      const isWithinGrace = distance <= streak.gracePeriod && streak.gracePeriod > 0; // 2 days decrimenting
      lastViewedChunk = chunk;

      if (!detailedStreaks[repo]) {
        detailedStreaks[repo] = [];
      }

      if (!isWithinMaxAllowance && !isWithinGrace && streak.count > 0) {
        const detailedStreak = {
          ...streak,
          current: {
            start: start,
            end: end,
          },
          previous: {
            start: lastStart,
            end: lastEnd,
          },
        };

        detailedStreaks[repo].push(detailedStreak);
        streak = {
          count: 0,
          gracePeriod: GRACE_PERIOD,
          chunkCount: 0,
        };
      }

      // within first 24 hours since last chunk
      if (!isGraceDecayActive) {
        streak.count++;
      } else if ((isWithinMaxAllowance && isWithinGrace) || isWithinGrace) {
        // within 3 days and within grace period
        // or just within grace period (hasn't worked in 3.5 days but has full grace period)
        streak.count++;
        streak.gracePeriod -= distance;
      }
      streak.chunkCount++;
    }
  }

  return { detailedStreaks };
}

/**
 * Nothing fancy, an estimate of the average streaks across all chunks
 * regardless of the repo. In theory this should be the most effective way
 * since it's chronological and we can see the average streaks across all
 * chunks.
 *
 * @param timelineChunks Timeline chunks
 * @returns Detailed streaks
 */
function averageStreaksAcrossLinearTimelineChunks(timelineChunks: Record<string, Chunk[]>) {
  const allChunks = Object.values(timelineChunks).flat();
  const detailedStreaks: Record<string, Streak[]> = {};
  let { streak, lastViewedChunk } = setupStreakAndChunk();

  for (const chunk of allChunks) {
    const { start: lastStart, end: lastEnd } = lastViewedChunk;
    const { start, end } = chunk;

    const distance = end.getTime() - lastStart.getTime(); // time between chunks
    const isGraceDecayActive = distance > GRACE_PERIOD_DECAY; // 1 day
    const isWithinMaxAllowance = distance < MAX_ALLOWANCE_TIME_DISTANCE; // 3 days - first 16 hours
    const isWithinGrace = distance <= streak.gracePeriod && streak.gracePeriod > 0; // 2 days decrimenting
    lastViewedChunk = chunk;

    if (!detailedStreaks[chunk.repo]) {
      detailedStreaks[chunk.repo] = [];
    }

    if (!isWithinMaxAllowance && !isWithinGrace && streak.count > 0) {
      const detailedStreak = {
        ...streak,
        current: {
          start: start,
          end: end,
        },
        previous: {
          start: lastStart,
          end: lastEnd,
        },
      };

      detailedStreaks[chunk.repo].push(detailedStreak);
      streak = {
        count: 0,
        gracePeriod: GRACE_PERIOD,
        chunkCount: 0,
      };
    }

    // within first 24 hours since last chunk
    if (!isGraceDecayActive) {
      streak.count++;
    } else if ((isWithinMaxAllowance && isWithinGrace) || isWithinGrace) {
      // within 3 days and within grace period
      // or just within grace period (hasn't worked in 3.5 days but has full grace period)
      streak.count++;
      streak.gracePeriod -= distance;
    }
    streak.chunkCount++;
  }

  return detailedStreaks;
}

/**
 * Takes a timeline, breaking each repo's timeline into chunks
 * removing chunks with no events
 *
 * @param timeline Timeline of events
 * @returns Chronological array of "workable" chunks
 */
function timelineChunker(timeline: Record<string, unknown[]>) {
  const chunks: Record<string, Chunk[]> = {};

  for (const repo of Object.keys(timeline)) {
    const events = timeline[repo] as PublicEvents[];
    // backout if no timeline
    if (events.length === 0) {
      continue;
    }

    chunks[repo] = [];

    for (const event of events) {
      const date = new Date(event.created_at);
      const chnks = chunkify(chunks, repo, date, event);
      chunks[repo] = chnks[repo];
    }

    chunks[repo] = nullChunkBuster(chunks[repo]);
  }

  return chunks;
}

/**
 * Creates a chunk for a given event or pushes
 * the event to an existing chunk
 *
 * @param chunks Chunks object
 * @param repo Belonging repo
 * @param date Date of event
 * @param event Event type
 * @returns Updated chunks object
 */
function chunkify(chunks: Record<string, Chunk[]>, repo: string, date: Date, event: PublicEvents) {
  const chunkIndex = dateToChunk(date);
  const chunk = chunks[repo][chunkIndex];

  if (!chunk) {
    chunks[repo][chunkIndex] = {
      start: chunkToDate(chunkIndex),
      end: chunkToDate(chunkIndex + 1),
      events: [],
      repo,
    };
  }

  chunks[repo][chunkIndex].events.push(event);

  return chunks;
}

/**
 * Converts a date to a chunk number based on ONTIME
 *
 * 1 chunk = 8 hours
 * EG: 2021-01-01 00:00:00 = 0
 *     2021-01-01 08:00:00 = 1
 *     2021-01-01 16:00:00 = 2
 *     etc...
 *
 * @param date Date of event
 * @returns Chunk number
 */
export function dateToChunk(date: Date) {
  return Math.floor(date.getTime() / ONTIME);
}

/**
 * Converts a chunk number to a date based on ONTIME
 *
 * 1 chunk = 8 hours
 * EG: 0 = 2021-01-01 00:00:00
 *     1 = 2021-01-01 08:00:00
 *     2 = 2021-01-01 16:00:00
 *     etc...
 *
 * @param chunk Chunk number
 * @returns Date of chunk
 */
export function chunkToDate(chunk: number): Date {
  return new Date(chunk * ONTIME);
}

/**
 * Converts hours to milliseconds
 *
 * @param time Time in hours
 * @returns Time in milliseconds
 */
export function ms(time: number) {
  return time * 60 * 60 * 1000;
}

/**
 * Removes null chunks from an array
 *
 * @param chunks Array of chunks
 * @returns Array of chunks without nulls
 */
function nullChunkBuster(chunks: Chunk[]) {
  return chunks.filter((chunk) => chunk !== null);
}

function setupStreakAndChunk() {
  const streak = {
    count: 0,
    gracePeriod: GRACE_PERIOD,
    chunkCount: 0,
  };

  const lastViewedChunk: Chunk = {
    start: new Date(),
    end: new Date(),
    events: [],
    repo: "",
  };

  return { streak, lastViewedChunk };
}
