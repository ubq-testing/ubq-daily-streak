export const ONTIME = ms(24 / 3); // 8 hours
export const OFFTIME = ms((24 * 2) / 3); // 16 hours
export const GRACE_PERIOD_RESET = ms(14 * 24); // 14 days
export const GRACE_PERIOD = ms(2 * 24); // 2 days
export const GRACE_PERIOD_DECAY = ms(24); // 1 day
export const MAX_ALLOWANCE_TIME_DISTANCE = ms(24 * 3); // 3 days

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
export function chunkify(chunks: Record<string, Chunk[]>, repo: string, date: Date, event: PublicEvents) {
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
export function nullChunkBuster(chunks: Chunk[]) {
  return chunks.filter((chunk) => chunk !== null);
}

export function setupStreakAndChunk() {
  const streak = {
    count: 0,
    gracePeriod: GRACE_PERIOD,
    chunkCount: 0,
    firstChunk: {
      start: new Date(),
      end: new Date(),
    },
    lastChunk: {
      start: new Date(),
      end: new Date(),
    },
  };

  const lastViewedChunk: Chunk = {
    start: new Date(),
    end: new Date(),
    events: [],
    repo: "",
  };

  return { streak, lastViewedChunk };
}
