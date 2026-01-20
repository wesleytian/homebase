import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Routine, Completion, Todo, ToggleSection, Goal, JournalEntry, ReadingNote, Friend, FriendConnection, CookieJarContent } from './types';

interface AppDB extends DBSchema {
  routines: {
    key: string;
    value: Routine;
  };
  completions: {
    key: string;
    value: Completion;
    indexes: { 'by-routine': string; 'by-week': number };
  };
  todos: {
    key: string;
    value: Todo;
    indexes: { 'by-order': number };
  };
  sections: {
    key: string;
    value: ToggleSection;
    indexes: { 'by-order': number };
  };
  lifeGoals: {
    key: string;
    value: Goal;
    indexes: { 'by-order': number };
  };
  yearlyGoals: {
    key: string;
    value: Goal;
    indexes: { 'by-order': number };
  };
  quarterlyGoals: {
    key: string;
    value: Goal;
    indexes: { 'by-order': number };
  };
  journal: {
    key: string;
    value: JournalEntry;
    indexes: { 'by-date': string };
  };
  readingNotes: {
    key: string;
    value: ReadingNote;
  };
  friends: {
    key: string;
    value: Friend;
    indexes: { 'by-order': number; 'by-tier': number };
  };
  friendConnections: {
    key: string;
    value: FriendConnection;
    indexes: { 'by-friend': string };
  };
  cookieJar: {
    key: string;
    value: CookieJarContent;
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('weekly-routines', 9, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('routines', { keyPath: 'id' });
          const completionStore = db.createObjectStore('completions', { keyPath: 'id' });
          completionStore.createIndex('by-routine', 'routineId');
          completionStore.createIndex('by-week', 'weekStart');
        }
        if (oldVersion < 2) {
          const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
          todoStore.createIndex('by-order', 'order');
          const sectionStore = db.createObjectStore('sections', { keyPath: 'id' });
          sectionStore.createIndex('by-order', 'order');
        }
        if (oldVersion < 5) {
          // Create new goal stores
          const lifeGoalStore = db.createObjectStore('lifeGoals', { keyPath: 'id' });
          lifeGoalStore.createIndex('by-order', 'order');
          const yearlyGoalStore = db.createObjectStore('yearlyGoals', { keyPath: 'id' });
          yearlyGoalStore.createIndex('by-order', 'order');
          const quarterlyGoalStore = db.createObjectStore('quarterlyGoals', { keyPath: 'id' });
          quarterlyGoalStore.createIndex('by-order', 'order');
        }
        if (oldVersion < 6) {
          const journalStore = db.createObjectStore('journal', { keyPath: 'id' });
          journalStore.createIndex('by-date', 'date');
        }
        if (oldVersion < 7) {
          db.createObjectStore('readingNotes', { keyPath: 'id' });
        }
        if (oldVersion < 8) {
          const friendsStore = db.createObjectStore('friends', { keyPath: 'id' });
          friendsStore.createIndex('by-order', 'order');
          db.createObjectStore('cookieJar', { keyPath: 'id' });
        }
        if (oldVersion < 9) {
          // Create connections store (tier index on friends would require accessing transaction)
          const connectionsStore = db.createObjectStore('friendConnections', { keyPath: 'id' });
          connectionsStore.createIndex('by-friend', 'friendId1');
        }
      },
    });
  }
  return dbPromise;
}

