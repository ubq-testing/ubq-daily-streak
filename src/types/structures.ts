export interface Contributor {
  username: string;
  activities: Activity[];
}

type ActivityType = "comment" | "push" | "merge" | "review" | "other";

export interface Activity {
  date: Date;
  type: ActivityType;
  repo: string;
}

export interface Reward {
  contributor: Contributor;
  multiplier: number;
  period: Date[];
}
