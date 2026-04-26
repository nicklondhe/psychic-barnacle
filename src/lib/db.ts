import Dexie, { type Table } from 'dexie';

export interface WaterEntry {
  id?: number;
  date: string;
  amount_ml: number;
  logged_at: string;
}

export interface Book {
  id?: number;
  title: string;
  author?: string;
  total_pages?: number;
  current_page: number;
  is_active: boolean;
  started_at: string;
  finished_at?: string;
  created_at: string;
}

export interface ReadingLog {
  id?: number;
  book_id: number;
  date: string;
  pages_read: number;
  start_page?: number;
  end_page?: number;
  duration_minutes?: number;
  logged_at: string;
}

export interface Workout {
  id?: number;
  date: string;
  type: 'outdoor' | 'strength';
  subtype?: string;
  duration_minutes?: number;
  notes?: string;
  logged_at: string;
}

export interface DietEntry {
  id?: number;
  date: string;
  name: string;
  protein_grams: number;
  calories?: number;
  source: 'manual' | 'photo';
  photo_url?: string;
  logged_at: string;
}

export interface ProgressPhoto {
  id?: number;
  date: string;
  photo_url: string;
  logged_at: string;
}

export interface DailyCheckin {
  id?: number;
  date: string;
  no_alcohol: boolean;
  no_cheat_meal: boolean;
  updated_at: string;
}

export interface ChallengeConfig {
  id?: number;
  start_date: string;
}

// Manually marked complete days (for backfilling past days)
export interface CompletedDay {
  id?: number;
  date: string; // unique
}

class TrackerDatabase extends Dexie {
  waterEntries!: Table<WaterEntry>;
  books!: Table<Book>;
  readingLogs!: Table<ReadingLog>;
  workouts!: Table<Workout>;
  dietEntries!: Table<DietEntry>;
  progressPhotos!: Table<ProgressPhoto>;
  dailyCheckins!: Table<DailyCheckin>;
  challengeConfig!: Table<ChallengeConfig>;
  completedDays!: Table<CompletedDay>;

  constructor() {
    super('75hard');
    this.version(1).stores({
      waterEntries: '++id, date',
      books: '++id, is_active',
      readingLogs: '++id, book_id, date',
      workouts: '++id, date, type',
      dietEntries: '++id, date',
      progressPhotos: '++id, &date',
      dailyCheckins: '++id, &date',
      challengeConfig: '++id',
    });
    // v2 adds completedDays for backfilling past days
    this.version(2).stores({
      waterEntries: '++id, date',
      books: '++id, is_active',
      readingLogs: '++id, book_id, date',
      workouts: '++id, date, type',
      dietEntries: '++id, date',
      progressPhotos: '++id, &date',
      dailyCheckins: '++id, &date',
      challengeConfig: '++id',
      completedDays: '++id, &date',
    });
  }
}

// Lazy singleton — never instantiate on the server (SSR runs module-level code too)
let _instance: TrackerDatabase | null = null;

function getInstance(): TrackerDatabase {
  if (!_instance) _instance = new TrackerDatabase();
  return _instance;
}

export const db: TrackerDatabase = new Proxy({} as TrackerDatabase, {
  get(_: TrackerDatabase, prop: string | symbol) {
    return getInstance()[prop as keyof TrackerDatabase];
  },
});

export async function ensureChallengeConfig() {
  const count = await db.challengeConfig.count();
  if (count === 0) {
    await db.challengeConfig.add({ start_date: '2026-04-20' });
  }
}
