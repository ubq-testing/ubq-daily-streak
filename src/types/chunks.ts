import { PublicEvents } from "./github";

export type Chunk = {
  start: Date;
  end: Date;
  events: PublicEvents[];
  repo: string;
};

export type Streak = {
  count: number;
  gracePeriod: number;
  chunkCount: number;
  firstChunk?: {
    start: Date;
    end: Date;
  };
  lastChunk?: {
    start: Date;
    end: Date;
  };
};
export type PRStreakData = {
  timeToMerge: number | false;
  timeToClose: number | false;
  closedOrMerged: "closed" | "merged";
  event_created_at: Date;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  merged_at: Date | null;
};
