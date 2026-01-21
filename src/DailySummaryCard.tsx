import { Todo, ToggleSection, RoutineWithProgress } from './types';

interface Props {
  todos: Todo[];
  sections: ToggleSection[];
  routines: RoutineWithProgress[];
}

export function DailySummaryCard({ todos, sections, routines }: Props) {
  // Get today's formatted section name
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const now = new Date();
  const dayName = days[now.getDay()];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const todayFormatted = `${dayName}, ${month}/${date}`;

  // Find today's section
  const todaySection = sections.find((s) => s.name === todayFormatted);

  // Get today's todos (from today's section or unsectioned)
  const todayTodos = todaySection
    ? todos.filter((t) => t.sectionId === todaySection.id)
    : todos.filter((t) => !t.sectionId);

  const incompleteTodos = todayTodos.filter((t) => !t.completed);
  const completedTodos = todayTodos.filter((t) => t.completed);

  // Calculate routine progress based on current day of week
  // Week starts Sunday (0), but we want Monday=1 through Sunday=7
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1-7, Monday = 1
  const weekProgress = dayOfWeek / 7;

  // For each routine, calculate how on-track it is for this day
  // If expected by now = 2, and completed = 2, that's 100%
  // If expected by now = 2, and completed = 1, that's 50%
  // Cap at 100% (being ahead doesn't exceed 100%)
  const totalExpectedByNow = routines.reduce((sum, r) => sum + r.frequencyPerWeek * weekProgress, 0);
  const totalRoutineCompleted = routines.reduce((sum, r) => sum + Math.min(r.completedThisWeek, r.frequencyPerWeek * weekProgress), 0);
  const routineProgressPercent = totalExpectedByNow > 0
    ? Math.round((totalRoutineCompleted / totalExpectedByNow) * 100)
    : 0;

  const behindRoutines = routines.filter((r) => {
    const expectedProgress = r.frequencyPerWeek * weekProgress;
    return r.completedThisWeek < expectedProgress - 0.5; // Give some slack
  });

  // Format date for display
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  };
  const displayDate = now.toLocaleDateString('en-US', dateOptions);

  return (
    <div className="daily-summary-card">
      <div className="daily-summary-header">
        <h2>{displayDate}</h2>
        <div className="daily-summary-stats">
          <span className="stat">
            <span className="stat-value">{incompleteTodos.length}</span>
            <span className="stat-label">tasks left</span>
          </span>
          <span className="stat">
            <span className="stat-value">{completedTodos.length}</span>
            <span className="stat-label">done</span>
          </span>
          <span className="stat">
            <span className="stat-value">{routineProgressPercent}%</span>
            <span className="stat-label">routines</span>
          </span>
        </div>
      </div>

      {incompleteTodos.length > 0 && (
        <div className="daily-summary-priorities">
          <h3>Today's Focus</h3>
          <ul>
            {incompleteTodos.slice(0, 3).map((todo) => (
              <li key={todo.id}>{todo.text}</li>
            ))}
            {incompleteTodos.length > 3 && (
              <li className="more-items">+{incompleteTodos.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {behindRoutines.length > 0 && (
        <div className="daily-summary-routines">
          <h3>Routines to Catch Up</h3>
          <div className="routine-chips">
            {behindRoutines.slice(0, 4).map((r) => (
              <span key={r.id} className="routine-chip">
                {r.name} ({r.completedThisWeek}/{r.frequencyPerWeek})
              </span>
            ))}
          </div>
        </div>
      )}

      {incompleteTodos.length === 0 && behindRoutines.length === 0 && (
        <div className="daily-summary-complete">
          All caught up for today!
        </div>
      )}
    </div>
  );
}
