/**
 * Web checkout uses discrete dollar tiers (nearest tier to reviewer hourly_rate).
 * Keep in sync with PaymentStep display.
 */
const TIERS: number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500,
  550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
  1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
  2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000,
  5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
];

export function findNearestCheckoutTierDollars(rate: number): number {
  if (rate <= TIERS[0]) return TIERS[0];
  if (rate >= TIERS[TIERS.length - 1]) return TIERS[TIERS.length - 1];

  let nearest: number = TIERS[0];
  let minDiff = Math.abs(rate - nearest);

  for (const tier of TIERS) {
    const diff = Math.abs(rate - tier);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = tier;
    }
  }

  return nearest;
}
