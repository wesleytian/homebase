// Fictional dataset for sample mode. Every person, place, and number here is made up.
// Dates are generated relative to "now" so the app always looks current.
import type { User } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

export const SAMPLE_USER = {
  id: 'sample-user',
  email: 'sample@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Sample User' },
  created_at: new Date(0).toISOString(),
} as unknown as User;

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function weekStartOf(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function ymd(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sectionName(ts: number): string {
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const d = new Date(ts);
  return `${days[d.getDay()]}, ${d.getMonth() + 1}/${d.getDate()}`;
}

export function buildSampleTables(): Record<string, Row[]> {
  const now = Date.now();
  const today = startOfDay(new Date());
  const thisWeek = weekStartOf(now);
  const created = today - 200 * DAY;
  const at = (dayOffset: number, hour: number) => today + dayOffset * DAY + hour * 60 * 60 * 1000;
  const year = new Date().getFullYear();
  const quarter = Math.floor(new Date().getMonth() / 3) + 1;

  // ---- Routines + completions ----
  const routineDefs: [string, number, string, number][] = [
    ['Morning run', 3, '5K loop, easy pace', 9],
    ['Strength training', 3, 'Push / pull / legs, 45 min', 14],
    ['Read 30 minutes', 5, 'Currently: a novel about lighthouse keepers', 6],
    ['Meditate', 5, '10 min, before coffee', 11],
    ['Call family', 1, 'Sunday evenings', 22],
    ['Spanish practice', 4, 'Flashcards + one podcast episode', 4],
  ];
  const routines: Row[] = routineDefs.map(([name, freq, metadata, streak], i) => ({
    id: `r${i}`,
    name,
    frequency_per_week: freq,
    metadata,
    order: i,
    created_at: created,
    current_streak: streak,
    longest_streak: streak + [3, 0, 5, 2, 0, 1][i],
    last_streak_week: thisWeek - 7 * DAY,
    streak_grace_used: false,
  }));

  // Day offsets (relative to today) when each routine was done this week + history.
  const completions: Row[] = [];
  let cid = 0;
  const addDone = (routineId: string, ts: number) =>
    completions.push({ id: `c${cid++}`, routine_id: routineId, completed_at: ts, week_start: weekStartOf(ts) });
  const daysIntoWeek = Math.round((today - thisWeek) / DAY); // 0 = Monday
  const thisWeekPattern: Record<string, number[]> = {
    r0: [0, 2, 4],
    r1: [1, 3],
    r2: [0, 1, 2, 3],
    r3: [0, 1, 2, 4],
    r4: [],
    r5: [0, 2],
  };
  for (const [rid, days] of Object.entries(thisWeekPattern)) {
    for (const d of days) if (d <= daysIntoWeek) addDone(rid, thisWeek + d * DAY + 8 * 60 * 60 * 1000);
  }
  // Ten weeks of history so streaks and stats look real.
  routines.forEach((r, i) => {
    for (let w = 1; w <= 10; w++) {
      const ws = thisWeek - w * 7 * DAY;
      for (let k = 0; k < (r.frequency_per_week as number); k++) addDone(r.id as string, ws + ((k + i) % 7) * DAY + 7 * 60 * 60 * 1000);
    }
  });

  // ---- Todo sections + todos ----
  const sections: Row[] = [
    { id: 's-today', name: sectionName(today), collapsed: false, order: 0, created_at: at(0, 7), parent_id: null },
    { id: 's-tomorrow', name: sectionName(today + DAY), collapsed: false, order: 1, created_at: at(-1, 20), parent_id: null },
    { id: 's-someday', name: 'Someday', collapsed: false, order: 2, created_at: created, parent_id: null },
  ];
  type T = [string, string | null, boolean, number?, Partial<Row>?];
  const todoDefs: T[] = [
    ['Renew passport (photos first)', null, false],
    ['Book dentist cleaning', null, false],
    ['Ship v2 onboarding flow', 's-today', false],
    ['Write release notes', 's-today', true, 1],
    ['QA the empty states on mobile', 's-today', false, 1],
    ['Review Priya\'s design doc', 's-today', true],
    ['Groceries: oats, spinach, coffee beans', 's-today', true],
    ['Pick up dry cleaning before 6', 's-today', false],
    ['30 min walk after lunch', 's-today', true],
    ['Team retro', 's-tomorrow', false],
    ['Draft Q' + quarter + ' planning notes', 's-tomorrow', false],
    ['Send birthday card to Grandma Rosa', 's-tomorrow', false],
    ['Plan weekend hike at Cedar Ridge', 's-tomorrow', false],
    ['Learn to make sourdough', 's-someday', false],
    ['Build a bookshelf for the hallway', 's-someday', false],
    ['Trip ideas: coastal train route, autumn', 's-someday', false, 0, { is_bullet: true }],
  ];
  const todos: Row[] = todoDefs.map(([text, section, done, indent, extra], i) => ({
    id: `t${i}`,
    text,
    completed: done,
    section_id: section,
    order: i,
    indent: indent ?? 0,
    created_at: at(-2, 9),
    completed_at: done ? at(0, 9 + i * 0.3) : null,
    is_bullet: false,
    is_toggle: false,
    toggle_collapsed: false,
    ...extra,
  }));

  // ---- Goals ----
  const q = (title: string, description: string, subtasks: [string, boolean][], i: number): Row => ({
    id: `qg${i}`, title, description, order: i, created_at: created,
    subtasks: subtasks.map(([text, completed], j) => ({ id: `qg${i}-s${j}`, text, completed })),
  });
  const quarterly_goals: Row[] = [
    q('Run a half marathon', 'Riverside Half, last weekend of the quarter', [
      ['Build to 25 mi/week', true], ['Long run of 10 miles', true], ['Taper plan', false], ['Race day', false],
    ], 0),
    q('Launch the side project', 'A tiny recipe-scaling app', [
      ['Landing page', true], ['Private beta with 20 users', true], ['Public launch post', false],
    ], 1),
    q('Save for a sabbatical', '$6,000 this quarter', [
      ['Automate transfers', true], ['Cancel unused subscriptions', true], ['Hit $6k', false],
    ], 2),
  ];
  const yearly_goals: Row[] = [
    { id: 'yg0', title: 'Read 24 books', description: '19 so far', subtasks: [], order: 0, created_at: created },
    { id: 'yg1', title: 'Hold a 10-minute conversation in Spanish', description: '', subtasks: [], order: 1, created_at: created },
    { id: 'yg2', title: 'Visit two new national parks', description: 'One done', subtasks: [], order: 2, created_at: created },
    { id: 'yg3', title: 'Cook dinner at home 5 nights a week', description: '', subtasks: [], order: 3, created_at: created },
  ];
  const life_goals: Row[] = [
    { id: 'lg0', title: 'Be the friend who always shows up', description: '', subtasks: [], order: 0, created_at: created },
    { id: 'lg1', title: 'Stay strong and mobile into my 80s', description: '', subtasks: [], order: 1, created_at: created },
    { id: 'lg2', title: 'Build something people use every day', description: '', subtasks: [], order: 2, created_at: created },
  ];

  // ---- Journal ----
  const journal_entries: Row[] = [
    {
      id: 'j0', date: ymd(today),
      grateful_for: '1. Slow coffee on the balcony\n2. A clear run along the river\n3. Dinner plans with Theo tonight',
      make_it_great: '1. Ship the onboarding flow\n2. Leave the laptop closed after 8',
      affirmations: 'I do the important thing first. I am patient with slow progress.',
      amazing_things: '', learned: '',
      created_at: at(0, 7), updated_at: at(0, 7),
    },
    {
      id: 'j1', date: ymd(today - DAY),
      grateful_for: '1. Rain on the window while working\n2. Lena sent me a playlist\n3. Leftover soup',
      make_it_great: '1. Finish the design review\n2. Strength session at lunch',
      affirmations: 'I keep promises to myself.',
      amazing_things: 'Got the beta invite list out. Three people replied within an hour.',
      learned: 'Writing the release notes first makes the scope obvious.',
      created_at: at(-1, 7), updated_at: at(-1, 22),
    },
    {
      id: 'j2', date: ymd(today - 2 * DAY),
      grateful_for: '1. Long call with Mom\n2. Farmers market peaches\n3. A good nap',
      make_it_great: '1. Meal prep for the week\n2. Read for an hour',
      affirmations: 'Rest is part of the work.',
      amazing_things: 'Finally fixed the squeaky door.',
      learned: 'Two short runs feel better than one long one this week.',
      created_at: at(-2, 8), updated_at: at(-2, 21),
    },
    {
      id: 'j3', date: ymd(today - 4 * DAY),
      grateful_for: '1. Sunny morning\n2. New running shoes\n3. Quiet office',
      make_it_great: '1. Clear the inbox\n2. Call Grandma Rosa',
      affirmations: 'Small steps count.',
      amazing_things: 'Hit a new 5K best.',
      learned: 'Sleep before 11 changes everything.',
      created_at: at(-4, 8), updated_at: at(-4, 22),
    },
  ];

  // ---- Reading notes ----
  const reading_notes: Row[] = [
    { id: 'n0', source: 'The Lighthouse Keeper\'s Almanac', content: 'Tend the light every night, even when no ships pass. The habit is the point.', created_at: at(-3, 21) },
    { id: 'n1', source: 'Notes on Slow Work', content: 'Most of what feels urgent is only loud.', created_at: at(-10, 21) },
    { id: 'n2', source: 'A Field Guide to Small Gardens', content: 'Water the roots, not the leaves.', created_at: at(-20, 21) },
  ];

  // ---- Friends ----
  const friendDefs: [string, 1 | 2 | 3, number | null, string][] = [
    ['Theo Marsh', 1, -1, 'Dinner tonight. Ask about the new job.'],
    ['Lena Ortiz', 1, -3, 'Sent a playlist. Running buddy.'],
    ['Sam Okafor', 1, -16, 'Moved to Portland in spring.'],
    ['Priya Raman', 2, -5, 'Design review buddy. Loves board games.'],
    ['Jonah Bell', 2, -21, 'Birthday next month.'],
    ['Mei Tanaka', 2, -9, 'Climbing gym Thursdays.'],
    ['Alex Rivera', 2, -40, 'Owes me a book back.'],
    ['Hana Kowalski', 3, -60, 'Met at the pottery class.'],
    ['Diego Santos', 3, null, ''],
  ];
  const friends: Row[] = friendDefs.map(([name, tier, last, notes], i) => ({
    id: `f${i}`, name, tier, notes, order: i, created_at: created,
    last_contact: last === null ? null : at(last, 18),
  }));
  const friend_connections: Row[] = [
    { id: 'fc0', friend_id_1: 'f0', friend_id_2: 'f1', created_at: created },
    { id: 'fc1', friend_id_1: 'f1', friend_id_2: 'f5', created_at: created },
    { id: 'fc2', friend_id_1: 'f3', friend_id_2: 'f4', created_at: created },
  ];

  // ---- Health ----
  const month = new Date().getMonth() + 1;
  const h = (section: string, i: number, name: string, extra: Partial<Row> = {}): Row => ({
    id: `h-${section}-${i}`, section, name, value: '', link: '', date: '', where_at: '', frequency: '',
    emoji: '', priority: '', notes: '', sort_order: i, created_at: created, updated_at: created, ...extra,
  });
  const lastYear = (m: number) => `${year - 1}-${String(m).padStart(2, '0')}-14`;
  const health_items: Row[] = [
    h('fact', 0, 'Blood type', { value: 'O+' }),
    h('fact', 1, 'Allergies', { value: 'Penicillin, cats (mild)' }),
    h('fact', 2, 'Primary care', { value: 'Dr. Example, Maple Street Clinic' }),
    h('fact', 3, 'Emergency contact', { value: 'Theo Marsh, 555-0142' }),
    h('supplement', 0, 'Vitamin D3', { value: '2000 IU, morning' }),
    h('supplement', 1, 'Magnesium glycinate', { value: '200 mg, before bed' }),
    h('supplement', 2, 'Creatine', { value: '5 g, daily' }),
    h('medkit', 0, 'Ibuprofen', { value: '200 mg' }),
    h('medkit', 1, 'Bandages + blister pads', { value: '' }),
    h('medkit', 2, 'Antihistamine', { value: '' }),
    h('test', 0, 'Annual physical', { emoji: '🩺', frequency: 'annual', date: String(month), value: lastYear(month) }),
    h('test', 1, 'Bloodwork', { emoji: '🩸', frequency: 'annual', date: String(month), value: lastYear(month) }),
    h('test', 2, 'Dental cleaning', { emoji: '🦷', frequency: 'semi-annual', date: '4,10', value: `${year}-04-09,${lastYear(10)}` }),
    h('test', 3, 'Eye exam', { emoji: '👁️', frequency: 'biennial', date: '3', value: `${year - 1}-03-02` }),
    h('test', 4, 'Derm test', { emoji: '🧴', frequency: 'annual', date: '6', value: `${year}-06-20` }),
    h('record', 0, 'Patient portal', { link: 'https://example.com/portal' }),
    h('record', 1, 'Vaccination record', { link: 'https://example.com/vaccines' }),
  ];

  // ---- Monthly reflections ----
  const monthStr = (offset: number) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const reflection = (offset: number, overall: number, extra: Partial<Row>): Row => ({
    id: `m${-offset}`, month: monthStr(offset), overall: '', challenges: '', looking_forward: '',
    rating_overall: overall, rating_health: 4, rating_career: 3.5, rating_finances: 3.5, rating_friends: 4.5,
    rating_family: 4, rating_romance: 3, rating_fun: 4, rating_growth: 4, rating_mental_health: 3.5,
    rating_spirituality: 3, rating_environment: 4, rating_productivity: 3.5,
    notes_overall: '', notes_health: '', notes_career: '', notes_finances: '', notes_friends: '', notes_family: '',
    notes_romance: '', notes_fun: '', notes_growth: '', notes_mental_health: '', notes_spirituality: '',
    notes_environment: '', notes_productivity: '', overall_life: '',
    created_at: created, updated_at: created, ...extra,
  });
  const monthly_reflections: Row[] = [
    reflection(-1, 4, {
      overall_life: 'Steady month. Training is clicking and the side project has real users.',
      challenges: 'Too many late nights before the beta.',
      looking_forward: 'Race day and a quieter calendar.',
    }),
    reflection(-2, 3.5, {
      overall_life: 'Busy at work, but kept the routines going.',
      challenges: 'Skipped strength training for two weeks.',
      looking_forward: 'Shipping the beta.',
    }),
    reflection(-3, 3.5, { overall_life: 'Reset month. Moved apartments.' }),
  ];

  return {
    routines,
    completions,
    sections,
    todos,
    quarterly_goals,
    yearly_goals,
    life_goals,
    journal_entries,
    reading_notes,
    friends,
    friend_connections,
    health_items,
    monthly_reflections,
    cookie_jar: [{
      id: 'cj0', updated_at: now,
      content: '- Ran my first 10 miles without stopping\n- Shipped the beta on schedule\n- Kept a 3-month meditation streak\n- Cooked for 8 people and nobody went hungry',
    }],
    finances: [{
      id: 'fin0', updated_at: now,
      content: 'Checking: $4,210\nSavings: $12,800\nSabbatical fund: $3,950 / $6,000\nMonthly spend: $2,640 (target $2,800)',
    }],
    quick_notes: [{ id: 'qn0', updated_at: now, content: 'Gift idea for Lena: trail running vest' }],
    user_settings: [{
      id: 'us0', updated_at: now,
      settings: { goalSectionTitles: { q1Goals: `Q${quarter} ${year} Goals`, yearlyGoals: `${year} Goals` } },
    }],
    error_logs: [],
    analytics_events: [],
  };
}
