// TODO: probably swap out hours worked for streak length + weight activity type
export function calculateDynamicMultiplier(streakLength: number, totalHoursWorked: number, firstDayMultiplier: number, maxMultiplier: number): number {
  let baseMultiplier = 1;

  // Determine caste based on total hours worked and apply base multiplier adjustments
  if (totalHoursWorked >= 80) {
    // Assuming hardcore working two weeks straight without specifying exact hours
    baseMultiplier = 3; // Higher base for hardcore contributors
  } else if (totalHoursWorked >= 40) {
    // Normal 40-hour work week
    baseMultiplier = 2; // Standard base multiplier
  } else if (totalHoursWorked >= 20) {
    // Part-time
    baseMultiplier = 1.5; // Slightly reduced base multiplier
  }

  // Calculate the preliminary multiplier based on the streak length and adjusted for the caste
  const preliminaryMultiplier = Math.max(1, streakLength - firstDayMultiplier + baseMultiplier);

  // Apply the maximum limit to the multiplier.
  return Math.min(maxMultiplier, preliminaryMultiplier);
}
