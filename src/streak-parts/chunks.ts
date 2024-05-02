import { writeFile } from "fs/promises";
import { PublicEvents, PublicEventTypes } from "../types/github";
import { chunkify, GRACE_PERIOD, GRACE_PERIOD_DECAY, MAX_ALLOWANCE_TIME_DISTANCE, nullChunkBuster, OFFTIME, ONTIME, setupStreakAndChunk } from "./chunk-utils";
import { handleEvent } from "./chunk-handlers";
import { Chunk, Streak } from "../types/chunks";

export async function chunker(timeline: Record<string, unknown[]>) {
  const timelineChunks = timelineChunker(timeline);
  const avgLinearStreaks = averageStreaksAcrossLinearTimelineChunks(timelineChunks);
  const avgRepoStreaks = avgRepoSpecificStreaks(timelineChunks);
  const avgFancyStreaks = await fancyStreaks(timelineChunks);

  return { avgLinearStreaks, avgRepoStreaks, avgFancyStreaks };
}

async function fancyStreaks(timelineChunks: Record<string, Chunk[]>) {
  let { streak, lastViewedChunk } = setupStreakAndChunk();
  const allChunks = Object.values(timelineChunks).flat();

  for (const chunk of allChunks) {
    const { events } = chunk;
    const eventMap = {} as Record<PublicEventTypes, PublicEvents[]>;
    const dataMap = {} as Record<PublicEventTypes, unknown[]>;

    for (const event of events) {
      eventMap[event.type].push(event);
      dataMap[event.type].push(handleEvent(event));
    }

    await writeFile("fancy-streaks.json", JSON.stringify(dataMap, null, 2));
  }
}

/**
 * Gathers the streaks for each repo
 * @param timelineChunks Timeline chunks
 * @returns Detailed streaks
 */
async function avgRepoSpecificStreaks(timelineChunks: Record<string, Chunk[]>) {
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

  await writeFile("repo-specific-streaks.json", JSON.stringify(detailedStreaks, null, 2));

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
async function averageStreaksAcrossLinearTimelineChunks(timelineChunks: Record<string, Chunk[]>) {
  const allChunks = Object.values(timelineChunks).flat();
  const detailedStreaks: Record<string, Streak[]> = {};
  let { streak, lastViewedChunk } = setupStreakAndChunk();

  for (const chunk of allChunks) {
    const { start: lastStart, end: lastEnd } = lastViewedChunk;
    const { start, end } = chunk;

    const distance = end.getTime() - lastStart.getTime(); // time between chunks
    const isGraceDecayActive = distance > GRACE_PERIOD_DECAY; // 1 day
    const isWithinMaxAllowance = distance < MAX_ALLOWANCE_TIME_DISTANCE; // 3 days - first 16 hours
    const isWithinGrace = streak.gracePeriod > 0 && distance <= streak.gracePeriod; // 2 days decrimenting
    lastViewedChunk = chunk;

    if (!detailedStreaks[chunk.repo]) {
      detailedStreaks[chunk.repo] = [];
    }

    if (!isWithinMaxAllowance && !isWithinGrace && streak.count > 0) {
      const detailedStreak = {
        ...streak,
        // last chunk of the streak
        lastChunk: {
          start: lastStart,
          end: lastEnd,
        },
      };
      detailedStreaks[chunk.repo].push(detailedStreak);
      streak = {
        count: 0,
        gracePeriod: GRACE_PERIOD,
        chunkCount: 0,

        // first chunk is the first chunk of the streak
        firstChunk: {
          start,
          end,
        },
      };
    }

    if (!isGraceDecayActive) {
      streak.count++; // 24hrs
    } else if (isWithinMaxAllowance || isWithinGrace) {
      streak.count++; // 3 days
      streak.gracePeriod -= distance;
    }

    streak.chunkCount++;
  }

  await writeFile("linear-streaks.json", JSON.stringify(detailedStreaks, null, 2));

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
 * The grace period begins to decay after 24 hours of inactivity.
 * The grace period is reset to 2 days after a streak is broken.
 */
