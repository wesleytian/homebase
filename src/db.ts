import { supabase } from './supabase';
import { Routine, Completion, Todo, ToggleSection, Goal, JournalEntry, MonthlyReflection, ReadingNote, Friend, FriendConnection } from './types';

// Current user ID - set by AuthContext on login
let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

function requireUserId(): string {
  if (!currentUserId) throw new Error('Not authenticated');
  return currentUserId;
}

// Helper to convert snake_case to camelCase
function toCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  }
  return result as T;
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
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => {
    const routine = toCamel<Routine>(r);
    return {
      ...routine,
      currentStreak: routine.currentStreak ?? 0,
      longestStreak: routine.longestStreak ?? 0,
      lastStreakWeek: routine.lastStreakWeek ?? null,
      streakGraceUsed: routine.streakGraceUsed ?? false,
    };
  });
}

export async function addRoutine(routine: Omit<Routine, 'id' | 'order' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'lastStreakWeek' | 'streakGraceUsed'>): Promise<Routine> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('routines').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('routines')
    .insert({
      name: routine.name,
      frequency_per_week: routine.frequencyPerWeek,
      metadata: routine.metadata,
      order: maxOrder + 1,
      created_at: Date.now(),
      current_streak: 0,
      longest_streak: 0,
      last_streak_date: null,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Routine>(data);
}

export async function updateRoutine(routine: Routine): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .update({
      name: routine.name,
      frequency_per_week: routine.frequencyPerWeek,
      metadata: routine.metadata,
      order: routine.order,
    })
    .eq('id', routine.id);
  if (error) throw error;
}

export async function updateRoutineStreak(
  routineId: string,
  currentStreak: number,
  longestStreak: number,
  lastStreakWeek: number | null,
  streakGraceUsed: boolean = false
): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .update({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_streak_week: lastStreakWeek,
      streak_grace_used: streakGraceUsed,
    })
    .eq('id', routineId);
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderRoutines(routines: Routine[]): Promise<void> {
  for (let i = 0; i < routines.length; i++) {
    await supabase.from('routines').update({ order: i }).eq('id', routines[i].id);
  }
}

// Completions
export async function getCompletionsForWeek(weekStart: number): Promise<Completion[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart);
  if (error) throw error;
  return (data || []).map((c) => toCamel<Completion>(c));
}

export async function getAllCompletions(): Promise<Completion[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => toCamel<Completion>(c));
}

