export interface Routine {
  id: string;
  name: string;
  frequencyPerWeek: number;
  metadata: string;
  order: number;
  createdAt: number;
}

export interface Completion {
  id: string;
  routineId: string;
  completedAt: number;
  weekStart: number;
}

export interface RoutineWithProgress extends Routine {
  completedThisWeek: number;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  sectionId: string | null;
  order: number;
  indent: number; // 0 = no indent, 1 = one level, etc.
  createdAt: number;
}

export interface ToggleSection {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
  createdAt: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  order: number;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  gratefulFor: string;
  makeItGreat: string;
  affirmations: string;
  amazingThings: string; // placeholder for evening question 1
  learned: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingNote {
  id: string;
  source: string; // URL or name
  content: string;
  createdAt: number;
}

export type FriendTier = 1 | 2 | 3 | 4;

export const FRIEND_TIER_LABELS: Record<FriendTier, string> = {
  1: 'Inner Circle',
  2: 'Close Friends',
  3: 'Friends',
  4: 'Acquaintances',
};

export interface Friend {
  id: string;
  name: string;
  notes: string;
  tier: FriendTier;
  lastContact: number | null;
  order: number;
  createdAt: number;
}

export interface FriendConnection {
  id: string;
  friendId1: string;
  friendId2: string;
  createdAt: number;
}

export interface CookieJarContent {
  id: string;
  content: string;
  updatedAt: number;
}
