import { useState, useEffect, useCallback } from 'react';
import { RoutineWithProgress, Todo, ToggleSection, Goal, JournalEntry, ReadingNote, Friend, FriendTier, AppSettings, DEFAULT_SETTINGS } from './types';
import {
  getAllRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  reorderRoutines,
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
  const [routines, setRoutines] = useState<RoutineWithProgress[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sections, setSections] = useState<ToggleSection[]>([]);
  const [lifeGoals, setLifeGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [quarterlyGoals, setQuarterlyGoals] = useState<Goal[]>([]);
  const [lifeGoalsCollapsed, setLifeGoalsCollapsed] = useState(true);
  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(null);
  const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [allNotes, setAllNotes] = useState<ReadingNote[]>([]);
  const [randomNote, setRandomNote] = useState<ReadingNote | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showViewNotesModal, setShowViewNotesModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsSections, setFriendsSections] = useState<FriendSection[]>(() => {
    const saved = localStorage.getItem('friendsSections');
    if (saved) {
      return JSON.parse(saved);
    }
    return DEFAULT_SECTIONS;
  });
  const [cookieJarContent, setCookieJarContent] = useState<string>('');
  const [financesContent, setFinancesContent] = useState<string>('');
  const [quickNotesContent, setQuickNotesContent] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const weekStart = getWeekStart();

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
    const [allRoutines, completions, allTodos, allSections, allLifeGoals, allYearlyGoals, allQuarterlyGoals, todayEntry, journalEntries, readingNotes, randomReadingNote, allFriends, cookieJar, finances, quickNotes] = await Promise.all([
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
    ]);

    const completionCounts = new Map<string, number>();
    for (const c of completions) {
      completionCounts.set(c.routineId, (completionCounts.get(c.routineId) || 0) + 1);
    }

    const routinesWithProgress: RoutineWithProgress[] = allRoutines.map((r) => ({
      ...r,
      completedThisWeek: completionCounts.get(r.id) || 0,
    }));

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
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update current hour every minute to check for 10pm
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleIncrement = async (id: string) => {
    await addCompletion(id);
    loadData();
  };

  const handleDecrement = async (id: string) => {
    await removeLastCompletion(id, weekStart);
    loadData();
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
    await withSaveStatus(async () => {
      await addTodo(text, sectionId);
      await loadData();
    });
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const isCompleting = !todo.completed;
    const updatedTodo = {
      ...todo,
      completed: isCompleting,
      completedAt: isCompleting ? Date.now() : null,
    };

    // Update state immediately (optimistic)
    let newTodos = todos.map((t) => (t.id === id ? updatedTodo : t));

    // If completing and auto-sort is enabled, move to bottom of section
    if (isCompleting && settings.autoSortCompletedTodos) {
      const sectionTodos = newTodos.filter((t) => t.sectionId === todo.sectionId);
      const otherTodos = newTodos.filter((t) => t.sectionId !== todo.sectionId);
      const todoIndex = sectionTodos.findIndex((t) => t.id === id);

      if (todoIndex !== -1 && todoIndex < sectionTodos.length - 1) {
        const reorderedSection = [
          ...sectionTodos.slice(0, todoIndex),
          ...sectionTodos.slice(todoIndex + 1),
          sectionTodos[todoIndex],
        ];
        newTodos = [...otherTodos, ...reorderedSection];
      }
    }

    setTodos(newTodos);

    // Sync to DB in background
    updateTodo(updatedTodo).catch(console.error);
    if (isCompleting && settings.autoSortCompletedTodos) {
      reorderTodos(newTodos).catch(console.error);
    }
  };

  const handleDeleteTodo = (id: string) => {
    // Update state immediately (optimistic)
    setTodos((prev) => prev.filter((t) => t.id !== id));
    // Sync to DB in background
    deleteTodo(id).catch(console.error);
  };

  const handleEditTodo = (id: string, text: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, text };
    // Update state immediately (optimistic)
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
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

  const handleToggleSection = async (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      await updateSection({ ...section, collapsed: !section.collapsed });
      loadData();
    }
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
    setSections(reorderedSections);
    await withSaveStatus(() => reorderSections(reorderedSections));
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
    if (!todaySection) {
      todaySection = await addSection(todayFormatted);
    }

    // Move all unfinished todos from source section to today's section
    const todosToMove = todos.filter(
      (t) => t.sectionId === sourceSectionId && !t.completed
    );

    for (const todo of todosToMove) {
      await updateTodo({ ...todo, sectionId: todaySection.id });
    }

    // Collapse the source section
    const sourceSection = sections.find((s) => s.id === sourceSectionId);
    if (sourceSection) {
      await updateSection({ ...sourceSection, collapsed: true });
    }

    loadData();
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

  const handleEditQuarterlyGoal = async (id: string, updates: { title?: string; description?: string }) => {
    const goal = quarterlyGoals.find((g) => g.id === id);
    if (goal) {
      await updateQuarterlyGoal({ ...goal, ...updates });
      loadData();
    }
  };

  const handleReorderQuarterlyGoals = async (reorderedGoals: Goal[]) => {
    setQuarterlyGoals(reorderedGoals);
    await reorderQuarterlyGoals(reorderedGoals);
  };

  // Journal handlers
  const handleSaveJournalEntry = async (entry: Partial<JournalEntry> & { date: string }) => {
    await createOrUpdateJournalEntry(entry);
    loadData();
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
    await addFriend(name, tier);
    loadData();
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

  const handleFriendsSectionsChange = (sections: FriendSection[]) => {
    setFriendsSections(sections);
    localStorage.setItem('friendsSections', JSON.stringify(sections));
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
        <button className="settings-btn" onClick={() => setCurrentPage('settings')} title="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </header>

      <DailySummaryCard
        todos={todos}
        sections={sections}
        routines={routines}
      />

      <section className="app-section quick-notes-section">
        <h2>Quick Thoughts</h2>
        <QuickNotes
          content={quickNotesContent}
          onSave={handleSaveQuickNotes}
        />
      </section>

      <main>
        <div className="column">
          {journalNeedsAttention && (
            <section className="app-section journal-attention">
              <h2>Gratitude Journal</h2>
              <JournalCard
                entry={todayJournal}
                onOpenEditor={() => setShowJournalEditor(true)}
                onViewAll={() => setCurrentPage('journal')}
              />
            </section>
          )}

          <section className="app-section">
            <h2>To-Dos</h2>
            <TodoList
              todos={todos}
              sections={sections}
              confettiEnabled={settings.confettiEnabled}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              onEditTodo={handleEditTodo}
              onIndentTodo={handleIndentTodo}
              onAddTodo={handleAddTodo}
              onMoveTodo={handleMoveTodo}
              onReorderTodos={handleReorderTodos}
              onToggleSection={handleToggleSection}
              onDeleteSection={handleDeleteSection}
              onEditSection={handleEditSection}
              onAddSection={handleAddSection}
              onReorderSections={handleReorderSections}
              onMoveToToday={handleMoveToToday}
            />
          </section>

          {!journalNeedsAttention && (
            <section className="app-section">
              <h2>Gratitude Journal</h2>
              <JournalCard
                entry={todayJournal}
                onOpenEditor={() => setShowJournalEditor(true)}
                onViewAll={() => setCurrentPage('journal')}
              />
            </section>
          )}

          <section className="app-section">
            <h2>Reading Notes</h2>
            <RandomInsightCard
              note={randomNote}
              onAddNote={() => setShowAddNoteModal(true)}
              onViewAll={() => setShowViewNotesModal(true)}
            />
          </section>
        </div>

        <div className="column">
          <section className="app-section">
            <h2>Routines</h2>
            <AddRoutineForm onAdd={handleAddRoutine} />
            <RoutineList
              routines={routines}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onDelete={handleDeleteRoutine}
              onEdit={handleEditRoutine}
              onReorder={handleReorderRoutines}
            />
          </section>

          <section className="app-section">
            <h2>2026 Q1 Goals</h2>
            <GoalList
              goals={quarterlyGoals}
              onDelete={handleDeleteQuarterlyGoal}
              onEdit={handleEditQuarterlyGoal}
              onReorder={handleReorderQuarterlyGoals}
              onAdd={handleAddQuarterlyGoal}
            />
          </section>

          <section className="app-section">
            <h2>2026 Goals</h2>
            <GoalList
              goals={yearlyGoals}
              onDelete={handleDeleteYearlyGoal}
              onEdit={handleEditYearlyGoal}
              onReorder={handleReorderYearlyGoals}
              onAdd={handleAddYearlyGoal}
            />
          </section>

          <section className="app-section collapsible-section">
            <h2
              className="collapsible-header"
              onClick={() => setLifeGoalsCollapsed(!lifeGoalsCollapsed)}
            >
              <span className={`collapse-arrow ${lifeGoalsCollapsed ? '' : 'open'}`}>▶</span>
              Life Goals
            </h2>
            {!lifeGoalsCollapsed && (
              <GoalList
                goals={lifeGoals}
                onDelete={handleDeleteLifeGoal}
                onEdit={handleEditLifeGoal}
                onReorder={handleReorderLifeGoals}
                onAdd={handleAddLifeGoal}
              />
            )}
          </section>

          <section className="app-section">
            <h2>Close Friends</h2>
            <FriendsCard
              friends={friends}
              onViewAll={() => setCurrentPage('friends')}
            />
          </section>

          <section className="app-section">
            <h2>Cookie Jar</h2>
            <CookieJar
              content={cookieJarContent}
              onSave={handleSaveCookieJar}
            />
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