// Week helpers
export function getWeekStart(date: Date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Routines
export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDB();
  const routines = await db.getAll('routines');
  return routines.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function addRoutine(routine: Omit<Routine, 'id' | 'order' | 'createdAt'>): Promise<Routine> {
  const db = await getDB();
  const routines = await db.getAll('routines');
  const maxOrder = routines.length > 0 ? Math.max(...routines.map((r) => r.order ?? 0)) : -1;
  const newRoutine: Routine = {
    ...routine,
    id: crypto.randomUUID(),
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('routines', newRoutine);
  return newRoutine;
}

export async function updateRoutine(routine: Routine): Promise<void> {
  const db = await getDB();
  await db.put('routines', routine);
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('routines', id);
  const completions = await db.getAllFromIndex('completions', 'by-routine', id);
  for (const c of completions) {
    await db.delete('completions', c.id);
  }
}

export async function reorderRoutines(routines: Routine[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('routines', 'readwrite');
  for (let i = 0; i < routines.length; i++) {
    const routine = { ...routines[i], order: i };
    tx.store.put(routine);
  }
  await tx.done;
}

// Completions
export async function getCompletionsForWeek(weekStart: number): Promise<Completion[]> {
  const db = await getDB();
  return db.getAllFromIndex('completions', 'by-week', weekStart);
}

export async function addCompletion(routineId: string): Promise<Completion> {
  const db = await getDB();
  const weekStart = getWeekStart();
  const completion: Completion = {
    id: crypto.randomUUID(),
    routineId,
    completedAt: Date.now(),
    weekStart,
  };
  await db.put('completions', completion);
  return completion;
}

export async function removeLastCompletion(routineId: string, weekStart: number): Promise<void> {
  const db = await getDB();
  const completions = await db.getAllFromIndex('completions', 'by-week', weekStart);
  const routineCompletions = completions
    .filter((c) => c.routineId === routineId)
    .sort((a, b) => b.completedAt - a.completedAt);
  if (routineCompletions.length > 0) {
    await db.delete('completions', routineCompletions[0].id);
  }
}

// Todos
export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDB();
  const todos = await db.getAll('todos');
  return todos.sort((a, b) => a.order - b.order);
}

export async function addTodo(text: string, sectionId: string | null = null): Promise<Todo> {
  const db = await getDB();
  const todos = await db.getAll('todos');
  const maxOrder = todos.length > 0 ? Math.max(...todos.map((t) => t.order)) : -1;
  const todo: Todo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    sectionId,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('todos', todo);
  return todo;
}

export async function updateTodo(todo: Todo): Promise<void> {
  const db = await getDB();
  await db.put('todos', todo);
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('todos', id);
}

export async function reorderTodos(todos: Todo[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('todos', 'readwrite');
  for (let i = 0; i < todos.length; i++) {
    const todo = { ...todos[i], order: i };
    tx.store.put(todo);
  }
  await tx.done;
}

// Sections
export async function getAllSections(): Promise<ToggleSection[]> {
  const db = await getDB();
  const sections = await db.getAll('sections');
  return sections.sort((a, b) => a.order - b.order);
}

export async function addSection(name: string): Promise<ToggleSection> {
  const db = await getDB();
  const sections = await db.getAll('sections');

  // Shift all existing sections down by incrementing their order
  const tx = db.transaction('sections', 'readwrite');
  for (const s of sections) {
    await tx.store.put({ ...s, order: s.order + 1 });
  }
  await tx.done;

  const section: ToggleSection = {
    id: crypto.randomUUID(),
    name,
    collapsed: false,
    order: 0,
    createdAt: Date.now(),
  };
  await db.put('sections', section);
  return section;
}

export async function updateSection(section: ToggleSection): Promise<void> {
  const db = await getDB();
  await db.put('sections', section);
}

export async function deleteSection(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sections', id);
  // Move todos from this section to unsectioned
  const todos = await db.getAll('todos');
  const tx = db.transaction('todos', 'readwrite');
  for (const todo of todos) {
    if (todo.sectionId === id) {
      tx.store.put({ ...todo, sectionId: null });
    }
  }
  await tx.done;
}

export async function reorderSections(sections: ToggleSection[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sections', 'readwrite');
  for (let i = 0; i < sections.length; i++) {
    const section = { ...sections[i], order: i };
    tx.store.put(section);
  }
  await tx.done;
}

// Life Goals
export async function getAllLifeGoals(): Promise<Goal[]> {
  const db = await getDB();
  const goals = await db.getAll('lifeGoals');
  return goals.sort((a, b) => a.order - b.order);
}

export async function addLifeGoal(title: string, description: string = ''): Promise<Goal> {
  const db = await getDB();
  const goals = await db.getAll('lifeGoals');
  const maxOrder = goals.length > 0 ? Math.max(...goals.map((g) => g.order)) : -1;
  const goal: Goal = {
    id: crypto.randomUUID(),
    title,
    description,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('lifeGoals', goal);
  return goal;
}

export async function updateLifeGoal(goal: Goal): Promise<void> {
  const db = await getDB();
  await db.put('lifeGoals', goal);
}

export async function deleteLifeGoal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('lifeGoals', id);
}

export async function reorderLifeGoals(goals: Goal[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('lifeGoals', 'readwrite');
  for (let i = 0; i < goals.length; i++) {
    const goal = { ...goals[i], order: i };
    tx.store.put(goal);
  }
  await tx.done;
}

// Yearly Goals (2026)
export async function getAllYearlyGoals(): Promise<Goal[]> {
  const db = await getDB();
  const goals = await db.getAll('yearlyGoals');
  return goals.sort((a, b) => a.order - b.order);
}

export async function addYearlyGoal(title: string, description: string = ''): Promise<Goal> {
  const db = await getDB();
  const goals = await db.getAll('yearlyGoals');
  const maxOrder = goals.length > 0 ? Math.max(...goals.map((g) => g.order)) : -1;
  const goal: Goal = {
    id: crypto.randomUUID(),
    title,
    description,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('yearlyGoals', goal);
  return goal;
}

export async function updateYearlyGoal(goal: Goal): Promise<void> {
  const db = await getDB();
  await db.put('yearlyGoals', goal);
}

export async function deleteYearlyGoal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('yearlyGoals', id);
}

export async function reorderYearlyGoals(goals: Goal[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('yearlyGoals', 'readwrite');
  for (let i = 0; i < goals.length; i++) {
    const goal = { ...goals[i], order: i };
    tx.store.put(goal);
  }
  await tx.done;
}

// Quarterly Goals
export async function getAllQuarterlyGoals(): Promise<Goal[]> {
  const db = await getDB();
  const goals = await db.getAll('quarterlyGoals');
  return goals.sort((a, b) => a.order - b.order);
}

export async function addQuarterlyGoal(title: string, description: string = ''): Promise<Goal> {
  const db = await getDB();
  const goals = await db.getAll('quarterlyGoals');
  const maxOrder = goals.length > 0 ? Math.max(...goals.map((g) => g.order)) : -1;
  const goal: Goal = {
    id: crypto.randomUUID(),
    title,
    description,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('quarterlyGoals', goal);
  return goal;
}

export async function updateQuarterlyGoal(goal: Goal): Promise<void> {
  const db = await getDB();
  await db.put('quarterlyGoals', goal);
}

export async function deleteQuarterlyGoal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('quarterlyGoals', id);
}

export async function reorderQuarterlyGoals(goals: Goal[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('quarterlyGoals', 'readwrite');
  for (let i = 0; i < goals.length; i++) {
    const goal = { ...goals[i], order: i };
    tx.store.put(goal);
  }
  await tx.done;
}

// Journal
export function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDB();
  const entries = await db.getAll('journal');
  return entries.sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

export async function getJournalEntryByDate(date: string): Promise<JournalEntry | undefined> {
  const db = await getDB();
  return db.getFromIndex('journal', 'by-date', date);
}

export async function getTodayJournalEntry(): Promise<JournalEntry | undefined> {
  return getJournalEntryByDate(getTodayDate());
}

export async function createOrUpdateJournalEntry(entry: Partial<JournalEntry> & { date: string }): Promise<JournalEntry> {
  const db = await getDB();
  const existing = await getJournalEntryByDate(entry.date);

  if (existing) {
    const updated: JournalEntry = {
      ...existing,
      ...entry,
      updatedAt: Date.now(),
    };
    await db.put('journal', updated);
    return updated;
  } else {
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      date: entry.date,
      gratefulFor: entry.gratefulFor || '',
      makeItGreat: entry.makeItGreat || '',
      affirmations: entry.affirmations || '',
      amazingThings: entry.amazingThings || '',
      learned: entry.learned || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('journal', newEntry);
    return newEntry;
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('journal', id);
}

// Reading Notes
export async function getAllReadingNotes(): Promise<ReadingNote[]> {
  const db = await getDB();
  const notes = await db.getAll('readingNotes');
  return notes.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReadingNote(source: string, content: string): Promise<ReadingNote> {
  const db = await getDB();
  const newNote: ReadingNote = {
    id: crypto.randomUUID(),
    source,
    content,
    createdAt: Date.now(),
  };
  await db.put('readingNotes', newNote);
  return newNote;
}

export async function deleteReadingNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('readingNotes', id);
}

export async function getRandomReadingNote(): Promise<ReadingNote | null> {
  const db = await getDB();
  const notes = await db.getAll('readingNotes');
  if (notes.length === 0) return null;
  return notes[Math.floor(Math.random() * notes.length)];
}

// Friends
export async function getAllFriends(): Promise<Friend[]> {
  const db = await getDB();
  const friends = await db.getAll('friends');
  return friends.sort((a, b) => a.order - b.order);
}

export async function addFriend(name: string, tier: 1 | 2 | 3 | 4 = 3, notes: string = ''): Promise<Friend> {
  const db = await getDB();
  const friends = await db.getAll('friends');
  const maxOrder = friends.length > 0 ? Math.max(...friends.map((f) => f.order)) : -1;
  const friend: Friend = {
    id: crypto.randomUUID(),
    name,
    notes,
    tier,
    lastContact: null,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await db.put('friends', friend);
  return friend;
}

export async function updateFriend(friend: Friend): Promise<void> {
  const db = await getDB();
  await db.put('friends', friend);
}

export async function deleteFriend(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('friends', id);
}

export async function reorderFriends(friends: Friend[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('friends', 'readwrite');
  for (let i = 0; i < friends.length; i++) {
    const friend = { ...friends[i], order: i };
    tx.store.put(friend);
  }
  await tx.done;
}

// Friend Connections
export async function getAllFriendConnections(): Promise<FriendConnection[]> {
  const db = await getDB();
  return db.getAll('friendConnections');
}

export async function getConnectionsForFriend(friendId: string): Promise<FriendConnection[]> {
  const db = await getDB();
  const allConnections = await db.getAll('friendConnections');
  return allConnections.filter(c => c.friendId1 === friendId || c.friendId2 === friendId);
}

export async function addFriendConnection(friendId1: string, friendId2: string): Promise<FriendConnection> {
  const db = await getDB();
  // Check if connection already exists
  const existing = await db.getAll('friendConnections');
  const alreadyExists = existing.some(
    c => (c.friendId1 === friendId1 && c.friendId2 === friendId2) ||
         (c.friendId1 === friendId2 && c.friendId2 === friendId1)
  );
  if (alreadyExists) {
    throw new Error('Connection already exists');
  }
  const connection: FriendConnection = {
    id: crypto.randomUUID(),
    friendId1,
    friendId2,
    createdAt: Date.now(),
  };
  await db.put('friendConnections', connection);
  return connection;
}

export async function deleteFriendConnection(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('friendConnections', id);
}

// Cookie Jar
const COOKIE_JAR_ID = 'main';

export async function getCookieJarContent(): Promise<string> {
  const db = await getDB();
  const content = await db.get('cookieJar', COOKIE_JAR_ID);
  return content?.content || '';
}

export async function saveCookieJarContent(content: string): Promise<void> {
  const db = await getDB();
  await db.put('cookieJar', {
    id: COOKIE_JAR_ID,
    content,
    updatedAt: Date.now(),
  });
}
