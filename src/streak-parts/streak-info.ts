export class StreakInfo {
  constructor(
    public startDate: Date,
    public endDate: Date,
    public streak: number,
    public gracePeriodUsed = 0,
    public gracePeriodLimit = 2
  ) {}

  updateGracePeriodUsed(days: number): void {
    this.gracePeriodUsed += days;
  }

  updateStreakBasedOnGracePeriod(): void {
    const daysToAdd = this.gracePeriodUsed > 0 ? 1 : 0;
    this.streak += daysToAdd;
  }
}
