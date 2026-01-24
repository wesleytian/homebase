import { useState, useEffect, useCallback, useRef } from 'react';
import { useUndo } from './useUndo';
import { RoutineWithProgress, Todo, ToggleSection, Goal, GoalSubtask, JournalEntry, ReadingNote, Friend, FriendTier, AppSettings, DEFAULT_SETTINGS } from './types';
import {
  getAllRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  reorderRoutines,
  updateRoutineStreak,
  backfillStreaks,
  getCompletionsForWeek,
  addCompletion,
  removeLastCompletion,
  getWeekStart,
  getAllTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  getAllSections,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  getAllLifeGoals,
  addLifeGoal,
  updateLifeGoal,
  deleteLifeGoal,
  reorderLifeGoals,
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
  getFinancesContent,
  saveFinancesContent,
  getQuickNotesContent,
  saveQuickNotesContent,
  getUserSettings,
  saveUserSettings,
} from './db';
import { RoutineList } from './RoutineList';
import { AddRoutineForm } from './AddRoutineForm';
import { TodoList } from './TodoList';
import { GoalList } from './GoalList';
import { JournalCard } from './JournalCard';
import { JournalEntryEditor } from './JournalEntryEditor';
import { JournalPage } from './JournalPage';
import { RandomInsightCard } from './RandomInsightCard';
import { AddNoteModal } from './AddNoteModal';
import { ViewNotesModal } from './ViewNotesModal';
import { FriendsCard } from './FriendsCard';
import { FriendsPage, FriendSection, DEFAULT_SECTIONS } from './FriendsPage';
import { CookieJar } from './CookieJar';
import { FinancesCard } from './FinancesCard';
import { DailySummaryCard } from './DailySummaryCard';
import { SettingsPage } from './SettingsPage';
import { AIChat } from './AIChat';
import { QuickNotes } from './QuickNotes';
import './App.css';

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function isFirstWeekendOfMonth(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const dayOfMonth = now.getDate();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFirstWeek = dayOfMonth <= 7;
  return isWeekend && isFirstWeek;
}

