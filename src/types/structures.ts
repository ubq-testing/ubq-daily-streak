export interface Contributor {
  username: string;
  activities: Record<number, Activity[]>;
}

type ActivityType = "comment" | "pull_request_review" | "pull_request_comment" | "pull_request" | "other";

export interface Activity {
  date: Date;
  type: ActivityType;
  repo: string;
  labels: string[];
  issueNumber?: number;
  pullNumber?: number;
}

export interface Reward {
  contributor: Contributor;
  multiplier: number;
  period: string[];
  streak: number;
}
