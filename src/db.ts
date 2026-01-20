import { supabase } from './supabase';
import { Routine, Completion, Todo, ToggleSection, Goal, JournalEntry, ReadingNote, Friend, FriendConnection } from './types';

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
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => toCamel<Routine>(r));
}

export async function addRoutine(routine: Omit<Routine, 'id' | 'order' | 'createdAt'>): Promise<Routine> {
  const { data: existing } = await supabase.from('routines').select('order').order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('routines')
    .insert({
      name: routine.name,
      frequency_per_week: routine.frequencyPerWeek,
      metadata: routine.metadata,
      order: maxOrder + 1,
      created_at: Date.now(),
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
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('week_start', weekStart);
  if (error) throw error;
  return (data || []).map((c) => toCamel<Completion>(c));
}

export async function addCompletion(routineId: string): Promise<Completion> {
  const weekStart = getWeekStart();
  const { data, error } = await supabase
    .from('completions')
    .insert({
      routine_id: routineId,
      completed_at: Date.now(),
      week_start: weekStart,
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Completion>(data);
}

export async function removeLastCompletion(routineId: string, weekStart: number): Promise<void> {
  const { data } = await supabase
    .from('completions')
    .select('id')
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
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((t) => toCamel<Todo>(t));
}

export async function addTodo(text: string, sectionId: string | null = null): Promise<Todo> {
  const { data: existing } = await supabase.from('todos').select('order').order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('todos')
    .insert({
      text,
      completed: false,
      section_id: sectionId,
      order: maxOrder + 1,
      created_at: Date.now(),
    })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Todo>(data);
}

export async function updateTodo(todo: Todo): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({
      text: todo.text,
      completed: todo.completed,
      section_id: todo.sectionId,
      order: todo.order,
    })
    .eq('id', todo.id);
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
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => toCamel<ToggleSection>(s));
}

export async function addSection(name: string): Promise<ToggleSection> {
  // Shift existing sections
  const { data: existing } = await supabase.from('sections').select('id, order');
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
  // Move todos to unsectioned
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
  const { data, error } = await supabase
    .from('life_goals')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => toCamel<Goal>(g));
}

export async function addLifeGoal(title: string, description: string = ''): Promise<Goal> {
  const { data: existing } = await supabase.from('life_goals').select('order').order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('life_goals')
    .insert({ title, description, order: maxOrder + 1, created_at: Date.now() })
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
  const { data, error } = await supabase
    .from('yearly_goals')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => toCamel<Goal>(g));
}

export async function addYearlyGoal(title: string, description: string = ''): Promise<Goal> {
  const { data: existing } = await supabase.from('yearly_goals').select('order').order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('yearly_goals')
    .insert({ title, description, order: maxOrder + 1, created_at: Date.now() })
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
  const { data, error } = await supabase
    .from('quarterly_goals')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((g) => toCamel<Goal>(g));
}

export async function addQuarterlyGoal(title: string, description: string = ''): Promise<Goal> {
  const { data: existing } = await supabase.from('quarterly_goals').select('order').order('order', { ascending: false }).limit(1);
  const maxOrder = existing && existing.length > 0 ? existing[0].order : -1;

  const { data, error } = await supabase
    .from('quarterly_goals')
    .insert({ title, description, order: maxOrder + 1, created_at: Date.now() })
    .select()
    .single();
  if (error) throw error;
  return toCamel<Goal>(data);
}

export async function updateQuarterlyGoal(goal: Goal): Promise<void> {
  const { error } = await supabase
    .from('quarterly_goals')
    .update({ title: goal.title, description: goal.description, order: goal.order })
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
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((e) => toCamel<JournalEntry>(e));
}

export async function getJournalEntryByDate(date: string): Promise<JournalEntry | undefined> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamel<JournalEntry>(data) : undefined;
}

export async function getTodayJournalEntry(): Promise<JournalEntry | undefined> {
  return getJournalEntryByDate(getTodayDate());
}

export async function createOrUpdateJournalEntry(entry: Partial<JournalEntry> & { date: string }): Promise<JournalEntry> {
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
  const { data, error } = await supabase
    .from('reading_notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((n) => toCamel<ReadingNote>(n));
}

export async function addReadingNote(source: string, content: string): Promise<ReadingNote> {
  const { data, error } = await supabase
    .from('reading_notes')
    .insert({ source, content, created_at: Date.now() })
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
  const { data, error } = await supabase.from('reading_notes').select('*');
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return toCamel<ReadingNote>(data[Math.floor(Math.random() * data.length)]);
}

// Friends
export async function getAllFriends(): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map((f) => toCamel<Friend>(f));
}

export async function addFriend(name: string, tier: 1 | 2 | 3 | 4 = 3, notes: string = ''): Promise<Friend> {
  const { data: existing } = await supabase.from('friends').select('order').order('order', { ascending: false }).limit(1);
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
  const { data, error } = await supabase.from('friend_connections').select('*');
  if (error) throw error;
  return (data || []).map((c) => toCamel<FriendConnection>(c));
}

export async function getConnectionsForFriend(friendId: string): Promise<FriendConnection[]> {
  const { data, error } = await supabase
    .from('friend_connections')
    .select('*')
    .or(`friend_id_1.eq.${friendId},friend_id_2.eq.${friendId}`);
  if (error) throw error;
  return (data || []).map((c) => toCamel<FriendConnection>(c));
}

export async function addFriendConnection(friendId1: string, friendId2: string): Promise<FriendConnection> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('friend_connections')
    .select('id')
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

// Cookie Jar
const COOKIE_JAR_ID = '00000000-0000-0000-0000-000000000001';

export async function getCookieJarContent(): Promise<string> {
  const { data, error } = await supabase
    .from('cookie_jar')
    .select('content')
    .eq('id', COOKIE_JAR_ID)
    .maybeSingle();
  if (error) throw error;
  return data?.content || '';
}

export async function saveCookieJarContent(content: string): Promise<void> {
  const { error } = await supabase
    .from('cookie_jar')
    .update({ content, updated_at: Date.now() })
    .eq('id', COOKIE_JAR_ID);
  if (error) throw error;
}
