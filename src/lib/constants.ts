export const GOALS = {
  WATER_ML: 4000,
  WATER_GLASSES: 10,
  GLASS_ML: 400,
  READING_PAGES: 10,
  PROTEIN_GRAMS: 175,
  WORKOUTS_COUNT: 2,
  OUTDOOR_WORKOUTS: 1,
  STRENGTH_WORKOUTS: 1,
} as const;

export const CHALLENGE_START_DATE = '2026-04-20';

export const WORKOUT_TYPES = {
  OUTDOOR: 'outdoor',
  STRENGTH: 'strength',
} as const;

export const OUTDOOR_SUBTYPES = ['Walk', 'Run+Walk', 'Bike'] as const;

export const WORKOUT_COLORS = {
  outdoor: 'workout',
  strength: 'workout',
} as const;

export function getDayNumber(startDate: string, today: string): number {
  const start = new Date(startDate);
  const current = new Date(today);
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export function getTodayString(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
