import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { trackEvent, trackFeatureUsed, trackSessionStart } from './analytics';
import { useUndo } from './useUndo';
import { ToastContainer, ToastItem } from './Toast';
import { RoutineWithProgress, Todo, ToggleSection, Goal, GoalSubtask, JournalEntry, MonthlyReflection, ReadingNote, Friend, FriendTier, AppSettings, DEFAULT_SETTINGS, FriendSection, DEFAULT_SECTIONS, HealthItem, HealthSection } from './types';
import {
  getAllRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  reorderRoutines,
  updateRoutineStreak,
  backfillStreaks,
  getCompletionsForWeek,
  getCompletionsForDay,
  addCompletion,
  removeLastCompletion,
  getWeekStart,
  getAllTodos,
  addTodo,
  updateTodo,
  updateTodoText,
  updateTodoIndent,
  updateTodoCompleted,
  updateTodoSection,
  updateTodoToggle,
  deleteTodo,
  reorderTodos,
  getAllSections,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  getAllLifeGoals,
  getAllYearlyGoals,
  addYearlyGoal,
  updateYearlyGoal,
  deleteYearlyGoal,
  reorderYearlyGoals,
  getAllQuarterlyGoals,
  addQuarterlyGoal,
  updateQuarterlyGoal,
  deleteQuarterlyGoal,
  reorderQuarterlyGoals,
  getAllJournalEntries,
  getTodayJournalEntry,
  createOrUpdateJournalEntry,
  getTodayDate,
  getAllReadingNotes,
  addReadingNote,
  deleteReadingNote,
  getRandomReadingNote,
  getAllFriends,
  addFriend,
  updateFriend,
  deleteFriend,
    getCookieJarContent,
  saveCookieJarContent,
  getUserSettings,
  saveUserSettings,
  getAllMonthlyReflections,
  deleteMonthlyReflection,
  getDashboardStats,
  DashboardStats,
  getMonthlyReflection,
  createOrUpdateMonthlyReflection,
  logError,
  getEarliestCompletionWeek,
  getAllHealthItems,
  addHealthItem,
  updateHealthItem,
  deleteHealthItem,
} from './db';
import { RoutineList } from './RoutineList';
import { TodoList } from './TodoList';
import { GoalList } from './GoalList';
import { JournalCard } from './JournalCard';
import { JournalEntryEditor } from './JournalEntryEditor';
const JournalPage = lazy(() => import('./JournalPage').then(m => ({ default: m.JournalPage })));
import { RandomInsightCard } from './RandomInsightCard';
import { AddNoteModal } from './AddNoteModal';
import { ViewNotesModal } from './ViewNotesModal';
import { FriendsCard } from './FriendsCard';
const FriendsPage = lazy(() => import('./FriendsPage').then(m => ({ default: m.FriendsPage })));
import { CookieJar } from './CookieJar';
import { MonthlyReflectionModal } from './MonthlyReflection';
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));
const HealthPage = lazy(() => import('./HealthPage').then(m => ({ default: m.HealthPage })));
import './App.css';

function useMobileLayout(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

type MobileTab = 'todos' | 'routines' | 'goals' | 'more';

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}


export default function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="app app-loader">
        <span className="loader-icon">🏡</span>
        <div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signInWithGoogle} />;
  }

  return <AppContent onSignOut={signOut} />;
}