// Backfill streaks from historical completion data (weekly streaks)
export async function backfillStreaks(): Promise<void> {
  const [routines, completions] = await Promise.all([
    getAllRoutines(),
    getAllCompletions(),
  ]);

  const completionsByRoutine = new Map<string, number[]>();
  for (const c of completions) {
    if (!completionsByRoutine.has(c.routineId)) {
      completionsByRoutine.set(c.routineId, []);
    }
    completionsByRoutine.get(c.routineId)!.push(c.completedAt);
  }

  for (const routine of routines) {
    const timestamps = completionsByRoutine.get(routine.id) || [];
    if (timestamps.length === 0) continue;

    const countByWeek = new Map<number, number>();
    for (const ts of timestamps) {
      const ws = getWeekStart(new Date(ts));
      countByWeek.set(ws, (countByWeek.get(ws) || 0) + 1);
    }

    const target = routine.frequencyPerWeek;
    const currentWeekStart = getWeekStart();
    const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

    let currentStreak = 0;
    let lastStreakWeek: number | null = null;
    let graceUsed = false;
    let checkWeek = currentWeekStart;

    const currentWeekCount = countByWeek.get(currentWeekStart) || 0;
    if (currentWeekCount >= target) {
      currentStreak = 1;
      lastStreakWeek = currentWeekStart;
      checkWeek = currentWeekStart - 7 * 24 * 60 * 60 * 1000;
    } else {
      checkWeek = prevWeekStart;
    }

    while (true) {
      const count = countByWeek.get(checkWeek) || 0;
      if (count >= target) {
        currentStreak++;
        if (!lastStreakWeek) lastStreakWeek = checkWeek;
        graceUsed = false;
      } else if (!graceUsed && currentStreak > 0) {
        graceUsed = true;
      } else {
        break;
      }
      checkWeek -= 7 * 24 * 60 * 60 * 1000;
    }

    let longestStreak = currentStreak;
    const ascWeeks = Array.from(countByWeek.keys()).sort((a, b) => a - b);
    let tempStreak = 0;
    let tempGrace = false;
    for (let i = 0; i < ascWeeks.length; i++) {
      const count = countByWeek.get(ascWeeks[i]) || 0;
      const prevWeek = i > 0 ? ascWeeks[i - 1] : null;
      const isConsecutive = prevWeek !== null && (ascWeeks[i] - prevWeek === 7 * 24 * 60 * 60 * 1000);
      const isGapOfTwo = prevWeek !== null && (ascWeeks[i] - prevWeek === 14 * 24 * 60 * 60 * 1000);

      if (count >= target) {
        if (isConsecutive || (isGapOfTwo && !tempGrace && tempStreak > 0)) {
          if (isGapOfTwo) tempGrace = true;
          tempStreak++;
        } else {
          tempStreak = 1;
          tempGrace = false;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (isConsecutive && !tempGrace && tempStreak > 0) {
        tempGrace = true;
      } else {
        tempStreak = 0;
        tempGrace = false;
      }
    }

    await updateRoutineStreak(routine.id, currentStreak, longestStreak, lastStreakWeek, graceUsed);
  }
}

export async function addCompletion(routineId: string): Promise<Completion> {
  const userId = requireUserId();
  const weekStart = getWeekStart();
  const { data, error } = await supabase
    .from('completions')
    .insert({
      routine_id: routineId,
      completed_at: Date.now(),
      week_start: weekStart,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Completion>(data);
}

export async function removeLastCompletion(routineId: string, weekStart: number): Promise<void> {
  const userId = requireUserId();
  const { data } = await supabase
    .from('completions')
    .select('id')
    .eq('user_id', userId)
    .eq('routine_id', routineId)
    .eq('week_start', weekStart)
    .order('completed_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    await supabase.from('completions').delete().eq('id', data[0].id);
  }
}

// Todos
export async function getAllTodos(): Promise<Todo[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((t) => toCamel<Todo>(t));
}

export async function addTodo(text: string, sectionId: string | null = null, indent: number = 0): Promise<Todo> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('todos').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('todos')
    .insert({
      text,
      completed: false,
      section_id: sectionId,
      order: maxOrder + 1,
      indent: indent,
      created_at: Date.now(),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Todo>(data);
}

export async function updateTodo(todo: Todo): Promise<void> {
  const updateData: Record<string, unknown> = {
    text: todo.text,
    completed: todo.completed,
    section_id: todo.sectionId,
    order: todo.order,
    indent: todo.indent ?? 0,
  };

  if (todo.completedAt !== undefined) {
    updateData.completed_at = todo.completedAt;
  }

  const { error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', todo.id);

  if (error && !error.message?.includes('completed_at')) {
    throw error;
  }
}

export async function updateTodoText(id: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ text })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTodoIndent(id: string, indent: number): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ indent })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTodoCompleted(id: string, completed: boolean, completedAt: number | null): Promise<void> {
  const updateData: Record<string, unknown> = { completed };
  if (completedAt !== undefined) {
    updateData.completed_at = completedAt;
  }
  const { error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', id);
  if (error && !error.message?.includes('completed_at')) {
    throw error;
  }
}

export async function updateTodoSection(id: string, sectionId: string | null): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ section_id: sectionId })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderTodos(todos: Todo[]): Promise<void> {
  for (let i = 0; i < todos.length; i++) {
    await supabase.from('todos').update({ order: i, section_id: todos[i].sectionId }).eq('id', todos[i].id);
  }
}

// Sections
export async function getAllSections(): Promise<ToggleSection[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => toCamel<ToggleSection>(s));
}

export async function addSection(name: string): Promise<ToggleSection> {
  const userId = requireUserId();
  const { data: existingSection } = await supabase
    .from('sections')
    .select('*')
    .eq('user_id', userId)
    .eq('name', name)
    .single();

  if (existingSection) {
    return toCamel<ToggleSection>(existingSection);
  }

  const { data: existing } = await supabase.from('sections').select('id, order').eq('user_id', userId);
  if (existing) {
    for (const s of existing) {
      await supabase.from('sections').update({ order: s.order + 1 }).eq('id', s.id);
    }
  }

  const { data, error } = await supabase
    .from('sections')
    .insert({
      name,
      collapsed: false,
      order: 0,
      created_at: Date.now(),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<ToggleSection>(data);
}

export async function updateSection(section: ToggleSection): Promise<void> {
  const { error } = await supabase
    .from('sections')
    .update({
      name: section.name,
      collapsed: section.collapsed,
      order: section.order,
    })
    .eq('id', section.id);
  if (error) throw error;
}

export async function deleteSection(id: string): Promise<void> {
  await supabase.from('todos').update({ section_id: null }).eq('section_id', id);
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderSections(sections: ToggleSection[]): Promise<void> {
  for (let i = 0; i < sections.length; i++) {
    await supabase.from('sections').update({ order: i }).eq('id', sections[i].id);
  }
}

// Life Goals
export async function getAllLifeGoals(): Promise<Goal[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('life_goals')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => toCamel<Goal>(g));
}

export async function addLifeGoal(title: string, description: string = ''): Promise<Goal> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('life_goals').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('life_goals')
    .insert({ title, description, order: maxOrder + 1, created_at: Date.now(), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Goal>(data);
}

export async function updateLifeGoal(goal: Goal): Promise<void> {
  const { error } = await supabase
    .from('life_goals')
    .update({ title: goal.title, description: goal.description, order: goal.order })
    .eq('id', goal.id);
  if (error) throw error;
}

export async function deleteLifeGoal(id: string): Promise<void> {
  const { error } = await supabase.from('life_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderLifeGoals(goals: Goal[]): Promise<void> {
  for (let i = 0; i < goals.length; i++) {
    await supabase.from('life_goals').update({ order: i }).eq('id', goals[i].id);
  }
}

// Yearly Goals
export async function getAllYearlyGoals(): Promise<Goal[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('yearly_goals')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => toCamel<Goal>(g));
}

export async function addYearlyGoal(title: string, description: string = ''): Promise<Goal> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('yearly_goals').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('yearly_goals')
    .insert({ title, description, order: maxOrder + 1, created_at: Date.now(), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Goal>(data);
}

export async function updateYearlyGoal(goal: Goal): Promise<void> {
  const { error } = await supabase
    .from('yearly_goals')
    .update({ title: goal.title, description: goal.description, order: goal.order })
    .eq('id', goal.id);
  if (error) throw error;
}

export async function deleteYearlyGoal(id: string): Promise<void> {
  const { error } = await supabase.from('yearly_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderYearlyGoals(goals: Goal[]): Promise<void> {
  for (let i = 0; i < goals.length; i++) {
    await supabase.from('yearly_goals').update({ order: i }).eq('id', goals[i].id);
  }
}

// Quarterly Goals
export async function getAllQuarterlyGoals(): Promise<Goal[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('quarterly_goals')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => ({
    ...toCamel<Goal>(g),
    subtasks: g.subtasks || [],
  }));
}

export async function addQuarterlyGoal(title: string, description: string = ''): Promise<Goal> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('quarterly_goals').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('quarterly_goals')
    .insert({ title, description, subtasks: [], order: maxOrder + 1, created_at: Date.now(), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return { ...toCamel<Goal>(data), subtasks: data.subtasks || [] };
}

export async function updateQuarterlyGoal(goal: Goal): Promise<void> {
  const { error } = await supabase
    .from('quarterly_goals')
    .update({ title: goal.title, description: goal.description, subtasks: goal.subtasks, order: goal.order })
    .eq('id', goal.id);
  if (error) throw error;
}

export async function deleteQuarterlyGoal(id: string): Promise<void> {
  const { error } = await supabase.from('quarterly_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderQuarterlyGoals(goals: Goal[]): Promise<void> {
  for (let i = 0; i < goals.length; i++) {
    await supabase.from('quarterly_goals').update({ order: i }).eq('id', goals[i].id);
  }
}

// Journal
export function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((e) => toCamel<JournalEntry>(e));
}

export async function getJournalEntryByDate(date: string): Promise<JournalEntry | undefined> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamel<JournalEntry>(data) : undefined;
}

export async function getTodayJournalEntry(): Promise<JournalEntry | undefined> {
  return getJournalEntryByDate(getTodayDate());
}

export async function createOrUpdateJournalEntry(entry: Partial<JournalEntry> & { date: string }): Promise<JournalEntry> {
  const userId = requireUserId();
  const existing = await getJournalEntryByDate(entry.date);

  if (existing) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        grateful_for: entry.gratefulFor ?? existing.gratefulFor,
        make_it_great: entry.makeItGreat ?? existing.makeItGreat,
        affirmations: entry.affirmations ?? existing.affirmations,
        amazing_things: entry.amazingThings ?? existing.amazingThings,
        learned: entry.learned ?? existing.learned,
        updated_at: Date.now(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return toCamel<JournalEntry>(data);
  } else {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        date: entry.date,
        grateful_for: entry.gratefulFor || '',
        make_it_great: entry.makeItGreat || '',
        affirmations: entry.affirmations || '',
        amazing_things: entry.amazingThings || '',
        learned: entry.learned || '',
        created_at: Date.now(),
        updated_at: Date.now(),
        user_id: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return toCamel<JournalEntry>(data);
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}

// Reading Notes
export async function getAllReadingNotes(): Promise<ReadingNote[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('reading_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((n) => toCamel<ReadingNote>(n));
}

export async function addReadingNote(source: string, content: string): Promise<ReadingNote> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('reading_notes')
    .insert({ source, content, created_at: Date.now(), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return toCamel<ReadingNote>(data);
}

export async function deleteReadingNote(id: string): Promise<void> {
  const { error } = await supabase.from('reading_notes').delete().eq('id', id);
  if (error) throw error;
}

export async function getRandomReadingNote(): Promise<ReadingNote | null> {
  const userId = requireUserId();
  const { data, error } = await supabase.from('reading_notes').select('*').eq('user_id', userId);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return toCamel<ReadingNote>(data[Math.floor(Math.random() * data.length)]);
}

// Friends
export async function getAllFriends(): Promise<Friend[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((f) => toCamel<Friend>(f));
}

export async function addFriend(name: string, tier: 1 | 2 | 3 | 4 = 3, notes: string = ''): Promise<Friend> {
  const userId = requireUserId();
  const { data: existing } = await supabase.from('friends').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('friends')
    .insert({
      name,
      notes,
      tier,
      last_contact: null,
      order: maxOrder + 1,
      created_at: Date.now(),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Friend>(data);
}

export async function updateFriend(friend: Friend): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .update({
      name: friend.name,
      notes: friend.notes,
      tier: friend.tier,
      last_contact: friend.lastContact,
      order: friend.order,
    })
    .eq('id', friend.id);
  if (error) throw error;
}

export async function deleteFriend(id: string): Promise<void> {
  const { error } = await supabase.from('friends').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderFriends(friends: Friend[]): Promise<void> {
  for (let i = 0; i < friends.length; i++) {
    await supabase.from('friends').update({ order: i }).eq('id', friends[i].id);
  }
}

// Friend Connections
export async function getAllFriendConnections(): Promise<FriendConnection[]> {
  const userId = requireUserId();
  const { data, error } = await supabase.from('friend_connections').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((c) => toCamel<FriendConnection>(c));
}

export async function getConnectionsForFriend(friendId: string): Promise<FriendConnection[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('friend_connections')
    .select('*')
    .eq('user_id', userId)
    .or(`friend_id_1.eq.${friendId},friend_id_2.eq.${friendId}`);
  if (error) throw error;
  return (data || []).map((c) => toCamel<FriendConnection>(c));
}

export async function addFriendConnection(friendId1: string, friendId2: string): Promise<FriendConnection> {
  const userId = requireUserId();
  const { data: existing } = await supabase
    .from('friend_connections')
    .select('id')
    .eq('user_id', userId)
    .or(`and(friend_id_1.eq.${friendId1},friend_id_2.eq.${friendId2}),and(friend_id_1.eq.${friendId2},friend_id_2.eq.${friendId1})`);

  if (existing && existing.length > 0) {
    throw new Error('Connection already exists');
  }

  const { data, error } = await supabase
    .from('friend_connections')
    .insert({
      friend_id_1: friendId1,
      friend_id_2: friendId2,
      created_at: Date.now(),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<FriendConnection>(data);
}

export async function deleteFriendConnection(id: string): Promise<void> {
  const { error } = await supabase.from('friend_connections').delete().eq('id', id);
  if (error) throw error;
}

// Cookie Jar - per user
export async function getCookieJarContent(): Promise<string> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('cookie_jar')
    .select('content')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.content || '';
}

export async function saveCookieJarContent(content: string): Promise<void> {
  const userId = requireUserId();
  const { data: existing } = await supabase
    .from('cookie_jar')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cookie_jar')
      .update({ content, updated_at: Date.now() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('cookie_jar')
      .insert({ content, updated_at: Date.now(), user_id: userId });
    if (error) throw error;
  }
}

// Finances - per user
export async function getFinancesContent(): Promise<string> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('finances')
    .select('content')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.content || '';
}

export async function saveFinancesContent(content: string): Promise<void> {
  const userId = requireUserId();
  const { data: existing } = await supabase
    .from('finances')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('finances')
      .update({ content, updated_at: Date.now() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('finances')
      .insert({ content, updated_at: Date.now(), user_id: userId });
    if (error) throw error;
  }
}

// Quick Notes - per user
export async function getQuickNotesContent(): Promise<string> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('quick_notes')
    .select('content')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.content || '';
}

export async function saveQuickNotesContent(content: string): Promise<void> {
  const userId = requireUserId();
  const { data: existing } = await supabase
    .from('quick_notes')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('quick_notes')
      .update({ content, updated_at: Date.now() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('quick_notes')
      .insert({ content, updated_at: Date.now(), user_id: userId });
    if (error) throw error;
  }
}

// User Settings - per user
export interface UserSettings {
  goalSectionTitles?: Record<string, string>;
  friendsSections?: { id: string; name: string; tier: number }[];
  appSettings?: {
    confettiEnabled?: boolean;
    autoSortCompletedTodos?: boolean;
  };
}

export async function getUserSettings(): Promise<UserSettings> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.settings || {};
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const userId = requireUserId();
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({ settings, updated_at: Date.now() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({ settings, updated_at: Date.now(), user_id: userId });
    if (error) throw error;
  }
}

// Monthly Reflections
export async function getAllMonthlyReflections(): Promise<MonthlyReflection[]> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('monthly_reflections')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => toCamel<MonthlyReflection>(r));
}

export async function getMonthlyReflection(month: string): Promise<MonthlyReflection | undefined> {
  const userId = requireUserId();
  const { data, error } = await supabase
    .from('monthly_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamel<MonthlyReflection>(data) : undefined;
}

export async function createOrUpdateMonthlyReflection(reflection: Partial<MonthlyReflection> & { month: string }): Promise<MonthlyReflection> {
  const userId = requireUserId();
  const existing = await getMonthlyReflection(reflection.month);

  if (existing) {
    const { data, error } = await supabase
      .from('monthly_reflections')
      .update({
        overall: reflection.overall ?? existing.overall,
        challenges: reflection.challenges ?? existing.challenges,
        looking_forward: reflection.lookingForward ?? existing.lookingForward,
        rating_overall: reflection.ratingOverall ?? existing.ratingOverall,
        rating_health: reflection.ratingHealth ?? existing.ratingHealth,
        rating_career: reflection.ratingCareer ?? existing.ratingCareer,
        rating_finances: reflection.ratingFinances ?? existing.ratingFinances,
        rating_friends: reflection.ratingFriends ?? existing.ratingFriends,
        rating_family: reflection.ratingFamily ?? existing.ratingFamily,
        rating_romance: reflection.ratingRomance ?? existing.ratingRomance,
        rating_fun: reflection.ratingFun ?? existing.ratingFun,
        rating_growth: reflection.ratingGrowth ?? existing.ratingGrowth,
        rating_mental_health: reflection.ratingMentalHealth ?? existing.ratingMentalHealth,
        rating_spirituality: reflection.ratingSpirituality ?? existing.ratingSpirituality,
        rating_environment: reflection.ratingEnvironment ?? existing.ratingEnvironment,
        rating_productivity: reflection.ratingProductivity ?? existing.ratingProductivity,
        notes_overall: reflection.notesOverall ?? existing.notesOverall,
        notes_health: reflection.notesHealth ?? existing.notesHealth,
        notes_career: reflection.notesCareer ?? existing.notesCareer,
        notes_finances: reflection.notesFinances ?? existing.notesFinances,
        notes_friends: reflection.notesFriends ?? existing.notesFriends,
        notes_family: reflection.notesFamily ?? existing.notesFamily,
        notes_romance: reflection.notesRomance ?? existing.notesRomance,
        notes_fun: reflection.notesFun ?? existing.notesFun,
        notes_growth: reflection.notesGrowth ?? existing.notesGrowth,
        notes_mental_health: reflection.notesMentalHealth ?? existing.notesMentalHealth,
        notes_spirituality: reflection.notesSpirituality ?? existing.notesSpirituality,
        notes_environment: reflection.notesEnvironment ?? existing.notesEnvironment,
        notes_productivity: reflection.notesProductivity ?? existing.notesProductivity,
        updated_at: Date.now(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return toCamel<MonthlyReflection>(data);
  } else {
    const { data, error } = await supabase
      .from('monthly_reflections')
      .insert({
        month: reflection.month,
        overall: reflection.overall || '',
        challenges: reflection.challenges || '',
        looking_forward: reflection.lookingForward || '',
        rating_overall: reflection.ratingOverall ?? 0,
        rating_health: reflection.ratingHealth ?? 0,
        rating_career: reflection.ratingCareer ?? 0,
        rating_finances: reflection.ratingFinances ?? 0,
        rating_friends: reflection.ratingFriends ?? 0,
        rating_family: reflection.ratingFamily ?? 0,
        rating_romance: reflection.ratingRomance ?? 0,
        rating_fun: reflection.ratingFun ?? 0,
        rating_growth: reflection.ratingGrowth ?? 0,
        rating_mental_health: reflection.ratingMentalHealth ?? 0,
        rating_spirituality: reflection.ratingSpirituality ?? 0,
        rating_environment: reflection.ratingEnvironment ?? 0,
        rating_productivity: reflection.ratingProductivity ?? 0,
        notes_overall: reflection.notesOverall || '',
        notes_health: reflection.notesHealth || '',
        notes_career: reflection.notesCareer || '',
        notes_finances: reflection.notesFinances || '',
        notes_friends: reflection.notesFriends || '',
        notes_family: reflection.notesFamily || '',
        notes_romance: reflection.notesRomance || '',
        notes_fun: reflection.notesFun || '',
        notes_growth: reflection.notesGrowth || '',
        notes_mental_health: reflection.notesMentalHealth || '',
        notes_spirituality: reflection.notesSpirituality || '',
        notes_environment: reflection.notesEnvironment || '',
        notes_productivity: reflection.notesProductivity || '',
        created_at: Date.now(),
        updated_at: Date.now(),
        user_id: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return toCamel<MonthlyReflection>(data);
  }
}


export async function deleteMonthlyReflection(month: string): Promise<void> {
  const userId = requireUserId();
  const { error } = await supabase
    .from('monthly_reflections')
    .delete()
    .eq('user_id', userId)
    .eq('month', month);
  if (error) throw error;
}

// Lifetime stats
export interface LifetimeStats {
  totalTodosCreated: number;
  totalTodosCompleted: number;
  totalRoutineCompletions: number;
  totalJournalEntries: number;
  totalReadingNotes: number;
  totalMonthlyReflections: number;
  longestRoutineStreak: number;
  longestStreakRoutineName: string;
  accountCreatedAt: number | null;
}

export async function getLifetimeStats(): Promise<LifetimeStats> {
  const userId = requireUserId();
  const [todos, completions, journals, notes, reflections, routines] = await Promise.all([
    supabase.from('todos').select('id, completed, created_at').eq('user_id', userId),
    supabase.from('completions').select('id').eq('user_id', userId),
    supabase.from('journal_entries').select('id').eq('user_id', userId),
    supabase.from('reading_notes').select('id').eq('user_id', userId),
    supabase.from('monthly_reflections').select('id').eq('user_id', userId),
    supabase.from('routines').select('name, longest_streak, created_at').eq('user_id', userId).order('longest_streak', { ascending: false }),
  ]);

  const todosData = todos.data || [];
  const routinesData = routines.data || [];
  const topRoutine = routinesData[0];

  let earliest: number | null = null;
  for (const t of todosData) {
    if (t.created_at && (!earliest || t.created_at < earliest)) earliest = t.created_at;
  }
  for (const r of routinesData) {
    if (r.created_at && (!earliest || r.created_at < earliest)) earliest = r.created_at;
  }

  return {
    totalTodosCreated: todosData.length,
    totalTodosCompleted: todosData.filter((t: { completed: boolean }) => t.completed).length,
    totalRoutineCompletions: (completions.data || []).length,
    totalJournalEntries: (journals.data || []).length,
    totalReadingNotes: (notes.data || []).length,
    totalMonthlyReflections: (reflections.data || []).length,
    longestRoutineStreak: topRoutine?.longest_streak || 0,
    longestStreakRoutineName: topRoutine?.name || '',
    accountCreatedAt: earliest,
  };
}

// Dashboard stats
export interface DashboardStats {
  todosCompletedThisWeek: number;
  dayStreak: number;
  bestRoutineStreak: number;
  bestRoutineStreakName: string;
  daysOnPlatform: number;
}

export async function getDashboardStats(weekStart: number): Promise<DashboardStats> {
  const userId = requireUserId();
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

  const [todosRes, completionsRes, journalsRes, routinesRes] = await Promise.all([
    supabase.from('todos').select('completed_at').eq('user_id', userId).not('completed_at', 'is', null),
    supabase.from('completions').select('completed_at').eq('user_id', userId),
    supabase.from('journal_entries').select('created_at').eq('user_id', userId),
    supabase.from('routines').select('name, current_streak, longest_streak, frequency_per_week, created_at').eq('user_id', userId).order('current_streak', { ascending: false }),
  ]);

  const allCompletedTodos = todosRes.data || [];
  const todosCompletedThisWeek = allCompletedTodos.filter(
    (t: { completed_at: number }) => t.completed_at >= weekStart && t.completed_at < weekEnd
  ).length;

  const routinesData = routinesRes.data || [];
  const topRoutine = routinesData[0];

  let earliest: number | null = null;
  for (const r of routinesData) {
    if (r.created_at && (!earliest || r.created_at < earliest)) earliest = r.created_at;
  }
  const daysOnPlatform = earliest ? Math.floor((Date.now() - earliest) / (1000 * 60 * 60 * 24)) : 0;

  const activeDates = new Set<string>();
  const toDateStr = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  for (const t of allCompletedTodos) {
    if (t.completed_at) activeDates.add(toDateStr(t.completed_at));
  }
  for (const c of (completionsRes.data || [])) {
    if (c.completed_at) activeDates.add(toDateStr(c.completed_at));
  }
  for (const j of (journalsRes.data || [])) {
    if (j.created_at) activeDates.add(toDateStr(j.created_at));
  }

  let dayStreak = 0;
  const now = new Date();
  const check = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!activeDates.has(toDateStr(check.getTime()))) {
    check.setDate(check.getDate() - 1);
  }
  while (activeDates.has(toDateStr(check.getTime()))) {
    dayStreak++;
    check.setDate(check.getDate() - 1);
  }

  return {
    todosCompletedThisWeek,
    dayStreak,
    bestRoutineStreak: topRoutine?.current_streak || 0,
    bestRoutineStreakName: topRoutine?.name || '',
    daysOnPlatform,
  };
}
