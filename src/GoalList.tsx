import { useState, useRef } from 'react';
import { Goal, GoalSubtask } from './types';
import { GoalCard, DropPosition } from './GoalCard';

interface Props {
  goals: Goal[];
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { title?: string; description?: string; subtasks?: GoalSubtask[] }) => void;
  onReorder: (goals: Goal[]) => void;
  onAdd: (title: string) => void;
}

interface DragState {
  draggedId: string | null;
  targetId: string | null;
  position: DropPosition;
}

export function GoalList({ goals, onDelete, onEdit, onReorder, onAdd }: Props) {
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    targetId: null,
    position: null,
  });
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const draggedIdRef = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    setDragState((s) => ({ ...s, draggedId: id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedIdRef.current || draggedIdRef.current === targetId) {
      setDragState((s) => ({ ...s, targetId: null, position: null }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    setDragState((s) => ({ ...s, targetId, position }));
  };

  const handleDragLeave = () => {
    setDragState((s) => ({ ...s, targetId: null, position: null }));
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedIdRef.current || draggedIdRef.current === targetId) return;

    const draggedIndex = goals.findIndex((g) => g.id === draggedIdRef.current);
    const targetIndex = goals.findIndex((g) => g.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newGoals = [...goals];
    const [dragged] = newGoals.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (dragState.position === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newGoals.splice(insertIndex, 0, dragged);
    onReorder(newGoals);

    setDragState({ draggedId: null, targetId: null, position: null });
    draggedIdRef.current = null;
  };

  const handleDragEnd = () => {
    setDragState({ draggedId: null, targetId: null, position: null });
    draggedIdRef.current = null;
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGoalTitle.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewGoalTitle('');
    }
  };

  return (
    <div className="goal-list" onDragEnd={handleDragEnd}>
      <form className="goal-add-form" onSubmit={handleAddGoal}>
        <input
          type="text"
          placeholder="Add a long-term goal..."
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
        />
      </form>
      {goals.length === 0 ? (
        <div className="empty-state">
          <p>No goals yet. Add your first long-term goal above.</p>
        </div>
      ) : (
        goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onDelete={onDelete}
            onEdit={onEdit}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            dropPosition={dragState.targetId === goal.id ? dragState.position : null}
          />
        ))
      )}
    </div>
  );
}