function AppContent({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const isMobile = useMobileLayout();
  const [mobileTab, setMobileTab] = useState<MobileTab>('todos');
  const { pushUndo } = useUndo();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showError = useCallback((message: string, category?: string, err?: unknown) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type: 'error' as const }]);
    const detail = err instanceof Error ? err.message : String(err ?? '');
    console.error(`[${category || 'error'}]`, detail || message);
    logError(category || 'unknown', message, detail);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onRoutineError = useCallback((err: unknown) => showError("Couldn't update routine. Please try again.", 'routines', err), [showError]);
  const onTodoError = useCallback((err: unknown) => showError("Couldn't save todo. Please try again.", 'todos', err), [showError]);
  const onSectionError = useCallback((err: unknown) => showError("Couldn't update section. Please try again.", 'sections', err), [showError]);
  const onGoalError = useCallback((err: unknown) => showError("Couldn't save goal. Please try again.", 'goals', err), [showError]);

  // Read cache synchronously to avoid loading screen on repeat visits
  // Cache version - increment when data structure changes
  const CACHE_VERSION = 3;
  const [cachedData] = useState(() => {
    try {
      const raw = localStorage.getItem('dashboardCache');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Invalidate old cache versions
        if (parsed.version !== CACHE_VERSION) {
          localStorage.removeItem('dashboardCache');
          return null;
        }
        return parsed.data as unknown[];
      }
    } catch (e) { console.warn('Cache read failed:', e); }
    return null;
  });
  const c = cachedData; // shorthand

  const [routines, setRoutines] = useState<RoutineWithProgress[]>(c ? c[0] as RoutineWithProgress[] : []);
  const [todos, setTodos] = useState<Todo[]>(c ? c[2] as Todo[] : []);
  const [sections, setSections] = useState<ToggleSection[]>(c ? c[3] as ToggleSection[] : []);
  const [_lifeGoals, setLifeGoals] = useState<Goal[]>(c ? c[4] as Goal[] : []);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>(c ? c[5] as Goal[] : []);
  const [quarterlyGoals, setQuarterlyGoals] = useState<Goal[]>(c ? c[6] as Goal[] : []);
  // Section collapsed states (persisted to localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default: Life Goals collapsed, others open
    return {
      dailySummary: false,
      gratitudeJournal: false,
      todos: false,
      readingNotes: false,
      routines: false,
      q1Goals: false,
      yearlyGoals: false,
      _lifeGoals: true,
      closeFriends: false,
      cookieJar: false,
    };
  });

  const toggleSectionCollapsed = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const updated = { ...prev, [sectionKey]: !prev[sectionKey] };
      localStorage.setItem('collapsedSections', JSON.stringify(updated));
      return updated;
    });
  };


  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(c ? c[7] as JournalEntry | null : null);
  const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
  const [journalEntriesLoaded, setJournalEntriesLoaded] = useState(false);
  const [healthItems, setHealthItems] = useState<HealthItem[]>([]);
  const [healthLoaded, setHealthLoaded] = useState(false);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [monthlyReflections, setMonthlyReflections] = useState<MonthlyReflection[]>(c ? c[13] as MonthlyReflection[] : []);
  const [showMonthlyReflection, setShowMonthlyReflection] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(c ? c[14] as DashboardStats : null);
  const [monthlyReflectionMonth, setMonthlyReflectionMonth] = useState('');
  const [reflectionDismissed, setReflectionDismissed] = useState(false);
  const [currentMonthlyReflection, setCurrentMonthlyReflection] = useState<MonthlyReflection | null>(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [allNotes, setAllNotes] = useState<ReadingNote[]>(c ? c[8] as ReadingNote[] : []);
  const [randomNote, setRandomNote] = useState<ReadingNote | null>(c ? c[9] as ReadingNote | null : null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showViewNotesModal, setShowViewNotesModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(c ? c[10] as Friend[] : []);
  const [friendsSections, setFriendsSections] = useState<FriendSection[]>(DEFAULT_SECTIONS);
  const [cookieJarContent, setCookieJarContent] = useState<string>(c ? c[11] as string : '');
  // Editable goal section titles (loaded from DB)
  const DEFAULT_GOAL_SECTION_TITLES = {
    q1Goals: '2026 Q1 Goals',
    yearlyGoals: '2026 Goals',
    _lifeGoals: 'Life Goals',
  };
  const [goalSectionTitles, setGoalSectionTitles] = useState<Record<string, string>>(DEFAULT_GOAL_SECTION_TITLES);
  const [editingGoalSection, setEditingGoalSection] = useState<string | null>(null);
  const [editingGoalSectionValue, setEditingGoalSectionValue] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(!cachedData);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [routineDayOffset, setRoutineDayOffset] = useState(0);
  const [earliestWeekStart, setEarliestWeekStart] = useState<number | null>(null);

  // Helper to get day start for a given offset (0 = today, -1 = yesterday, etc.)
  const getDayStartForOffset = useCallback((offset: number) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime() + offset * 24 * 60 * 60 * 1000;
  }, []);

  // Helper to format day date (e.g., "Today", "Yesterday", "Sat, Feb 15")
  const getDayDateLabel = useCallback((offset: number) => {
    if (offset === 1) return 'Tomorrow';
    if (offset === 0) return 'Today';
    if (offset === -1) return 'Yesterday';
    const date = new Date(getDayStartForOffset(offset));
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }, [getDayStartForOffset]);

  // Calculate minimum day offset (can't go before earliest completion)
  const minDayOffset = useCallback(() => {
    if (!earliestWeekStart) return -365; // Default: allow up to 1 year back
    const todayStart = getDayStartForOffset(0);
    const daysDiff = Math.floor((earliestWeekStart - todayStart) / (24 * 60 * 60 * 1000));
    return daysDiff;
  }, [earliestWeekStart, getDayStartForOffset]);

  // Hash-based routing for browser back/forward support
  type Page = 'dashboard' | 'journal' | 'friends' | 'settings' | 'privacy' | 'terms' | 'health';
  const getPageFromHash = useCallback((): Page => {
    const hash = window.location.hash.slice(1);
    if (hash === 'journal' || hash === 'friends' || hash === 'settings' || hash === 'privacy' || hash === 'terms' || hash === 'health') {
      return hash;
    }
    return 'dashboard';
  }, []);

  const [showSleepModal, setShowSleepModal] = useState(false);
  const [currentPage, setCurrentPageState] = useState<Page>(getPageFromHash);

  const setCurrentPage = useCallback((page: Page) => {
    const newHash = page === 'dashboard' ? '' : `#${page}`;
    if (window.location.hash !== newHash && !(page === 'dashboard' && window.location.hash === '')) {
      window.history.pushState(null, '', newHash || window.location.pathname);
    }
    setCurrentPageState(page);
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPageState(getPageFromHash());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getPageFromHash]);

  // Sleep reminder - show once per session if past midnight
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      setShowSleepModal(true);
    }
  }, []);

  // Apply font size setting to document
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.fontSize || 'medium');
  }, [settings.fontSize]);

  // Lazy-load journal entries when navigating to journal page
  useEffect(() => {
    if (currentPage === 'journal' && !journalEntriesLoaded) {
      getAllJournalEntries().then((entries) => {
        setAllJournalEntries(entries);
        setJournalEntriesLoaded(true);
      }).catch((err) => showError("Couldn't load journal entries.", 'journal', err));
    }
  }, [currentPage, journalEntriesLoaded, showError]);

  useEffect(() => {
    if (!healthLoaded) {
      getAllHealthItems().then((rows) => {
        setHealthItems(rows);
        setHealthLoaded(true);
      }).catch((err) => showError("Couldn't load health items.", 'health', err));
    }
  }, [healthLoaded, showError]);

  const handleAddHealthItem = useCallback(async (section: HealthSection, name: string, extras: { emoji?: string; priority?: string; frequency?: string; notes?: string } = {}) => {
    try {
      const created = await addHealthItem(section, name, extras);
      setHealthItems((prev) => [...prev, created]);
      return created;
    } catch (err) {
      showError("Couldn't add health item.", 'health', err as Error);
    }
  }, [showError]);

  const handleUpdateHealthItem = useCallback((id: string, updates: Partial<Pick<HealthItem, 'name' | 'value' | 'link' | 'date' | 'whereAt' | 'frequency' | 'emoji' | 'priority' | 'notes'>>) => {
    setHealthItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i)));
    updateHealthItem(id, updates).catch((err) => showError("Couldn't save health item.", 'health', err as Error));
  }, [showError]);

  const handleDeleteHealthItem = useCallback((id: string) => {
    setHealthItems((prev) => prev.filter((i) => i.id !== id));
    deleteHealthItem(id).catch((err) => showError("Couldn't delete health item.", 'health', err as Error));
  }, [showError]);

  const [loadError, setLoadError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const applyData = useCallback((
    allRoutines: Awaited<ReturnType<typeof getAllRoutines>>,
    completions: Awaited<ReturnType<typeof getCompletionsForWeek>>,
    allTodos: Todo[],
    allSections: ToggleSection[],
    allLifeGoals: Goal[],
    allYearlyGoals: Goal[],
    allQuarterlyGoals: Goal[],
    todayEntry: Awaited<ReturnType<typeof getTodayJournalEntry>>,
    readingNotes: ReadingNote[],
    randomReadingNote: ReadingNote | null,
    allFriends: Friend[],
    cookieJar: string,
    userSettings: Awaited<ReturnType<typeof getUserSettings>>,
    allMonthlyReflections: MonthlyReflection[],
    stats: Awaited<ReturnType<typeof getDashboardStats>>,
  ) => {
    const completionCounts = new Map<string, number>();
    const completionsTodayCounts = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const currentWeekStart = getWeekStart();
    const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

    for (const c of completions) {
      completionCounts.set(c.routineId, (completionCounts.get(c.routineId) || 0) + 1);
      if (c.completedAt >= todayStart) {
        completionsTodayCounts.set(c.routineId, (completionsTodayCounts.get(c.routineId) || 0) + 1);
      }
    }

    const routinesWithProgress: RoutineWithProgress[] = allRoutines.map((r) => {
      const completionsToday = completionsTodayCounts.get(r.id) || 0;
      const completedToday = completionsToday > 0;
      const thisWeekCount = completionCounts.get(r.id) || 0;
      const streakAtRisk = r.currentStreak > 0 && thisWeekCount < r.frequencyPerWeek && (r.streakGraceUsed || r.lastStreakWeek === prevWeekStart);
      return {
        ...r,
        completedThisWeek: completionCounts.get(r.id) || 0,
        completedToday,
        completionsToday,
        streakAtRisk,
      };
    });

    setRoutines(routinesWithProgress);
    setTodos(allTodos);
    setSections(allSections);
    setLifeGoals(allLifeGoals);
    setYearlyGoals(allYearlyGoals);
    setQuarterlyGoals(allQuarterlyGoals);
    setTodayJournal(todayEntry || null);
    setAllNotes(readingNotes);
    setRandomNote(randomReadingNote);
    setFriends(allFriends);
    setCookieJarContent(cookieJar);
    setMonthlyReflections(allMonthlyReflections);
    setDashboardStats(stats);

    // Auto-trigger monthly reflection on first Sunday of the month,
    // or on the last Sunday of the month if it's within a few days of the new month
    const now = new Date();
    const isFirstSunday = now.getDay() === 0 && now.getDate() <= 7;
    const daysUntilNextMonth = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isLastSundayBeforeNewMonth = now.getDay() === 0 && daysUntilNextMonth <= 4;
    if (isFirstSunday || isLastSundayBeforeNewMonth) {
      // First Sunday: reflect on previous month. Last Sunday before new month: reflect on current month.
      const reflectMonth = isFirstSunday
        ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const reflectMonthStr = `${reflectMonth.getFullYear()}-${String(reflectMonth.getMonth() + 1).padStart(2, '0')}`;
      const existing = allMonthlyReflections.find((r) => r.month === reflectMonthStr);
      const isIncomplete = !existing || (!existing.overallLife && !existing.challenges && !existing.lookingForward && !existing.ratingOverall);
      const dismissed = localStorage.getItem(`monthlyReflectionDismissed-${reflectMonthStr}-${isFirstSunday ? 'after' : 'during'}`);
      if (isIncomplete && !dismissed) {
        setMonthlyReflectionMonth(reflectMonthStr);
        setCurrentMonthlyReflection(existing || null);
        setShowMonthlyReflection(true);
      }
      if (!monthlyReflectionMonth) {
        setMonthlyReflectionMonth(reflectMonthStr);
        setCurrentMonthlyReflection(existing || null);
      }
    }

    if (userSettings.goalSectionTitles) {
      setGoalSectionTitles({ ...DEFAULT_GOAL_SECTION_TITLES, ...userSettings.goalSectionTitles });
    }
    if (userSettings.friendsSections) {
      setFriendsSections(userSettings.friendsSections);
    }
  }, [monthlyReflectionMonth]);

  const loadData = useCallback(async () => {
    try {
    // One-time cleanup — only run once per browser
    if (!localStorage.getItem('cleanup_dec2025')) {
      deleteMonthlyReflection('2025-12').catch(() => {});
      localStorage.setItem('cleanup_dec2025', '1');
    }

    let completed = 0;
    const total = 16;
    const track = <T,>(p: Promise<T>): Promise<T> =>
      p.then((v) => { completed++; setLoadProgress(Math.round((completed / total) * 100)); return v; });

    const [allRoutines, completions, allTodos, allSections, allLifeGoals, allYearlyGoals, allQuarterlyGoals, todayEntry, readingNotes, randomReadingNote, allFriends, cookieJar, userSettings, allMonthlyReflections, stats] = await Promise.all([
      track(getAllRoutines()),
      track(getCompletionsForWeek(weekStart)),
      track(getAllTodos()),
      track(getAllSections()),
      track(getAllLifeGoals()),
      track(getAllYearlyGoals()),
      track(getAllQuarterlyGoals()),
      track(getTodayJournalEntry()),
      track(getAllReadingNotes()),
      track(getRandomReadingNote()),
      track(getAllFriends()),
      track(getCookieJarContent()),
      track(getUserSettings()),
      track(getAllMonthlyReflections()),
      track(getDashboardStats(weekStart)),
    ]);

    applyData(allRoutines, completions, allTodos, allSections, allLifeGoals, allYearlyGoals, allQuarterlyGoals, todayEntry, readingNotes, randomReadingNote, allFriends, cookieJar, userSettings, allMonthlyReflections, stats);

    // Fetch earliest completion week for navigation limits (non-blocking)
    getEarliestCompletionWeek().then(setEarliestWeekStart).catch(() => {});

    // Cache for stale-while-revalidate on next load
    try {
      localStorage.setItem('dashboardCache', JSON.stringify({
        version: CACHE_VERSION,
        ts: Date.now(),
        data: [allRoutines, completions, allTodos, allSections, allLifeGoals, allYearlyGoals, allQuarterlyGoals, todayEntry, readingNotes, randomReadingNote, allFriends, cookieJar, userSettings, allMonthlyReflections, stats],
      }));
    } catch (e) { console.warn('Cache write failed:', e); }

    setLoadError(false);
    setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoadError(true);
      setLoading(false);
    }
  }, [weekStart, applyData]);

  useEffect(() => {
    loadData();
    trackSessionStart();
  }, [loadData]);

  // Track the last known date to detect day changes
  const lastDateRef = useRef(new Date().toDateString());

  // Check for day/week change and reload data if needed
  const checkAndReloadIfNewDay = useCallback(() => {
    const now = new Date();
    const currentDate = now.toDateString();

    if (currentDate !== lastDateRef.current) {
      console.log('Day changed, reloading data...');
      lastDateRef.current = currentDate;

      // Check if week also changed - update weekStart state
      const newWeekStart = getWeekStart(now);
      if (newWeekStart !== weekStart) {
        setWeekStart(newWeekStart);
      }

      // Reload data for the new day
      loadData();
    }
  }, [loadData, weekStart]);

  // Update current hour every minute and check for day change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
      checkAndReloadIfNewDay();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkAndReloadIfNewDay]);

  // Also check when the tab becomes visible again (user returns after leaving tab open)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndReloadIfNewDay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAndReloadIfNewDay]);

  // Helper to track save status
  const withSaveStatus = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setSaveStatus('saving');
    try {
      const result = await operation();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return result;
    } catch (error) {
      setSaveStatus('idle');
      showError("Couldn't save changes. Please try again.", 'save', error);
      throw error;
    }
  }, [showError]);

  // Check if journal needs attention (show at top)
  const journalNeedsAttention = (() => {
    // No entry yet - show at top
    if (!todayJournal) return true;

    // Morning fields empty - show at top
    const morningEmpty = !todayJournal.gratefulFor && !todayJournal.makeItGreat && !todayJournal.affirmations;
    if (morningEmpty) return true;

    // After 10pm and evening fields empty - show at top
    const isEvening = currentHour >= 22;
    const eveningEmpty = !todayJournal.amazingThings && !todayJournal.learned;
    if (isEvening && eveningEmpty) return true;

    return false;
  })();

  // Refresh routine data for a specific day offset
  const refreshRoutinesForDay = useCallback(async (dayOffset: number) => {
    try {
      const targetDayStart = getDayStartForOffset(dayOffset);
      const allRoutines = await getAllRoutines();

      // Get completions for the specific day
      const dayCompletions = await getCompletionsForDay(targetDayStart);

      // Also get the week's completions for weekly count
      const targetWeekStart = getWeekStart(new Date(targetDayStart));
      const weekCompletions = await getCompletionsForWeek(targetWeekStart);

      const dayCompletionCounts = new Map<string, number>();
      for (const c of dayCompletions) {
        dayCompletionCounts.set(c.routineId, (dayCompletionCounts.get(c.routineId) || 0) + 1);
      }

      // Only count completions up to and including the viewed day
      const dayEnd = targetDayStart + 24 * 60 * 60 * 1000;
      const weekCompletionCounts = new Map<string, number>();
      for (const c of weekCompletions) {
        if (c.completedAt < dayEnd) {
          weekCompletionCounts.set(c.routineId, (weekCompletionCounts.get(c.routineId) || 0) + 1);
        }
      }

      const currentWeekStart = getWeekStart();
      const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

      const routinesWithProgress: RoutineWithProgress[] = allRoutines.map((r) => {
        const thisWeekCount = weekCompletionCounts.get(r.id) || 0;
        const completionsOnDay = dayCompletionCounts.get(r.id) || 0;
        const streakAtRisk = dayOffset === 0 && r.currentStreak > 0 && thisWeekCount < r.frequencyPerWeek && (r.streakGraceUsed || r.lastStreakWeek === prevWeekStart);
        return {
          ...r,
          completedThisWeek: thisWeekCount,
          completedToday: completionsOnDay > 0,
          completionsToday: completionsOnDay,
          streakAtRisk,
        };
      });

      setRoutines(routinesWithProgress);
    } catch (err) {
      showError("Couldn't load routine data.", 'routines', err);
    }
  }, [getDayStartForOffset, showError]);

  // Day navigation handlers
  const handlePrevDay = useCallback(() => {
    const minOffset = minDayOffset();
    if (routineDayOffset <= minOffset) return; // Can't go further back
    const newOffset = routineDayOffset - 1;
    setRoutineDayOffset(newOffset);
    refreshRoutinesForDay(newOffset);
  }, [routineDayOffset, refreshRoutinesForDay, minDayOffset]);

  const handleNextDay = useCallback(() => {
    if (routineDayOffset >= 1) return; // Allow up to tomorrow
    const newOffset = routineDayOffset + 1;
    setRoutineDayOffset(newOffset);
    if (newOffset === 0) {
      // Going back to today - reload fresh data
      loadData();
    } else {
      refreshRoutinesForDay(newOffset);
    }
  }, [routineDayOffset, refreshRoutinesForDay]);

  // Routine handlers
  const handleAddRoutine = async (name: string, frequency: number, metadata: string) => {
    trackEvent('action', { action: 'routine_created', name, frequency });
    await addRoutine({ name, frequencyPerWeek: frequency, metadata });
    loadData();
  };

  const handleIncrement = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    trackEvent('action', { action: 'routine_completed', routine: routine.name }); trackFeatureUsed('routines');

    const newCompletedThisWeek = routine.completedThisWeek + 1;
    const target = routine.frequencyPerWeek;
    const currentWeekStart = getWeekStart();
    const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;
    // Calculate which week the viewed day falls into
    const targetDayStart = getDayStartForOffset(routineDayOffset);
    const targetWeekStart = getWeekStart(new Date(targetDayStart));

    let newStreak = routine.currentStreak;
    let newLongest = routine.longestStreak;
    let newLastStreakWeek = routine.lastStreakWeek;
    let newGraceUsed = routine.streakGraceUsed;

    // Check if we're adding to current week (for streak calculation)
    const isCurrentWeek = targetWeekStart === currentWeekStart;

    // Only update streaks for current week
    if (isCurrentWeek && newCompletedThisWeek === target && routine.completedThisWeek < target) {
      if (routine.lastStreakWeek === currentWeekStart) {
        // Already counted this week
      } else if (routine.lastStreakWeek === prevWeekStart || (routine.streakGraceUsed && routine.currentStreak > 0)) {
        // Consecutive week or recovering from grace
        newStreak = routine.currentStreak + 1;
        newGraceUsed = false;
      } else if (routine.lastStreakWeek === prevWeekStart - 7 * 24 * 60 * 60 * 1000 && routine.currentStreak > 0 && !routine.streakGraceUsed) {
        // Missed one week (grace period) - streak continues
        newStreak = routine.currentStreak + 1;
        newGraceUsed = true;
      } else {
        // Fresh streak
        newStreak = 1;
        newGraceUsed = false;
      }
      newLongest = Math.max(newStreak, routine.longestStreak);
      newLastStreakWeek = currentWeekStart;
    }

    // Optimistic update
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              completedThisWeek: newCompletedThisWeek,
              completedToday: true,
              completionsToday: r.completionsToday + 1,
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastStreakWeek: newLastStreakWeek,
              streakGraceUsed: newGraceUsed,
              streakAtRisk: false,
            }
          : r
      )
    );

    // Push undo action
    pushUndo({
      type: 'increment-routine',
      description: `Complete "${routine.name}"`,
      undo: () => {
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completedThisWeek: routine.completedThisWeek,
                  completedToday: routine.completedToday,
                  completionsToday: routine.completionsToday,
                  currentStreak: routine.currentStreak,
                  longestStreak: routine.longestStreak,
                  lastStreakWeek: routine.lastStreakWeek,
                  streakGraceUsed: routine.streakGraceUsed,
                  streakAtRisk: routine.streakAtRisk,
                }
              : r
          )
        );
        removeLastCompletion(id, targetWeekStart).catch(onRoutineError);
      },
      redo: () => {
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completedThisWeek: newCompletedThisWeek,
                  completedToday: true,
                  completionsToday: routine.completionsToday + 1,
                  currentStreak: newStreak,
                  longestStreak: newLongest,
                  lastStreakWeek: newLastStreakWeek,
                  streakGraceUsed: newGraceUsed,
                  streakAtRisk: false,
                }
              : r
          )
        );
        addCompletion(id, targetWeekStart).catch(onRoutineError);
        if (isCurrentWeek) {
          updateRoutineStreak(id, newStreak, newLongest, newLastStreakWeek, newGraceUsed).catch(onRoutineError);
        }
      },
    });

    // Sync to DB - add completion with the target day's timestamp
    addCompletion(id, targetWeekStart, targetDayStart).catch(onRoutineError);
    if (isCurrentWeek && newCompletedThisWeek === target && routine.completedThisWeek < target) {
      updateRoutineStreak(id, newStreak, newLongest, newLastStreakWeek, newGraceUsed).catch(onRoutineError);
    }
  };

  const handleDecrement = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine || !routine.completedToday) return; // Can only decrement if completed on viewed day

    const targetDayStart = getDayStartForOffset(routineDayOffset);
    const targetWeekStart = getWeekStart(new Date(targetDayStart));
    const newCompletionsToday = Math.max(0, routine.completionsToday - 1);

    // Optimistic update - update state immediately
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              completedThisWeek: Math.max(0, r.completedThisWeek - 1),
              completedToday: newCompletionsToday > 0,
              completionsToday: newCompletionsToday,
            }
          : r
      )
    );

    // Push undo action
    pushUndo({
      type: 'decrement-routine',
      description: `Undo "${routine.name}"`,
      undo: () => {
        // Restore previous state optimistically
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completedThisWeek: routine.completedThisWeek,
                  completedToday: routine.completedToday,
                  completionsToday: routine.completionsToday,
                }
              : r
          )
        );
        // Sync to DB in background
        addCompletion(id, targetWeekStart, targetDayStart).catch(onRoutineError);
      },
      redo: () => {
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completedThisWeek: Math.max(0, r.completedThisWeek - 1),
                  completedToday: newCompletionsToday > 0,
                  completionsToday: newCompletionsToday,
                }
              : r
          )
        );
        removeLastCompletion(id, targetWeekStart, targetDayStart).catch(onRoutineError);
      },
    });

    // Sync to DB in background - remove completion for the specific day
    removeLastCompletion(id, targetWeekStart, targetDayStart).catch(onRoutineError);
  };

  const handleDeleteRoutine = async (id: string) => {
    if (confirm('Delete this routine?')) {
      await deleteRoutine(id);
      loadData();
    }
  };

  const handleEditRoutine = async (
    id: string,
    updates: { name?: string; metadata?: string; frequencyPerWeek?: number }
  ) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;

    // Update locally instead of calling loadData(): editing name/metadata/frequency
    // doesn't touch completions, and loadData() recomputes progress from today's
    // perspective — which wipes the viewed-day state when navigating past days.
    const currentWeekStart = getWeekStart();
    const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...updates };
        const streakAtRisk =
          routineDayOffset === 0 &&
          merged.currentStreak > 0 &&
          merged.completedThisWeek < merged.frequencyPerWeek &&
          (merged.streakGraceUsed || merged.lastStreakWeek === prevWeekStart);
        return { ...merged, streakAtRisk };
      })
    );

    await updateRoutine({ ...routine, ...updates });
  };

  const handleReorderRoutines = async (reorderedRoutines: RoutineWithProgress[]) => {
    setRoutines(reorderedRoutines);
    await reorderRoutines(reorderedRoutines);
  };

  // Todo handlers
  // Resolve a section ID - if it's a temp ID, wait for the real one
  const resolveRealSectionId = async (sectionId: string | null): Promise<string | null> => {
    if (!sectionId || !sectionId.startsWith('temp-')) return sectionId;
    const resolver = sectionIdResolvers.current.get(sectionId);
    if (resolver) return resolver;
    return sectionId;
  };

  const handleAddTodo = async (text: string, sectionId: string | null) => {
    // Generate a temporary ID for optimistic update
    const tempId = crypto.randomUUID();
    let realId: string = tempId; // Will be updated when DB returns

    // Find the highest order in this section to append at the end
    const sectionTodos = todos.filter((t) => t.sectionId === sectionId);
    const maxOrder = sectionTodos.length > 0
      ? Math.max(...sectionTodos.map((t) => t.order)) + 1
      : 0;

    // Create the new todo optimistically
    const newTodo: Todo = {
      id: tempId,
      text,
      completed: false,
      sectionId,
      order: maxOrder,
      indent: 0,
      createdAt: Date.now(),
      completedAt: null,
    };

    // Update state immediately (optimistic)
    setTodos((prev) => [...prev, newTodo]);

    // Push undo action
    pushUndo({
      type: 'add-todo',
      description: `Add "${text.slice(0, 30)}"`,
      undo: () => {
        setTodos((prev) => prev.filter((t) => t.id !== tempId && t.id !== realId));
        deleteTodo(realId).catch(onTodoError);
      },
    });

    // Resolve temp section ID to real DB ID before saving
    const realSectionId = await resolveRealSectionId(sectionId);
    // Update local state if section ID changed
    if (realSectionId !== sectionId) {
      setTodos((prev) => prev.map((t) => t.id === tempId ? { ...t, sectionId: realSectionId } : t));
    }

    // Sync to DB in background
    addTodo(text, realSectionId).then((dbTodo) => {
      realId = dbTodo.id; // Update for undo
      // Replace temp todo with real todo, preserving any local changes
      setTodos((current) => {
        const tempTodo = current.find(t => t.id === tempId);
        const updated = current.map(t => t.id === tempId ? {
          ...dbTodo,
          order: t.order,
          indent: t.indent,
          text: t.text,  // Preserve local text changes
        } : t);
        // Sync local changes to DB if they differ
        if (tempTodo && tempTodo.text !== dbTodo.text) {
          updateTodo({ ...dbTodo, text: tempTodo.text }).catch(onTodoError);
        }
        return updated;
      });
    }).catch(onTodoError);
  };

  const handleAddTodoAfter = async (text: string, afterTodoId: string, indent: number = 0) => {
    const afterTodo = todos.find((t) => t.id === afterTodoId);
    if (!afterTodo) return;

    // Generate a temporary ID for optimistic update
    const tempId = crypto.randomUUID();

    // Create the new todo optimistically
    const newTodo: Todo = {
      id: tempId,
      text,
      completed: false,
      sectionId: afterTodo.sectionId,
      order: afterTodo.order + 0.5,
      indent,
      createdAt: Date.now(),
      completedAt: null,
    };

    // Update state immediately (optimistic) — functional form so prior queued
    // updates (e.g. from onEdit called just before) are preserved.
    setTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === afterTodoId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, newTodo);
      return next;
    });

    // Track real ID for undo (will be updated when DB responds)
    let realId: string = tempId;

    // Push undo action
    pushUndo({
      type: 'create-todo',
      description: 'Create todo',
      undo: () => {
        setTodos((prev) => prev.filter((t) => t.id !== realId));
        deleteTodo(realId).catch(onTodoError);
      },
    });

    // Focus the new todo's input
    setTimeout(() => {
      const newInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(0, 0);
      }
    }, 0);

    // Resolve temp section ID to real DB ID before saving
    const realSectionId = await resolveRealSectionId(afterTodo.sectionId);

    // Sync to DB in background
    addTodo(text, realSectionId, indent).then(async (dbTodo) => {
      realId = dbTodo.id;
      // Check if the temp input is currently focused and get its ACTUAL value
      // (not from React state, which may be stale due to debounced saves)
      const tempInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      const wasFocused = document.activeElement === tempInput;
      const cursorPos = tempInput?.selectionStart ?? 0;
      const actualInputText = tempInput?.value ?? ''; // Read directly from DOM

      // Replace temp ID with real todo, preserving any local changes (order, indent, text)
      setTodos(current => {
        const tempTodo = current.find(t => t.id === tempId);
        // Use the actual input text (from DOM) if available, otherwise fall back to state
        const preservedText = actualInputText || tempTodo?.text || '';
        const preservedIndent = tempTodo?.indent ?? indent;

        const updated = current.map(t => t.id === tempId ? {
          ...dbTodo,
          order: t.order,
          indent: preservedIndent,
          text: preservedText,
        } : t);

        // Sync local changes to DB if they differ
        if (preservedIndent !== dbTodo.indent || preservedText !== dbTodo.text) {
          updateTodoText(dbTodo.id, preservedText).catch(onTodoError);
          if (preservedIndent !== dbTodo.indent) {
            updateTodoIndent(dbTodo.id, preservedIndent).catch(onTodoError);
          }
        }
        // Reorder in background to persist positions
        reorderTodos(updated).catch(onTodoError);
        return updated;
      });

      // Restore focus if it was focused
      if (wasFocused) {
        setTimeout(() => {
          const newInput = document.querySelector(`[data-drag-id="${dbTodo.id}"] .todo-text-input`) as HTMLInputElement;
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      }
    }).catch(onTodoError);
  };

  const handleAddTodoBefore = async (text: string, beforeTodoId: string, indent: number = 0) => {
    const beforeTodo = todos.find((t) => t.id === beforeTodoId);
    if (!beforeTodo) return;

    const tempId = crypto.randomUUID();

    const newTodo: Todo = {
      id: tempId,
      text,
      completed: false,
      sectionId: beforeTodo.sectionId,
      order: beforeTodo.order - 0.5,
      indent,
      createdAt: Date.now(),
      completedAt: null,
    };

    setTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === beforeTodoId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 0, newTodo);
      return next;
    });

    let realId: string = tempId;

    pushUndo({
      type: 'create-todo',
      description: 'Create todo',
      undo: () => {
        setTodos((prev) => prev.filter((t) => t.id !== realId));
        deleteTodo(realId).catch(onTodoError);
      },
    });

    setTimeout(() => {
      const newInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(0, 0);
      }
    }, 0);

    // Resolve temp section ID to real DB ID before saving
    const realSectionId = await resolveRealSectionId(beforeTodo.sectionId);

    addTodo(text, realSectionId, indent).then(async (dbTodo) => {
      realId = dbTodo.id;
      const tempInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      const wasFocused = document.activeElement === tempInput;
      const cursorPos = tempInput?.selectionStart ?? 0;
      const actualInputText = tempInput?.value ?? '';

      setTodos(current => {
        const tempTodo = current.find(t => t.id === tempId);
        const preservedText = actualInputText || tempTodo?.text || '';
        const preservedIndent = tempTodo?.indent ?? indent;

        const updated = current.map(t => t.id === tempId ? {
          ...dbTodo,
          order: t.order,
          indent: preservedIndent,
          text: preservedText,
        } : t);

        if (preservedIndent !== dbTodo.indent || preservedText !== dbTodo.text) {
          updateTodoText(dbTodo.id, preservedText).catch(onTodoError);
          if (preservedIndent !== dbTodo.indent) {
            updateTodoIndent(dbTodo.id, preservedIndent).catch(onTodoError);
          }
        }
        reorderTodos(updated).catch(onTodoError);
        return updated;
      });

      if (wasFocused) {
        setTimeout(() => {
          const newInput = document.querySelector(`[data-drag-id="${dbTodo.id}"] .todo-text-input`) as HTMLInputElement;
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      }
    }).catch(onTodoError);
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const isCompleting = !todo.completed;
    if (isCompleting) { trackEvent('action', { action: 'todo_completed' }); trackFeatureUsed('todos'); }
    const previousTodos = [...todos]; // Save for undo
    const completedAt = isCompleting ? Date.now() : null;

    const updatedTodo = {
      ...todo,
      completed: isCompleting,
      completedAt,
    };

    // Calculate reordering synchronously using current todos
    let newTodos = todos.map((t) => (t.id === id ? updatedTodo : t));
    let needsReorder = false;

    // If completing and auto-sort is enabled, move to bottom of section (only for top-level items)
    if (isCompleting && settings.autoSortCompletedTodos) {
      const completedTodoGlobalIndex = newTodos.findIndex((t) => t.id === id);
      const completedTodoIndent = todo.indent ?? 0;

      // Only move top-level items (indent === 0) to bottom, not subtasks
      if (completedTodoIndent === 0) {
        // Find all child todos (indented todos directly following this one)
        let childCount = 0;
        for (let i = completedTodoGlobalIndex + 1; i < newTodos.length; i++) {
          const t = newTodos[i];
          if ((t.indent ?? 0) <= completedTodoIndent) break;
          if (t.sectionId !== todo.sectionId) break;
          childCount++;
        }

        // Find all todos in the same section
        const sectionTodos = newTodos.filter((t) => t.sectionId === todo.sectionId);
        const lastSectionTodo = sectionTodos[sectionTodos.length - 1];
        const lastSectionTodoGlobalIndex = newTodos.findIndex((t) => t.id === lastSectionTodo.id);

        // Only reorder if not already at the bottom of the section
        if (completedTodoGlobalIndex + childCount < lastSectionTodoGlobalIndex) {
          const removed = newTodos.splice(completedTodoGlobalIndex, 1 + childCount);
          const adjustedLastIndex = lastSectionTodoGlobalIndex - (1 + childCount);
          newTodos.splice(adjustedLastIndex + 1, 0, ...removed);
          needsReorder = true;
        }
      }
    }

    // Update state
    setTodos(newTodos);

    // Sync only the completed field to DB (avoid overwriting other fields like text)
    updateTodoCompleted(id, isCompleting, completedAt).catch(onTodoError);
    if (needsReorder) {
      reorderTodos(newTodos).catch(onTodoError);
    }

    // Push undo action
    pushUndo({
      type: 'toggle-todo',
      description: `${isCompleting ? 'Complete' : 'Uncomplete'} "${todo.text.slice(0, 30)}"`,
      undo: () => {
        setTodos(previousTodos);
        updateTodoCompleted(id, todo.completed, todo.completedAt ?? null).catch(onTodoError);
        if (needsReorder) {
          reorderTodos(previousTodos).catch(onTodoError);
        }
      },
      redo: () => {
        setTodos((prev) => {
          const newTodos = prev.map((t) => t.id === id ? { ...t, completed: !todo.completed, completedAt: !todo.completed ? Date.now() : null } : t);
          if (needsReorder) {
            reorderTodos(newTodos).catch(onTodoError);
          }
          return newTodos;
        });
        updateTodoCompleted(id, !todo.completed, !todo.completed ? Date.now() : null).catch(onTodoError);
      },
    });
  };

  const handleDeleteTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const todoIndex = todos.findIndex((t) => t.id === id);

    // Update state immediately (optimistic)
    setTodos((prev) => prev.filter((t) => t.id !== id));

    // Push undo action
    pushUndo({
      type: 'delete-todo',
      description: `Delete "${todo.text.slice(0, 30)}"`,
      undo: () => {
        // Restore todo at original position
        setTodos((prev) => {
          const newTodos = [...prev];
          newTodos.splice(todoIndex, 0, todo);
          return newTodos;
        });
        // Re-add to DB
        addTodo(todo.text, todo.sectionId, todo.indent).then((dbTodo) => {
          // Update with correct ID from DB
          setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...dbTodo, order: todo.order } : t));
        }).catch(onTodoError);
      },
    });

    // Sync to DB in background
    deleteTodo(id).catch(onTodoError);
  };

  const handleEditTodo = (id: string, text: string, isBullet?: boolean) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const previousText = todo.text;
    const previousIsBullet = todo.isBullet;
    if (text === previousText && isBullet === undefined) return; // No change

    // Update state immediately (optimistic) - use callback to merge with current state
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text, ...(isBullet !== undefined ? { isBullet } : {}) } : t)));

    // Sync only the text field to DB (avoid overwriting other fields)
    updateTodoText(id, text, isBullet).catch(onTodoError);

    // Push undo action
    pushUndo({
      type: 'edit-todo',
      description: `Edit "${previousText.slice(0, 20)}" → "${text.slice(0, 20)}"`,
      undo: () => {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: previousText, isBullet: previousIsBullet } : t)));
        updateTodoText(id, previousText, previousIsBullet).catch(onTodoError);
      },
    });
  };

  const handleIndentTodo = (id: string, indent: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // Update state immediately (optimistic) - use callback to merge with current state
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, indent } : t)));

    // Sync only the indent field to DB (avoid overwriting other fields like text)
    updateTodoIndent(id, indent).catch(onTodoError);
  };

  const handleReorderTodos = (reorderedTodos: Todo[]) => {
    setTodos(reorderedTodos);
    // Sync to DB in background
    reorderTodos(reorderedTodos).catch(onTodoError);
  };

  const handleMoveTodo = (id: string, newSectionId: string | null) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // Update state immediately (optimistic)
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, sectionId: newSectionId } : t)));

    // If section has a temp ID (not yet saved to DB), wait for real ID before syncing
    if (newSectionId && newSectionId.startsWith('temp-')) {
      const pendingResolve = pendingSectionResolves.current;
      if (!pendingResolve.has(newSectionId)) {
        pendingResolve.set(newSectionId, []);
      }
      pendingResolve.get(newSectionId)!.push(id);
      return;
    }

    // Sync only the section field to DB (avoid overwriting other fields like text)
    updateTodoSection(id, newSectionId).catch(onTodoError);
  };

  // Section handlers - track sections being added to prevent duplicates
  const addingSectionsRef = useRef<Set<string>>(new Set());
  // Track todo moves that are waiting for a temp section ID to resolve to a real one
  const pendingSectionResolves = useRef<Map<string, string[]>>(new Map());
  // Map temp section IDs to promises that resolve with the real DB ID
  const sectionIdResolvers = useRef<Map<string, Promise<string>>>(new Map());

  const handleAddSection = async (name: string, parentId?: string | null) => {
    trackEvent('action', { action: 'section_created', name }); trackFeatureUsed('todos');

    // Unique key includes parent for subsections
    const uniqueKey = parentId ? `${parentId}:${name}` : name;

    // Prevent duplicate adds using ref (survives re-renders)
    if (addingSectionsRef.current.has(uniqueKey)) return;
    addingSectionsRef.current.add(uniqueKey);

    // Optimistic: add section immediately with temp ID
    const tempId = `temp-${Date.now()}`;

    setSections(prev => {
      // Check if section already exists at same level
      if (prev.some(s => s.name === name && s.parentId === (parentId || null))) {
        return prev;
      }
      const optimisticSection: ToggleSection = {
        id: tempId,
        name,
        collapsed: false,
        order: 0,
        createdAt: Date.now(),
        parentId: parentId || null,
      };
      // Add subsections after their parent, top-level sections at the top
      if (parentId) {
        const parentIndex = prev.findIndex(s => s.id === parentId);
        if (parentIndex !== -1) {
          const newSections = [...prev];
          newSections.splice(parentIndex + 1, 0, optimisticSection);
          return newSections;
        }
      }
      return [optimisticSection, ...prev];
    });

    // Sync to DB in background and update with real ID
    const sectionPromise = addSection(name, parentId).then(realSection => {
      setSections(prev => prev.map(s => s.id === tempId ? realSection : s));
      // Flush any pending todo moves that were waiting for this section's real ID
      const pendingTodoIds = pendingSectionResolves.current.get(tempId);
      if (pendingTodoIds && pendingTodoIds.length > 0) {
        pendingSectionResolves.current.delete(tempId);
        setTodos(prev => prev.map(t =>
          pendingTodoIds.includes(t.id) && t.sectionId === tempId
            ? { ...t, sectionId: realSection.id }
            : t
        ));
        for (const todoId of pendingTodoIds) {
          updateTodoSection(todoId, realSection.id).catch(onTodoError);
        }
      }
      return realSection.id;
    }).catch(err => {
      // Remove optimistic section on error
      setSections(prev => prev.filter(s => s.id !== tempId));
      console.error('Failed to add section:', err);
      throw err;
    }).finally(() => {
      addingSectionsRef.current.delete(uniqueKey);
    });
    sectionIdResolvers.current.set(tempId, sectionPromise);
  };

  // Convert a todo into an inline toggle (stays in place, can collapse children)
  const handleConvertTodoToToggle = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    // Optimistically update the todo to be a toggle
    const updatedTodo = { ...todo, isToggle: true, toggleCollapsed: false };
    setTodos(prev => prev.map(t => t.id === todoId ? updatedTodo : t));

    // Sync to DB
    try {
      await updateTodoToggle(todoId, true, false);
    } catch (err) {
      // Restore on error
      setTodos(prev => prev.map(t => t.id === todoId ? todo : t));
      console.error('Failed to convert todo to toggle:', err);
    }
  };

  // Toggle collapse state of an inline toggle
  const handleToggleCollapse = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.isToggle) return;

    const newCollapsed = !todo.toggleCollapsed;
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, toggleCollapsed: newCollapsed } : t));

    // Sync to DB
    try {
      await updateTodoToggle(todoId, true, newCollapsed);
    } catch (err) {
      // Restore on error
      setTodos(prev => prev.map(t => t.id === todoId ? todo : t));
      console.error('Failed to toggle collapse:', err);
    }
  };

  const handleToggleSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;

    const updatedSection = { ...section, collapsed: !section.collapsed };
    // Update state immediately (optimistic)
    setSections((prev) => prev.map((s) => (s.id === id ? updatedSection : s)));
    // Sync to DB in background
    updateSection(updatedSection).catch(onSectionError);
  };

  const handleDeleteSection = async (id: string) => {
    // Save for potential restore on error
    const sectionToDelete = sections.find(s => s.id === id);
    const todosToOrphan = todos.filter(t => t.sectionId === id);

    // Optimistic: remove section and move its todos to unsectioned
    setSections(prev => prev.filter(s => s.id !== id));
    setTodos(prev => prev.map(t => t.sectionId === id ? { ...t, sectionId: null } : t));

    // Sync to DB in background
    deleteSection(id).catch(err => {
      // Restore on error
      if (sectionToDelete) {
        setSections(prev => [...prev, sectionToDelete]);
      }
      setTodos(prev => prev.map(t => {
        const wasInSection = todosToOrphan.find(o => o.id === t.id);
        return wasInSection ? { ...t, sectionId: id } : t;
      }));
      console.error('Failed to delete section:', err);
    });
  };

  const handleEditSection = async (id: string, name: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      await withSaveStatus(async () => {
        await updateSection({ ...section, name });
        await loadData();
      });
    }
  };

  const handleReorderSections = async (reorderedSections: ToggleSection[]) => {
    // Update order property on each section to match new position
    const sectionsWithUpdatedOrder = reorderedSections.map((s, i) => ({ ...s, order: i }));
    setSections(sectionsWithUpdatedOrder);
    await withSaveStatus(() => reorderSections(sectionsWithUpdatedOrder));
  };

  const handleMoveToToday = (sourceSectionId: string) => {
    // Get today's formatted date
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const todayFormatted = `${dayName}, ${month}/${date}`;

    // Find or create today's section. Match by the "Day, M/D" token so a
    // renamed today section (e.g. with a trailing *) is still reused.
    let todaySectionId: string;
    const dateRe = /(Mon|Tues|Wed|Thurs|Fri|Sat|Sun),?\s*(\d{1,2})\/(\d{1,2})(?![\d/])/i;
    const existingSection = sections.find((s) => {
      const m = s.name.match(dateRe);
      return !!m && parseInt(m[2]) === month && parseInt(m[3]) === date;
    });

    if (existingSection) {
      todaySectionId = existingSection.id;
    } else {
      // Optimistic: create section with temp ID immediately
      const tempId = `temp-${Date.now()}`;
      todaySectionId = tempId;
      setSections((prev) => [{
        id: tempId,
        name: todayFormatted,
        collapsed: false,
        order: 0,
        createdAt: Date.now(),
        parentId: null,
      }, ...prev]);

      // Create in DB and resolve temp ID
      addSection(todayFormatted).then((realSection) => {
        setSections((prev) => prev.map((s) => s.id === tempId ? realSection : s));
        // Update any todos that were assigned the temp section ID
        setTodos((prev) => prev.map((t) =>
          t.sectionId === tempId ? { ...t, sectionId: realSection.id } : t
        ));
        // Sync the moved todos with real section ID
        setTodos((prev) => {
          const movedTodos = prev.filter((t) => t.sectionId === realSection.id);
          for (const todo of movedTodos) {
            updateTodoSection(todo.id, realSection.id).catch(onTodoError);
          }
          return prev;
        });
      }).catch(onSectionError);
    }

    // A todo is treated as "done" if it's completed OR fully wrapped in strikethrough
    // (e.g. "~~Call the dentist~~" with nothing else outside the markers).
    const isFullyStruckthrough = (text: string) => {
      if (!text.includes('~~')) return false;
      return text.replace(/~~([^~]+)~~/g, '').trim() === '';
    };

    // Get todos in source section (in order)
    const sectionTodos = todos.filter((t) => t.sectionId === sourceSectionId);
    const uncompletedTodos = sectionTodos.filter((t) => !t.completed && !isFullyStruckthrough(t.text));

    if (uncompletedTodos.length === 0) return;

    // Build set of todos to move - start with uncompleted ones
    const idsToMove = new Set(uncompletedTodos.map((t) => t.id));

    // For each indented uncompleted todo, also include its completed parent for context
    for (const todo of uncompletedTodos) {
      if ((todo.indent ?? 0) === 0) continue;

      // Find the parent (closest todo above with lower indent)
      const todoIndex = sectionTodos.findIndex((t) => t.id === todo.id);
      for (let i = todoIndex - 1; i >= 0; i--) {
        const candidate = sectionTodos[i];
        if ((candidate.indent ?? 0) < (todo.indent ?? 0)) {
          // Found the parent - include it if completed
          if (candidate.completed) {
            idsToMove.add(candidate.id);
          }
          break;
        }
      }
    }

    // Optimistic update - move todos and collapse source section immediately
    setTodos((prev) => prev.map((t) =>
      idsToMove.has(t.id) ? { ...t, sectionId: todaySectionId } : t
    ));

    setSections((prev) =>
      prev.map((s) =>
        s.id === sourceSectionId ? { ...s, collapsed: true } : s
      )
    );

    // Sync to DB in background (only if section already exists - temp sections sync after resolve)
    if (existingSection) {
      const todosToSync = sectionTodos
        .filter((t) => idsToMove.has(t.id))
        .map((t) => ({ ...t, sectionId: todaySectionId }));
      Promise.all([
        ...todosToSync.map((todo) => updateTodo(todo)),
        updateSection({
          ...sections.find((s) => s.id === sourceSectionId)!,
          collapsed: true,
        }),
      ]).catch(onSectionError);
    } else {
      // Collapse the source section in DB
      const sourceSection = sections.find((s) => s.id === sourceSectionId);
      if (sourceSection) {
        updateSection({ ...sourceSection, collapsed: true }).catch(onSectionError);
      }
    }
  };


  // Yearly Goal handlers (2026)
  const handleAddYearlyGoal = async (title: string) => {
    await addYearlyGoal(title);
    loadData();
  };

  const handleDeleteYearlyGoal = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await deleteYearlyGoal(id);
      loadData();
    }
  };

  const handleEditYearlyGoal = async (id: string, updates: { title?: string; description?: string }) => {
    const goal = yearlyGoals.find((g) => g.id === id);
    if (goal) {
      await updateYearlyGoal({ ...goal, ...updates });
      loadData();
    }
  };

  const handleReorderYearlyGoals = async (reorderedGoals: Goal[]) => {
    setYearlyGoals(reorderedGoals);
    await reorderYearlyGoals(reorderedGoals);
  };

  // Quarterly Goal handlers (Q1 2026)
  const handleAddQuarterlyGoal = async (title: string) => {
    await addQuarterlyGoal(title);
    loadData();
  };

  const handleDeleteQuarterlyGoal = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await deleteQuarterlyGoal(id);
      loadData();
    }
  };

  const handleEditQuarterlyGoal = (id: string, updates: { title?: string; description?: string; subtasks?: GoalSubtask[] }) => {
    const goal = quarterlyGoals.find((g) => g.id === id);
    if (!goal) return;

    const updatedGoal = { ...goal, ...updates };
    // Update state immediately (optimistic)
    setQuarterlyGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
    // Sync to DB in background
    updateQuarterlyGoal(updatedGoal).catch(onGoalError);
  };

  const handleReorderQuarterlyGoals = async (reorderedGoals: Goal[]) => {
    setQuarterlyGoals(reorderedGoals);
    await reorderQuarterlyGoals(reorderedGoals);
  };

  // Journal handlers
  const handleSaveJournalEntry = async (entry: Partial<JournalEntry> & { date: string }) => {
    trackEvent('action', { action: 'journal_saved' }); trackFeatureUsed('journal');
    // Save to DB and update local state
    const saved = await createOrUpdateJournalEntry(entry);
    setAllJournalEntries((prev) => {
      const idx = prev.findIndex((e) => e.date === saved.date);
      if (idx >= 0) {
        // Update existing entry
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      // Add new entry, keeping sorted by date (newest first)
      return [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date));
    });
  };

  const handleSaveMonthlyReflection = async (reflection: Partial<MonthlyReflection> & { month: string }) => {
    trackEvent('action', { action: 'reflection_saved' }); trackFeatureUsed('reflection');
    const saved = await createOrUpdateMonthlyReflection(reflection);
    setCurrentMonthlyReflection(saved);
    setMonthlyReflections((prev) => {
      const idx = prev.findIndex((r) => r.month === saved.month);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
  };

  const handleChangeReflectionMonth = async (month: string) => {
    setMonthlyReflectionMonth(month);
    const existing = monthlyReflections.find((r) => r.month === month);
    if (existing) {
      setCurrentMonthlyReflection(existing);
    } else {
      const fetched = await getMonthlyReflection(month);
      setCurrentMonthlyReflection(fetched || null);
    }
  };

  // Reading notes handlers
  const handleAddNote = async (source: string, content: string) => {
    trackEvent('action', { action: 'note_added' }); trackFeatureUsed('reading_notes');
    await addReadingNote(source, content);
    loadData();
  };

  const handleDeleteNote = async (id: string) => {
    await deleteReadingNote(id);
    loadData();
  };

  // Friends handlers
  const handleAddFriend = async (name: string, tier: FriendTier = 3) => {
    const friend = await addFriend(name, tier);
    loadData();
    return friend;
  };

  const handleDeleteFriend = async (id: string) => {
    await deleteFriend(id);
    loadData();
  };

  const handleEditFriend = async (id: string, updates: Partial<Friend>) => {
    const friend = friends.find((f) => f.id === id);
    if (friend) {
      await updateFriend({ ...friend, ...updates });
      loadData();
    }
  };

  const handleReorderFriends = async (updates: { id: string; tier?: number; order?: number }[]) => {
    for (const update of updates) {
      const friend = friends.find(f => f.id === update.id);
      if (friend) {
        await updateFriend({ ...friend, ...update } as Friend);
      }
    }
    loadData();
  };

  const handleFriendsSectionsChange = async (sections: FriendSection[]) => {
    setFriendsSections(sections);
    // Save to database
    const currentSettings = await getUserSettings();
    await saveUserSettings({ ...currentSettings, friendsSections: sections });
  };

  // Cookie Jar handler
  const handleSaveCookieJar = async (content: string) => {
    await saveCookieJarContent(content);
    setCookieJarContent(content);
  };



  // Settings handler
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  // Goal section title handlers
  const startEditingGoalSection = (sectionKey: string) => {
    setEditingGoalSection(sectionKey);
    setEditingGoalSectionValue(goalSectionTitles[sectionKey] || '');
  };

  const saveGoalSectionTitle = async () => {
    if (!editingGoalSection) return;
    const trimmed = editingGoalSectionValue.trim();
    if (trimmed && trimmed !== goalSectionTitles[editingGoalSection]) {
      const updated = { ...goalSectionTitles, [editingGoalSection]: trimmed };
      setGoalSectionTitles(updated);
      // Save to database
      const currentSettings = await getUserSettings();
      await saveUserSettings({ ...currentSettings, goalSectionTitles: updated });
    }
    setEditingGoalSection(null);
  };

  const handleGoalSectionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveGoalSectionTitle();
    } else if (e.key === 'Escape') {
      setEditingGoalSection(null);
    }
  };

  // Sort all completed todos to bottom of their sections
  const handleSortCompletedToBottom = async () => {
    // Group todos by section
    const sectionIds = [...new Set(todos.map((t) => t.sectionId))];
    const sortedTodos: Todo[] = [];

    for (const sectionId of sectionIds) {
      const sectionTodos = todos.filter((t) => t.sectionId === sectionId);
      const uncompleted = sectionTodos.filter((t) => !t.completed);
      const completed = sectionTodos.filter((t) => t.completed);
      sortedTodos.push(...uncompleted, ...completed);
    }

    await reorderTodos(sortedTodos);
    await loadData();
  };

  if (loading) {
    return (
      <div className="app app-loader">
        <span className="loader-icon">🏡</span>
        <div className="loader-bar-track"><div className="loader-bar-fill" style={{ width: `${loadProgress}%` }} /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <p style={{ color: '#b0a898', fontSize: '1.1rem' }}>Couldn't connect. Check your internet and try again.</p>
        <button
          onClick={() => { setLoading(true); setLoadError(false); loadData(); }}
          style={{ padding: '10px 24px', background: '#f5a623', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }



  if (currentPage === 'journal') {
    return (
      <div className="app">
        <Suspense fallback={<div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>}>
          {journalEntriesLoaded ? (
            <JournalPage
              entries={allJournalEntries}
              onBack={() => { setCurrentPage('dashboard'); }}
              onSave={handleSaveJournalEntry}
            />
          ) : (
            <div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>
          )}
        </Suspense>
        </div>
    );
  }

  if (currentPage === 'health') {
    return (
      <div className="app">
        <Suspense fallback={<div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>}>
          {healthLoaded ? (
            <HealthPage
              items={healthItems}
              onBack={() => { setCurrentPage('dashboard'); }}
              onAdd={handleAddHealthItem}
              onUpdate={handleUpdateHealthItem}
              onDelete={handleDeleteHealthItem}
              testNotes={settings.healthTestNotes || ''}
              onTestNotesChange={(notes) => handleSettingsChange({ ...settings, healthTestNotes: notes })}
            />
          ) : (
            <div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>
          )}
        </Suspense>
      </div>
    );
  }

  if (currentPage === 'friends') {
    return (
      <div className="app">
        <Suspense fallback={<div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>}>
        <FriendsPage
          friends={friends}
          sections={friendsSections}
          onBack={() => { setCurrentPage('dashboard'); }}
          onAddFriend={handleAddFriend}
          onEditFriend={handleEditFriend}
          onDeleteFriend={handleDeleteFriend}
          onSectionsChange={handleFriendsSectionsChange}
          onReorderFriends={handleReorderFriends}
          pushUndo={pushUndo}
        />
        </Suspense>
        </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div className="app">
        <Suspense fallback={<div className="app-loader"><span className="loader-icon">🏡</span><div className="loader-bar-track"><div className="loader-bar-fill loader-bar-slow" /></div></div>}>
        <SettingsPage
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onSortCompletedToBottom={handleSortCompletedToBottom}
          onBackfillStreaks={async () => {
            await backfillStreaks();
            loadData();
          }}
          onBack={() => { setCurrentPage('dashboard'); }}
          onOpenMonthlyReflection={() => {
            const now = new Date();
            // Open current month if past the 15th, otherwise previous month
            const useCurrentMonth = now.getDate() >= 15;
            const targetMonth = useCurrentMonth
              ? new Date(now.getFullYear(), now.getMonth(), 1)
              : new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
            setMonthlyReflectionMonth(prevMonthStr);
            const r = monthlyReflections.find((r) => r.month === prevMonthStr);
            setCurrentMonthlyReflection(r || null);
            setShowMonthlyReflection(true);
          }}
        />
        {showMonthlyReflection && (
        <MonthlyReflectionModal
          reflection={currentMonthlyReflection}
          allReflections={monthlyReflections}
          month={monthlyReflectionMonth}
          onSave={handleSaveMonthlyReflection}
          onClose={() => {
            setShowMonthlyReflection(false);
            if (monthlyReflectionMonth) {
              localStorage.setItem(`monthlyReflectionDismissed-${monthlyReflectionMonth}`, 'true');
            }
          }}
          onChangeMonth={handleChangeReflectionMonth}
        />
      )}
      </Suspense>
      </div>
    );
  }

  if (currentPage === 'privacy') {
    return (
      <div className="app">
        <div className="policy-page">
          <button className="policy-back-btn" onClick={() => setCurrentPage('dashboard')}>← Back</button>
          <h1>Privacy Policy</h1>
          <p className="policy-updated">Last updated: February 2, 2026</p>

          <p>When you sign in with Google, we collect your name, email, and profile picture. We store all content you create in the app (todos, journal entries, goals, etc.) in a database. We use local storage to keep you signed in and cache data for faster loading. By using this app, you accept this policy.</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'terms') {
    return (
      <div className="app">
        <div className="policy-page">
          <button className="policy-back-btn" onClick={() => setCurrentPage('dashboard')}>← Back</button>
          <h1>Terms of Service</h1>
          <p className="policy-updated">Last updated: February 2, 2026</p>

          <p>By using Homebase, you agree to these terms. The app is provided "as is" with no warranties. We're not liable for any data loss. We may terminate accounts or update these terms at any time.</p>
        </div>
      </div>
    );
  }

  // Shared UI fragments
  const statsBanner = dashboardStats && (
    <div className="dashboard-stats-banner">
      <div className="dashboard-stat-card" data-tooltip="Consecutive days you've completed a todo, routine, or journal entry">
        <span className="dashboard-stat-icon">🔥</span>
        <span className="dashboard-stat-value">{dashboardStats.dayStreak}</span>
        <span className="dashboard-stat-label">day streak</span>
      </div>
      <div className="dashboard-stat-card" data-tooltip="Todos checked off since Monday">
        <span className="dashboard-stat-icon">✓</span>
        <span className="dashboard-stat-value">{dashboardStats.todosCompletedThisWeek}</span>
        <span className="dashboard-stat-label">this week</span>
      </div>
      {dashboardStats.bestRoutineStreak > 0 && (
        <div className="dashboard-stat-card" data-tooltip={`${dashboardStats.bestRoutineStreak}-week streak for ${dashboardStats.bestRoutineStreakName} (your longest active routine streak)`}>
          <span className="dashboard-stat-icon">📅</span>
          <span className="dashboard-stat-value">{dashboardStats.bestRoutineStreak}</span>
          <span className="dashboard-stat-label">wk streak</span>
        </div>
      )}
      <div className="dashboard-stat-card" data-tooltip="Days since you started using Homebase">
        <span className="dashboard-stat-icon">⚡</span>
        <span className="dashboard-stat-value">{dashboardStats.daysOnPlatform}</span>
        <span className="dashboard-stat-label">days</span>
      </div>
    </div>
  );

  const journalBanner = journalNeedsAttention && (
    <section className="app-section journal-attention collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('gratitudeJournal')}>
        <span className={`collapse-arrow ${collapsedSections.gratitudeJournal ? '' : 'open'}`}>▶</span>
        Gratitude Journal
      </h2>
      {!collapsedSections.gratitudeJournal && (
        <JournalCard entry={todayJournal} onOpenEditor={() => setShowJournalEditor(true)} onViewAll={() => setCurrentPage('journal')} />
      )}
    </section>
  );

  const todosSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('todos')}>
        <span className={`collapse-arrow ${collapsedSections.todos ? '' : 'open'}`}>▶</span>
        To-Dos
      </h2>
      {!collapsedSections.todos && (
        <TodoList
          todos={todos} sections={sections} confettiEnabled={settings.confettiEnabled}
          onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onEditTodo={handleEditTodo}
          onIndentTodo={handleIndentTodo} onAddTodo={handleAddTodo} onAddTodoAfter={handleAddTodoAfter}
          onAddTodoBefore={handleAddTodoBefore} onMoveTodo={handleMoveTodo} onReorderTodos={handleReorderTodos}
          onToggleSection={handleToggleSection} onDeleteSection={handleDeleteSection} onEditSection={handleEditSection}
          onAddSection={handleAddSection} onReorderSections={handleReorderSections} onMoveToToday={handleMoveToToday}
          onConvertTodoToToggle={handleConvertTodoToToggle} onToggleCollapse={handleToggleCollapse} pushUndo={pushUndo}
        />
      )}
    </section>
  );

  const routinesSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('routines')}>
        <span className={`collapse-arrow ${collapsedSections.routines ? '' : 'open'}`}>▶</span>
        Routines
      </h2>
      {!collapsedSections.routines && (
        <RoutineList routines={routines} onIncrement={handleIncrement} onDecrement={handleDecrement}
          onDelete={handleDeleteRoutine} onEdit={handleEditRoutine} onReorder={handleReorderRoutines}
          onAdd={handleAddRoutine} confettiEnabled={settings.confettiEnabled}
          dayOffset={routineDayOffset} dayDateLabel={getDayDateLabel(routineDayOffset)}
          onPrevDay={handlePrevDay} onNextDay={handleNextDay} canGoPrev={routineDayOffset > minDayOffset()} />
      )}
    </section>
  );

  const q1GoalsSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('q1Goals')}>
        <span className={`collapse-arrow ${collapsedSections.q1Goals ? '' : 'open'}`}>▶</span>
        {editingGoalSection === 'q1Goals' ? (
          <input type="text" className="goal-section-title-input" value={editingGoalSectionValue}
            onChange={(e) => setEditingGoalSectionValue(e.target.value)} onBlur={saveGoalSectionTitle}
            onKeyDown={handleGoalSectionKeyDown} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <span className="goal-section-title" onClick={(e) => { e.stopPropagation(); startEditingGoalSection('q1Goals'); }}>
            {goalSectionTitles.q1Goals}
          </span>
        )}
      </h2>
      {!collapsedSections.q1Goals && (
        <GoalList goals={quarterlyGoals} onDelete={handleDeleteQuarterlyGoal} onEdit={handleEditQuarterlyGoal}
          onReorder={handleReorderQuarterlyGoals} onAdd={handleAddQuarterlyGoal} confettiEnabled={settings.confettiEnabled} />
      )}
    </section>
  );

  const yearlyGoalsSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('yearlyGoals')}>
        <span className={`collapse-arrow ${collapsedSections.yearlyGoals ? '' : 'open'}`}>▶</span>
        {editingGoalSection === 'yearlyGoals' ? (
          <input type="text" className="goal-section-title-input" value={editingGoalSectionValue}
            onChange={(e) => setEditingGoalSectionValue(e.target.value)} onBlur={saveGoalSectionTitle}
            onKeyDown={handleGoalSectionKeyDown} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <span className="goal-section-title" onClick={(e) => { e.stopPropagation(); startEditingGoalSection('yearlyGoals'); }}>
            {goalSectionTitles.yearlyGoals}
          </span>
        )}
      </h2>
      {!collapsedSections.yearlyGoals && (
        <GoalList goals={yearlyGoals} onDelete={handleDeleteYearlyGoal} onEdit={handleEditYearlyGoal}
          onReorder={handleReorderYearlyGoals} onAdd={handleAddYearlyGoal} confettiEnabled={settings.confettiEnabled} />
      )}
    </section>
  );

  const readingNotesSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('readingNotes')}>
        <span className={`collapse-arrow ${collapsedSections.readingNotes ? '' : 'open'}`}>▶</span>
        Reading Notes
      </h2>
      {!collapsedSections.readingNotes && (
        <RandomInsightCard note={randomNote} onAddNote={() => setShowAddNoteModal(true)} onViewAll={() => setShowViewNotesModal(true)} />
      )}
    </section>
  );

  const friendsSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('closeFriends')}>
        <span className={`collapse-arrow ${collapsedSections.closeFriends ? '' : 'open'}`}>▶</span>
        Close Friends
      </h2>
      {!collapsedSections.closeFriends && (
        <FriendsCard friends={friends} onViewAll={() => setCurrentPage('friends')} />
      )}
    </section>
  );

  const cookieJarSection = (
    <section className="app-section collapsible-section">
      <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('cookieJar')}>
        <span className={`collapse-arrow ${collapsedSections.cookieJar ? '' : 'open'}`}>▶</span>
        Cookie Jar
      </h2>
      {!collapsedSections.cookieJar && (
        <CookieJar content={cookieJarContent} onSave={handleSaveCookieJar} />
      )}
    </section>
  );

  const monthlyReflectionBanner = (() => {
    const now = new Date();
    const isFirstSunday = now.getDay() === 0 && now.getDate() <= 7;
    const daysUntilNextMonth = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isLastSundayBeforeNewMonth = now.getDay() === 0 && daysUntilNextMonth <= 4;
    const isReflectionSunday = isFirstSunday || isLastSundayBeforeNewMonth;

    // Only show the banner during the last few days of a month (reflect on the
    // current, about-to-end month) or during the first week of the next month
    // (reflect on the previous, just-completed month). Never nag about the
    // current month until it's actually nearly over.
    const isLastFewDaysOfMonth = daysUntilNextMonth <= 4;
    const isFirstWeekOfMonth = now.getDate() <= 7;
    if (!isLastFewDaysOfMonth && !isFirstWeekOfMonth) return null;

    // First week of the month: reflect on the previous month.
    // Last few days of the month: reflect on the current month.
    const reflectMonth = isFirstWeekOfMonth
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const reflectMonthStr = `${reflectMonth.getFullYear()}-${String(reflectMonth.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyReflections.find((r) => r.month === reflectMonthStr);
    const isComplete = existing
      && existing.overallLife && existing.challenges && existing.lookingForward
      && existing.ratingOverall && existing.ratingHealth && existing.ratingCareer
      && existing.ratingFinances && existing.ratingFriends && existing.ratingFamily
      && existing.ratingRomance && existing.ratingFun && existing.ratingGrowth
      && existing.ratingMentalHealth
      && existing.ratingEnvironment && existing.ratingProductivity;
    const monthName = reflectMonth.toLocaleDateString('en-US', { month: 'long' });
    // Scope the dismissal to the window it was dismissed in, so dismissing the
    // end-of-month heads-up doesn't also suppress the start-of-next-month final
    // reminder for the same (still-unfinished) reflection.
    const dismissKey = `monthlyReflectionDismissed-${reflectMonthStr}-${isFirstWeekOfMonth ? 'after' : 'during'}`;
    if (isComplete || reflectionDismissed || localStorage.getItem(dismissKey)) return null;
    return (
      <div className={`monthly-reflection-banner ${isComplete ? 'complete' : ''} ${isReflectionSunday && !isComplete ? 'urgent' : ''}`}>
        <span className="monthly-reflection-banner-text">
          {isComplete ? `${monthName} reflection` : `Monthly reflection for ${monthName}`}
          {isComplete && <span className="monthly-reflection-check"> ✓</span>}
        </span>
        <div className="monthly-reflection-banner-actions">
          <button onClick={() => {
            setMonthlyReflectionMonth(reflectMonthStr);
            const r = monthlyReflections.find((r) => r.month === reflectMonthStr);
            setCurrentMonthlyReflection(r || null);
            setShowMonthlyReflection(true);
          }}>{isComplete ? 'Review' : 'Open'}</button>
          <button className="monthly-reflection-dismiss" onClick={() => {
            localStorage.setItem(dismissKey, 'true');
            setReflectionDismissed(true);
          }}>Dismiss</button>
        </div>
      </div>
    );
  })();

  const healthBanner = (() => {
    const currentMonth = new Date().getMonth() + 1;
    const dueThisMonth = healthItems.filter((i) => {
      if (i.section !== 'test') return false;
      const months = i.date ? i.date.split(',').map((p) => parseInt(p.trim(), 10)) : [];
      if (!months.includes(currentMonth)) return false;
      // One-time tests already completed shouldn't keep nagging
      if (i.frequency === 'one-time') {
        const doneAny = (i.value || '').split(',').map((s) => s.trim()).filter(Boolean).length > 0;
        if (doneAny) return false;
      }
      return true;
    });
    if (dueThisMonth.length === 0) return null;
    return (
      <div className="health-banner" onClick={() => setCurrentPage('health')}>
        <span className="health-banner-icon">🩺</span>
        <span className="health-banner-text">
          <strong>Health this month:</strong> {dueThisMonth.map((t) => `${t.emoji || '🧪'} ${t.name}`).join(' · ')}
        </span>
      </div>
    );
  })();

  const modals = (
    <>
      {showMonthlyReflection && (
        <MonthlyReflectionModal reflection={currentMonthlyReflection} allReflections={monthlyReflections} month={monthlyReflectionMonth}
          onSave={handleSaveMonthlyReflection} onClose={() => { setShowMonthlyReflection(false); if (monthlyReflectionMonth) localStorage.setItem(`monthlyReflectionDismissed-${monthlyReflectionMonth}`, 'true'); }}
          onChangeMonth={handleChangeReflectionMonth} />
      )}
      {showJournalEditor && (
        <JournalEntryEditor entry={todayJournal} date={getTodayDate()} onSave={handleSaveJournalEntry}
          onClose={async () => { setShowJournalEditor(false); const updated = await getTodayJournalEntry(); setTodayJournal(updated ?? null); }} />
      )}
      {showAddNoteModal && <AddNoteModal onSave={handleAddNote} onClose={() => setShowAddNoteModal(false)} />}
      {showViewNotesModal && (
        <ViewNotesModal notes={allNotes} onClose={() => setShowViewNotesModal(false)} onDelete={handleDeleteNote}
          onAddNote={() => { setShowViewNotesModal(false); setShowAddNoteModal(true); }} />
      )}
    </>
  );

  // ─── MOBILE LAYOUT ───
  if (isMobile && currentPage === 'dashboard') {
    return (
      <div className="app mobile-app">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        {showSleepModal && (
          <div className="sleep-modal-overlay">
            <div className="sleep-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sleep-modal-emoji">😴</div>
              <h2>It's past midnight!</h2>
              <p>Go to sleep. Tomorrow you'll be sharper, more creative, and more productive.</p>
              <button className="sleep-modal-btn" onClick={() => { setShowSleepModal(false); setTimeout(() => setShowSleepModal(true), 5 * 60 * 1000); }}>
                Dismiss for 5 min
              </button>
            </div>
          </div>
        )}

        <header>
          <h1><span style={{ fontSize: '1.3em', marginRight: '0.5rem' }}>🏡</span>{settings.firstName ? `${settings.firstName}'s Homebase` : 'Homebase'}</h1>
          <p className="week-range">{formatWeekRange(weekStart)}</p>
          {saveStatus !== 'idle' && (
            <span className={`save-status ${saveStatus}`}>{saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}</span>
          )}
        </header>

        <div className="mobile-tab-content">
          {mobileTab === 'todos' && (
            <>
              {statsBanner}
              {healthBanner}
              {journalBanner}
              {monthlyReflectionBanner}
              <TodoList
                todos={todos} sections={sections} confettiEnabled={settings.confettiEnabled}
                onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onEditTodo={handleEditTodo}
                onIndentTodo={handleIndentTodo} onAddTodo={handleAddTodo} onAddTodoAfter={handleAddTodoAfter}
                onAddTodoBefore={handleAddTodoBefore} onMoveTodo={handleMoveTodo} onReorderTodos={handleReorderTodos}
                onToggleSection={handleToggleSection} onDeleteSection={handleDeleteSection} onEditSection={handleEditSection}
                onAddSection={handleAddSection} onReorderSections={handleReorderSections} onMoveToToday={handleMoveToToday}
                onConvertTodoToToggle={handleConvertTodoToToggle} onToggleCollapse={handleToggleCollapse} pushUndo={pushUndo}
              />
            </>
          )}
          {mobileTab === 'routines' && (
            <>
              {statsBanner}
              <RoutineList routines={routines} onIncrement={handleIncrement} onDecrement={handleDecrement}
                onDelete={handleDeleteRoutine} onEdit={handleEditRoutine} onReorder={handleReorderRoutines}
                onAdd={handleAddRoutine} confettiEnabled={settings.confettiEnabled}
                dayOffset={routineDayOffset} dayDateLabel={getDayDateLabel(routineDayOffset)}
                onPrevDay={handlePrevDay} onNextDay={handleNextDay} canGoPrev={routineDayOffset > minDayOffset()} />
            </>
          )}
          {mobileTab === 'goals' && (
            <>
              <GoalList goals={quarterlyGoals} onDelete={handleDeleteQuarterlyGoal} onEdit={handleEditQuarterlyGoal}
                onReorder={handleReorderQuarterlyGoals} onAdd={handleAddQuarterlyGoal} confettiEnabled={settings.confettiEnabled} />
              {yearlyGoalsSection}
            </>
          )}
          {mobileTab === 'more' && (
            <>
              <div className="mobile-more-grid">
                <button className="mobile-more-item" onClick={() => setCurrentPage('journal')}>
                  <span className="mobile-more-icon">📓</span>
                  <span>Journal</span>
                </button>
                <button className="mobile-more-item" onClick={() => setCurrentPage('friends')}>
                  <span className="mobile-more-icon">👥</span>
                  <span>Friends</span>
                </button>
                <button className="mobile-more-item" onClick={() => setCurrentPage('health')}>
                  <span className="mobile-more-icon">🩺</span>
                  <span>Health</span>
                </button>
                <button className="mobile-more-item" onClick={() => setCurrentPage('settings')}>
                  <span className="mobile-more-icon">⚙️</span>
                  <span>Settings</span>
                </button>
                <button className="mobile-more-item" onClick={onSignOut}>
                  <span className="mobile-more-icon">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
              {readingNotesSection}
              {cookieJarSection}
              {friendsSection}
            </>
          )}
        </div>

        {modals}

        <nav className="mobile-nav">
          <button className={`mobile-nav-item ${mobileTab === 'todos' ? 'active' : ''}`} onClick={() => setMobileTab('todos')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>Todos</span>
          </button>
          <button className={`mobile-nav-item ${mobileTab === 'routines' ? 'active' : ''}`} onClick={() => setMobileTab('routines')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/></svg>
            <span>Routines</span>
          </button>
          <button className={`mobile-nav-item ${mobileTab === 'goals' ? 'active' : ''}`} onClick={() => setMobileTab('goals')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
            <span>Goals</span>
          </button>
          <button className={`mobile-nav-item ${mobileTab === 'more' ? 'active' : ''}`} onClick={() => setMobileTab('more')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            <span>More</span>
          </button>
        </nav>
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ───
  return (
    <div className="app">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showSleepModal && (
        <div className="sleep-modal-overlay">
          <div className="sleep-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sleep-modal-emoji">😴</div>
            <h2>It's past midnight!</h2>
            <p>Go to sleep. Tomorrow you'll be sharper, more creative, and more productive.</p>
            <button className="sleep-modal-btn" onClick={() => { setShowSleepModal(false); setTimeout(() => setShowSleepModal(true), 5 * 60 * 1000); }}>
              Dismiss for 5 min
            </button>
          </div>
        </div>
      )}
      <header>
        <h1><span style={{ fontSize: '1.3em', marginRight: '0.5rem' }}>🏡</span>{settings.firstName ? `${settings.firstName}'s Homebase` : 'Homebase'}</h1>
        <p className="week-range">{formatWeekRange(weekStart)}</p>
        {saveStatus !== 'idle' && (
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
          </span>
        )}
        <div className="header-buttons">
<button className="settings-btn" onClick={onSignOut} data-tooltip="Sign out" data-tooltip-bottom style={{ marginRight: 4 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
            <button className="settings-btn" onClick={() => setCurrentPage('health')} data-tooltip="Health" data-tooltip-bottom style={{ marginRight: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>🩺</span>
            </button>
            <button className="settings-btn" onClick={() => setCurrentPage('settings')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </header>

      {statsBanner}

      {healthBanner}

      {monthlyReflectionBanner}

      <main>
        <div className="column">
          {journalBanner}
          {todosSection}
          {!journalNeedsAttention && (
            <section className="app-section collapsible-section">
              <h2 className="collapsible-header" onClick={() => toggleSectionCollapsed('gratitudeJournal')}>
                <span className={`collapse-arrow ${collapsedSections.gratitudeJournal ? '' : 'open'}`}>▶</span>
                Gratitude Journal
              </h2>
              {!collapsedSections.gratitudeJournal && (
                <JournalCard entry={todayJournal} onOpenEditor={() => setShowJournalEditor(true)} onViewAll={() => setCurrentPage('journal')} />
              )}
            </section>
          )}
          {readingNotesSection}
        </div>

        <div className="column">
          {routinesSection}
          {q1GoalsSection}
          {yearlyGoalsSection}
          {friendsSection}
          {cookieJarSection}
        </div>
      </main>

      {modals}

      <footer className="app-footer">
        Made with ❤️ in San Francisco
        <span className="footer-links">
          <a href="#privacy" onClick={(e) => { e.preventDefault(); setCurrentPage('privacy'); }}>Privacy</a>
          <span className="footer-dot">·</span>
          <a href="#terms" onClick={(e) => { e.preventDefault(); setCurrentPage('terms'); }}>Terms</a>
        </span>
      </footer>
    </div>
  );
}