export default function App() {
  const { pushUndo } = useUndo();
  const [routines, setRoutines] = useState<RoutineWithProgress[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sections, setSections] = useState<ToggleSection[]>([]);
  const [lifeGoals, setLifeGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [quarterlyGoals, setQuarterlyGoals] = useState<Goal[]>([]);
  // Section collapsed states (persisted to localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default: Life Goals collapsed, others open
    return {
      dailySummary: false,
      quickThoughts: false,
      gratitudeJournal: false,
      todos: false,
      readingNotes: false,
      routines: false,
      q1Goals: false,
      yearlyGoals: false,
      lifeGoals: true,
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

  const collapseAllExceptTodos = () => {
    const updated = {
      dailySummary: true,
      quickThoughts: true,
      gratitudeJournal: true,
      todos: false,
      readingNotes: true,
      routines: true,
      q1Goals: true,
      yearlyGoals: true,
      lifeGoals: true,
      closeFriends: true,
      cookieJar: true,
    };
    setCollapsedSections(updated);
    localStorage.setItem('collapsedSections', JSON.stringify(updated));
  };

  const expandAllSections = () => {
    const updated = {
      dailySummary: false,
      quickThoughts: false,
      gratitudeJournal: false,
      todos: false,
      readingNotes: false,
      routines: false,
      q1Goals: false,
      yearlyGoals: false,
      lifeGoals: false,
      closeFriends: false,
      cookieJar: false,
    };
    setCollapsedSections(updated);
    localStorage.setItem('collapsedSections', JSON.stringify(updated));
  };
  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(null);
  const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [allNotes, setAllNotes] = useState<ReadingNote[]>([]);
  const [randomNote, setRandomNote] = useState<ReadingNote | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showViewNotesModal, setShowViewNotesModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsSections, setFriendsSections] = useState<FriendSection[]>(DEFAULT_SECTIONS);
  const [cookieJarContent, setCookieJarContent] = useState<string>('');
  const [financesContent, setFinancesContent] = useState<string>('');
  const [quickNotesContent, setQuickNotesContent] = useState<string>('');
  // Editable goal section titles (loaded from DB)
  const DEFAULT_GOAL_SECTION_TITLES = {
    q1Goals: '2026 Q1 Goals',
    yearlyGoals: '2026 Goals',
    lifeGoals: 'Life Goals',
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
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [weekStart, setWeekStart] = useState(() => getWeekStart());

  // Hash-based routing for browser back/forward support
  const getPageFromHash = useCallback((): 'dashboard' | 'journal' | 'friends' | 'settings' => {
    const hash = window.location.hash.slice(1); // Remove the #
    if (hash === 'journal' || hash === 'friends' || hash === 'settings') {
      return hash;
    }
    return 'dashboard';
  }, []);

  const [currentPage, setCurrentPageState] = useState<'dashboard' | 'journal' | 'friends' | 'settings'>(getPageFromHash);

  const setCurrentPage = useCallback((page: 'dashboard' | 'journal' | 'friends' | 'settings') => {
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

  const loadData = useCallback(async () => {
    const [allRoutines, completions, allTodos, allSections, allLifeGoals, allYearlyGoals, allQuarterlyGoals, todayEntry, journalEntries, readingNotes, randomReadingNote, allFriends, cookieJar, finances, quickNotes, userSettings] = await Promise.all([
      getAllRoutines(),
      getCompletionsForWeek(weekStart),
      getAllTodos(),
      getAllSections(),
      getAllLifeGoals(),
      getAllYearlyGoals(),
      getAllQuarterlyGoals(),
      getTodayJournalEntry(),
      getAllJournalEntries(),
      getAllReadingNotes(),
      getRandomReadingNote(),
      getAllFriends(),
      getCookieJarContent(),
      getFinancesContent(),
      getQuickNotesContent(),
      getUserSettings(),
    ]);

    const completionCounts = new Map<string, number>();
    const completedTodaySet = new Set<string>();

    // Get start of today (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    // Get yesterday's date string for streak-at-risk calculation
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    for (const c of completions) {
      completionCounts.set(c.routineId, (completionCounts.get(c.routineId) || 0) + 1);
      // Check if this completion happened today
      if (c.completedAt >= todayStart) {
        completedTodaySet.add(c.routineId);
      }
    }

    const routinesWithProgress: RoutineWithProgress[] = allRoutines.map((r) => {
      const completedToday = completedTodaySet.has(r.id);
      // Streak is at risk if: has a streak, not completed today, and last streak date was yesterday
      const streakAtRisk = r.currentStreak > 0 && !completedToday && r.lastStreakDate === yesterdayStr;
      return {
        ...r,
        completedThisWeek: completionCounts.get(r.id) || 0,
        completedToday,
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
    setAllJournalEntries(journalEntries);
    setAllNotes(readingNotes);
    setRandomNote(randomReadingNote);
    setFriends(allFriends);
    setCookieJarContent(cookieJar);
    setFinancesContent(finances);
    setQuickNotesContent(quickNotes);
    // Apply user settings from database
    if (userSettings.goalSectionTitles) {
      setGoalSectionTitles({ ...DEFAULT_GOAL_SECTION_TITLES, ...userSettings.goalSectionTitles });
    }
    if (userSettings.friendsSections) {
      setFriendsSections(userSettings.friendsSections);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    loadData();
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
      throw error;
    }
  }, []);

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

  // Routine handlers
  const handleAddRoutine = async (name: string, frequency: number, metadata: string) => {
    await addRoutine({ name, frequencyPerWeek: frequency, metadata });
    loadData();
  };

  const handleIncrement = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;

    // Calculate new streak values
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = routine.currentStreak;
    let newLongest = routine.longestStreak;
    let newLastStreakDate = routine.lastStreakDate;

    // Update streak if this is the first completion today
    if (!routine.completedToday) {
      if (routine.lastStreakDate === todayStr) {
        newStreak = routine.currentStreak;
      } else if (routine.lastStreakDate === yesterdayStr) {
        newStreak = routine.currentStreak + 1;
      } else {
        newStreak = 1;
      }
      newLongest = Math.max(newStreak, routine.longestStreak);
      newLastStreakDate = todayStr;
    }

    // Optimistic update - update state immediately
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              completedThisWeek: r.completedThisWeek + 1,
              completedToday: true,
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastStreakDate: newLastStreakDate,
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
        // Restore previous state optimistically
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completedThisWeek: routine.completedThisWeek,
                  completedToday: routine.completedToday,
                  currentStreak: routine.currentStreak,
                  longestStreak: routine.longestStreak,
                  lastStreakDate: routine.lastStreakDate,
                  streakAtRisk: routine.streakAtRisk,
                }
              : r
          )
        );
        // Sync to DB in background
        removeLastCompletion(id, weekStart).catch(console.error);
      },
    });

    // Sync to DB in background
    addCompletion(id).catch(console.error);
    if (!routine.completedToday) {
      updateRoutineStreak(id, newStreak, newLongest, newLastStreakDate).catch(console.error);
    }
  };

  const handleDecrement = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine || routine.completedThisWeek <= 0) return;

    // Calculate if we're removing today's only completion
    const wasCompletedToday = routine.completedToday;

    // Optimistic update - update state immediately
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              completedThisWeek: Math.max(0, r.completedThisWeek - 1),
              // Only mark as not completed today if this was the only completion today
              // (simplification: we assume one completion per day for daily tracking)
              completedToday: wasCompletedToday ? false : r.completedToday,
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
                }
              : r
          )
        );
        // Sync to DB in background
        addCompletion(id).catch(console.error);
      },
    });

    // Sync to DB in background
    removeLastCompletion(id, weekStart).catch(console.error);
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
    if (routine) {
      await updateRoutine({ ...routine, ...updates });
      loadData();
    }
  };

  const handleReorderRoutines = async (reorderedRoutines: RoutineWithProgress[]) => {
    setRoutines(reorderedRoutines);
    await reorderRoutines(reorderedRoutines);
  };

  // Todo handlers
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
        deleteTodo(realId).catch(console.error);
      },
    });

    // Sync to DB in background
    addTodo(text, sectionId).then((dbTodo) => {
      realId = dbTodo.id; // Update for undo
      // Replace temp todo with real todo from DB
      setTodos((current) => current.map((t) => (t.id === tempId ? dbTodo : t)));
    }).catch(console.error);
  };

  const handleAddTodoAfter = async (text: string, afterTodoId: string, indent: number = 0) => {
    const afterTodo = todos.find((t) => t.id === afterTodoId);
    if (!afterTodo) return;

    // Generate a temporary ID for optimistic update
    const tempId = crypto.randomUUID();
    const afterIndex = todos.findIndex((t) => t.id === afterTodoId);

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

    // Update state immediately (optimistic)
    const newTodos = [...todos];
    newTodos.splice(afterIndex + 1, 0, newTodo);
    setTodos(newTodos);

    // Focus the new todo's input
    setTimeout(() => {
      const newInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(0, 0);
      }
    }, 0);

    // Sync to DB in background
    addTodo(text, afterTodo.sectionId, indent).then(async (dbTodo) => {
      // Check if the temp input is currently focused
      const tempInput = document.querySelector(`[data-drag-id="${tempId}"] .todo-text-input`) as HTMLInputElement;
      const wasFocused = document.activeElement === tempInput;
      const cursorPos = tempInput?.selectionStart ?? 0;

      // Replace temp ID with real todo, preserving any local changes (order, indent, text)
      setTodos(current => {
        const tempTodo = current.find(t => t.id === tempId);
        const updated = current.map(t => t.id === tempId ? {
          ...dbTodo,
          order: t.order,
          indent: t.indent,  // Preserve local indent changes
          text: t.text,      // Preserve local text changes
        } : t);
        // Sync local changes to DB if they differ
        if (tempTodo && (tempTodo.indent !== dbTodo.indent || tempTodo.text !== dbTodo.text)) {
          updateTodo({ ...dbTodo, indent: tempTodo.indent, text: tempTodo.text }).catch(console.error);
        }
        // Reorder in background to persist positions
        reorderTodos(updated).catch(console.error);
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
    }).catch(console.error);
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const isCompleting = !todo.completed;
    const previousTodos = [...todos]; // Save for undo
    const updatedTodo = {
      ...todo,
      completed: isCompleting,
      completedAt: isCompleting ? Date.now() : null,
    };

    // Update state immediately (optimistic)
    let newTodos = todos.map((t) => (t.id === id ? updatedTodo : t));

    // If completing and auto-sort is enabled, move to bottom of section
    if (isCompleting && settings.autoSortCompletedTodos) {
      // Find all todos in the same section
      const sectionTodos = newTodos.filter((t) => t.sectionId === todo.sectionId);
      const completedTodoIndex = sectionTodos.findIndex((t) => t.id === id);

      // Only reorder if not already at the bottom of the section
      if (completedTodoIndex !== -1 && completedTodoIndex < sectionTodos.length - 1) {
        // Find the last todo in this section (in the full array)
        const lastSectionTodo = sectionTodos[sectionTodos.length - 1];
        const lastSectionTodoGlobalIndex = newTodos.findIndex((t) => t.id === lastSectionTodo.id);
        const completedTodoGlobalIndex = newTodos.findIndex((t) => t.id === id);

        // Remove from current position and insert after the last section todo
        const [removed] = newTodos.splice(completedTodoGlobalIndex, 1);
        // Adjust index since we removed an item
        const insertIndex = completedTodoGlobalIndex < lastSectionTodoGlobalIndex
          ? lastSectionTodoGlobalIndex
          : lastSectionTodoGlobalIndex + 1;
        newTodos.splice(insertIndex, 0, removed);
      }
    }

    setTodos(newTodos);

    // Push undo action
    pushUndo({
      type: 'toggle-todo',
      description: `${isCompleting ? 'Complete' : 'Uncomplete'} "${todo.text.slice(0, 30)}"`,
      undo: () => {
        setTodos(previousTodos);
        updateTodo(todo).catch(console.error);
        if (isCompleting && settings.autoSortCompletedTodos) {
          reorderTodos(previousTodos).catch(console.error);
        }
      },
    });

    // Sync to DB in background
    updateTodo(updatedTodo).catch(console.error);
    if (isCompleting && settings.autoSortCompletedTodos) {
      reorderTodos(newTodos).catch(console.error);
    }
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
        }).catch(console.error);
      },
    });

    // Sync to DB in background
    deleteTodo(id).catch(console.error);
  };

  const handleEditTodo = (id: string, text: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const previousText = todo.text;
    if (text === previousText) return; // No change

    const updatedTodo = { ...todo, text };
    // Update state immediately (optimistic)
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));

    // Push undo action
    pushUndo({
      type: 'edit-todo',
      description: `Edit "${previousText.slice(0, 20)}" → "${text.slice(0, 20)}"`,
      undo: () => {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: previousText } : t)));
        updateTodo({ ...todo, text: previousText }).catch(console.error);
      },
    });

    // Sync to DB in background
    updateTodo(updatedTodo).catch(console.error);
  };

  const handleIndentTodo = (id: string, indent: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, indent };
    // Update state immediately (optimistic)
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    // Sync to DB in background
    updateTodo(updatedTodo).catch(console.error);
  };

  const handleReorderTodos = (reorderedTodos: Todo[]) => {
    setTodos(reorderedTodos);
    // Sync to DB in background
    reorderTodos(reorderedTodos).catch(console.error);
  };

  const handleMoveTodo = (id: string, newSectionId: string | null) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, sectionId: newSectionId };
    // Update state immediately (optimistic)
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    // Sync to DB in background
    updateTodo(updatedTodo).catch(console.error);
  };

  // Section handlers
  const handleAddSection = async (name: string) => {
    await withSaveStatus(async () => {
      await addSection(name);
      await loadData();
    });
  };

  const handleToggleSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;

    const updatedSection = { ...section, collapsed: !section.collapsed };
    // Update state immediately (optimistic)
    setSections((prev) => prev.map((s) => (s.id === id ? updatedSection : s)));
    // Sync to DB in background
    updateSection(updatedSection).catch(console.error);
  };

  const handleDeleteSection = async (id: string) => {
    await withSaveStatus(async () => {
      await deleteSection(id);
      await loadData();
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

  const handleMoveToToday = async (sourceSectionId: string) => {
    // Get today's formatted date
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const todayFormatted = `${dayName}, ${month}/${date}`;

    // Find or create today's section
    let todaySection = sections.find((s) => s.name === todayFormatted);
    let needsNewSection = !todaySection;

    if (needsNewSection) {
      // Create section in DB first since we need the real ID
      todaySection = await addSection(todayFormatted);
      // Add to state at the top
      setSections((prev) => [todaySection!, ...prev]);
    }

    // Get todos to move
    const todosToMove = todos.filter(
      (t) => t.sectionId === sourceSectionId && !t.completed
    );

    if (todosToMove.length === 0) return;

    // Optimistic update - move todos and collapse source section immediately
    setTodos((prev) =>
      prev.map((t) =>
        t.sectionId === sourceSectionId && !t.completed
          ? { ...t, sectionId: todaySection!.id }
          : t
      )
    );

    setSections((prev) =>
      prev.map((s) =>
        s.id === sourceSectionId ? { ...s, collapsed: true } : s
      )
    );

    // Sync to DB in background (batch the updates)
    Promise.all([
      ...todosToMove.map((todo) =>
        updateTodo({ ...todo, sectionId: todaySection!.id })
      ),
      updateSection({
        ...sections.find((s) => s.id === sourceSectionId)!,
        collapsed: true,
      }),
    ]).catch(console.error);
  };

  // Life Goal handlers
  const handleAddLifeGoal = async (title: string) => {
    await addLifeGoal(title);
    loadData();
  };

  const handleDeleteLifeGoal = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await deleteLifeGoal(id);
      loadData();
    }
  };

  const handleEditLifeGoal = async (id: string, updates: { title?: string; description?: string }) => {
    const goal = lifeGoals.find((g) => g.id === id);
    if (goal) {
      await updateLifeGoal({ ...goal, ...updates });
      loadData();
    }
  };

  const handleReorderLifeGoals = async (reorderedGoals: Goal[]) => {
    setLifeGoals(reorderedGoals);
    await reorderLifeGoals(reorderedGoals);
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
    updateQuarterlyGoal(updatedGoal).catch(console.error);
  };

  const handleReorderQuarterlyGoals = async (reorderedGoals: Goal[]) => {
    setQuarterlyGoals(reorderedGoals);
    await reorderQuarterlyGoals(reorderedGoals);
  };

  // Journal handlers
  const handleSaveJournalEntry = async (entry: Partial<JournalEntry> & { date: string }) => {
    // Just save to DB - don't update parent state or call loadData()
    // The JournalEntryEditor manages its own local state to avoid race conditions
    await createOrUpdateJournalEntry(entry);
  };

  // Reading notes handlers
  const handleAddNote = async (source: string, content: string) => {
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

  // Finances handler
  const handleSaveFinances = async (content: string) => {
    await saveFinancesContent(content);
    setFinancesContent(content);
  };

  // Quick Notes handler
  const handleSaveQuickNotes = async (content: string) => {
    await saveQuickNotesContent(content);
    setQuickNotesContent(content);
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
    return <div className="loading">Loading...</div>;
  }

  const aiChatComponent = (
    <AIChat
      settings={settings}
      todos={todos}
      sections={sections}
      lifeGoals={lifeGoals}
      yearlyGoals={yearlyGoals}
      quarterlyGoals={quarterlyGoals}
      routines={routines}
      journalEntries={allJournalEntries}
      friends={friends}
      onNavigateToSettings={() => setCurrentPage('settings')}
    />
  );

  if (currentPage === 'journal') {
    return (
      <div className="app">
        <JournalPage
          entries={allJournalEntries}
          onBack={() => setCurrentPage('dashboard')}
          onSave={handleSaveJournalEntry}
        />
        {aiChatComponent}
      </div>
    );
  }

  if (currentPage === 'friends') {
    return (
      <div className="app">
        <FriendsPage
          friends={friends}
          sections={friendsSections}
          onBack={() => setCurrentPage('dashboard')}
          onAddFriend={handleAddFriend}
          onEditFriend={handleEditFriend}
          onDeleteFriend={handleDeleteFriend}
          onSectionsChange={handleFriendsSectionsChange}
          pushUndo={pushUndo}
        />
        {aiChatComponent}
      </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div className="app">
        <SettingsPage
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onSortCompletedToBottom={handleSortCompletedToBottom}
          onBackfillStreaks={async () => {
            await backfillStreaks();
            loadData();
          }}
          onBack={() => setCurrentPage('dashboard')}
        />
        {aiChatComponent}
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Command Center</h1>
        <p className="week-range">{formatWeekRange(weekStart)}</p>
        {saveStatus !== 'idle' && (
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
          </span>
        )}
        <div className="header-buttons">
          <button className="focus-btn" onClick={collapseAllExceptTodos} title="Focus Mode - Collapse all except To-Dos">
            Focus
          </button>
          <button className="expand-btn" onClick={expandAllSections} title="Expand all sections">
            Expand All
          </button>
          <button className="settings-btn" onClick={() => setCurrentPage('settings')} title="Settings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </header>

      <section className="app-section collapsible-section">
        <h2
          className="collapsible-header"
          onClick={() => toggleSectionCollapsed('dailySummary')}
        >
          <span className={`collapse-arrow ${collapsedSections.dailySummary ? '' : 'open'}`}>▶</span>
          Today's Focus
        </h2>
        {!collapsedSections.dailySummary && (
          <DailySummaryCard
            todos={todos}
            sections={sections}
            routines={routines}
          />
        )}
      </section>

      <section className="app-section quick-notes-section collapsible-section">
        <h2
          className="collapsible-header"
          onClick={() => toggleSectionCollapsed('quickThoughts')}
        >
          <span className={`collapse-arrow ${collapsedSections.quickThoughts ? '' : 'open'}`}>▶</span>
          Quick Thoughts
        </h2>
        {!collapsedSections.quickThoughts && (
          <QuickNotes
            content={quickNotesContent}
            onSave={handleSaveQuickNotes}
          />
        )}
      </section>

      <main>
        <div className="column">
          {journalNeedsAttention && (
            <section className="app-section journal-attention collapsible-section">
              <h2
                className="collapsible-header"
                onClick={() => toggleSectionCollapsed('gratitudeJournal')}
              >
                <span className={`collapse-arrow ${collapsedSections.gratitudeJournal ? '' : 'open'}`}>▶</span>
                Gratitude Journal
              </h2>
              {!collapsedSections.gratitudeJournal && (
                <JournalCard
                  entry={todayJournal}
                  onOpenEditor={() => setShowJournalEditor(true)}
                  onViewAll={() => setCurrentPage('journal')}
                />
              )}
            </section>
          )}

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('todos')}
            >
              <span className={`collapse-arrow ${collapsedSections.todos ? '' : 'open'}`}>▶</span>
              To-Dos
            </h2>
            {!collapsedSections.todos && (
              <TodoList
                todos={todos}
                sections={sections}
                confettiEnabled={settings.confettiEnabled}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                onEditTodo={handleEditTodo}
                onIndentTodo={handleIndentTodo}
                onAddTodo={handleAddTodo}
                onAddTodoAfter={handleAddTodoAfter}
                onMoveTodo={handleMoveTodo}
                onReorderTodos={handleReorderTodos}
                onToggleSection={handleToggleSection}
                onDeleteSection={handleDeleteSection}
                onEditSection={handleEditSection}
                onAddSection={handleAddSection}
                onReorderSections={handleReorderSections}
                onMoveToToday={handleMoveToToday}
                pushUndo={pushUndo}
              />
            )}
          </section>

          {!journalNeedsAttention && (
            <section className="app-section collapsible-section">
              <h2
                className="collapsible-header"
                onClick={() => toggleSectionCollapsed('gratitudeJournal')}
              >
                <span className={`collapse-arrow ${collapsedSections.gratitudeJournal ? '' : 'open'}`}>▶</span>
                Gratitude Journal
              </h2>
              {!collapsedSections.gratitudeJournal && (
                <JournalCard
                  entry={todayJournal}
                  onOpenEditor={() => setShowJournalEditor(true)}
                  onViewAll={() => setCurrentPage('journal')}
                />
              )}
            </section>
          )}

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('readingNotes')}
            >
              <span className={`collapse-arrow ${collapsedSections.readingNotes ? '' : 'open'}`}>▶</span>
              Reading Notes
            </h2>
            {!collapsedSections.readingNotes && (
              <RandomInsightCard
                note={randomNote}
                onAddNote={() => setShowAddNoteModal(true)}
                onViewAll={() => setShowViewNotesModal(true)}
              />
            )}
          </section>
        </div>

        <div className="column">
          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('routines')}
            >
              <span className={`collapse-arrow ${collapsedSections.routines ? '' : 'open'}`}>▶</span>
              Routines
            </h2>
            {!collapsedSections.routines && (
              <>
                <AddRoutineForm onAdd={handleAddRoutine} />
                <RoutineList
                  routines={routines}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onDelete={handleDeleteRoutine}
                  onEdit={handleEditRoutine}
                  onReorder={handleReorderRoutines}
                  confettiEnabled={settings.confettiEnabled}
                />
              </>
            )}
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('q1Goals')}
            >
              <span className={`collapse-arrow ${collapsedSections.q1Goals ? '' : 'open'}`}>▶</span>
              {editingGoalSection === 'q1Goals' ? (
                <input
                  type="text"
                  className="goal-section-title-input"
                  value={editingGoalSectionValue}
                  onChange={(e) => setEditingGoalSectionValue(e.target.value)}
                  onBlur={saveGoalSectionTitle}
                  onKeyDown={handleGoalSectionKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className="goal-section-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingGoalSection('q1Goals');
                  }}
                >
                  {goalSectionTitles.q1Goals}
                </span>
              )}
            </h2>
            {!collapsedSections.q1Goals && (
              <GoalList
                goals={quarterlyGoals}
                onDelete={handleDeleteQuarterlyGoal}
                onEdit={handleEditQuarterlyGoal}
                onReorder={handleReorderQuarterlyGoals}
                onAdd={handleAddQuarterlyGoal}
              />
            )}
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('yearlyGoals')}
            >
              <span className={`collapse-arrow ${collapsedSections.yearlyGoals ? '' : 'open'}`}>▶</span>
              {editingGoalSection === 'yearlyGoals' ? (
                <input
                  type="text"
                  className="goal-section-title-input"
                  value={editingGoalSectionValue}
                  onChange={(e) => setEditingGoalSectionValue(e.target.value)}
                  onBlur={saveGoalSectionTitle}
                  onKeyDown={handleGoalSectionKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className="goal-section-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingGoalSection('yearlyGoals');
                  }}
                >
                  {goalSectionTitles.yearlyGoals}
                </span>
              )}
            </h2>
            {!collapsedSections.yearlyGoals && (
              <GoalList
                goals={yearlyGoals}
                onDelete={handleDeleteYearlyGoal}
                onEdit={handleEditYearlyGoal}
                onReorder={handleReorderYearlyGoals}
                onAdd={handleAddYearlyGoal}
              />
            )}
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('lifeGoals')}
            >
              <span className={`collapse-arrow ${collapsedSections.lifeGoals ? '' : 'open'}`}>▶</span>
              {editingGoalSection === 'lifeGoals' ? (
                <input
                  type="text"
                  className="goal-section-title-input"
                  value={editingGoalSectionValue}
                  onChange={(e) => setEditingGoalSectionValue(e.target.value)}
                  onBlur={saveGoalSectionTitle}
                  onKeyDown={handleGoalSectionKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className="goal-section-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingGoalSection('lifeGoals');
                  }}
                >
                  {goalSectionTitles.lifeGoals}
                </span>
              )}
            </h2>
            {!collapsedSections.lifeGoals && (
              <GoalList
                goals={lifeGoals}
                onDelete={handleDeleteLifeGoal}
                onEdit={handleEditLifeGoal}
                onReorder={handleReorderLifeGoals}
                onAdd={handleAddLifeGoal}
              />
            )}
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('closeFriends')}
            >
              <span className={`collapse-arrow ${collapsedSections.closeFriends ? '' : 'open'}`}>▶</span>
              Close Friends
            </h2>
            {!collapsedSections.closeFriends && (
              <FriendsCard
                friends={friends}
                onViewAll={() => setCurrentPage('friends')}
              />
            )}
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => toggleSectionCollapsed('cookieJar')}
            >
              <span className={`collapse-arrow ${collapsedSections.cookieJar ? '' : 'open'}`}>▶</span>
              Cookie Jar
            </h2>
            {!collapsedSections.cookieJar && (
              <CookieJar
                content={cookieJarContent}
                onSave={handleSaveCookieJar}
              />
            )}
          </section>

          <section className="app-section">
            <FinancesCard
              content={financesContent}
              onSave={handleSaveFinances}
              isReviewTime={isFirstWeekendOfMonth()}
            />
          </section>
        </div>
      </main>

      {showJournalEditor && (
        <JournalEntryEditor
          entry={todayJournal}
          date={getTodayDate()}
          onSave={handleSaveJournalEntry}
          onClose={() => setShowJournalEditor(false)}
        />
      )}

      {showAddNoteModal && (
        <AddNoteModal
          onSave={handleAddNote}
          onClose={() => setShowAddNoteModal(false)}
        />
      )}

      {showViewNotesModal && (
        <ViewNotesModal
          notes={allNotes}
          onClose={() => setShowViewNotesModal(false)}
          onDelete={handleDeleteNote}
          onAddNote={() => {
            setShowViewNotesModal(false);
            setShowAddNoteModal(true);
          }}
        />
      )}

      {aiChatComponent}
    </div>
  );
}
