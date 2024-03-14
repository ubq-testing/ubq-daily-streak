import { Context } from "./context";
import { Activity, Contributor } from "./structures";
// import Octokit from "@octokit/rest";

/**
 * The DailyStreakEngine is a stateful engine that keeps track of the daily streaks of contributors within an organization.
 *
 * The DailyStreakEngine is responsible for:
 * - Aggregating all contributions across all repositories within a specific organization of a specific contributor, and collecting their timestamps
 * - Approximating the contributor's workday based on clusters of work.
 * - Weighting the contributions based on the type of activity
 * - Evaluate individual or organization-wide streaks
 */

export class DailyStreakEngine {
  organization: string; // the organization's name
  weightedActivities: Record<Contributor["username"], Record<Activity["type"], number>> = {}; // the contributor's weighted activities
  activities: Record<Contributor["username"], Activity[]> = {}; // the contributor's activities
  workdays: Record<Contributor["username"], Date[]> = {}; // the contributor's workdays
  streaks: number[] = []; // the contributor's streaks

  config: Context["config"];
  octokit: Context["octokit"];
  payload: Context["payload"];
  logger: Context["logger"];

  constructor(organization: string, context: Context) {
    this.organization = organization;
    this.octokit = context.octokit;
    this.config = context.config;
    this.payload = context.payload;
    this.logger = context.logger;
  }

  async fetchRepos(): Promise<string[]> {
    return await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org: this.organization,
    });
  }
}
