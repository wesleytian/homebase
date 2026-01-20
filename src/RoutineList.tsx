import { useState, useRef } from 'react';
import { RoutineWithProgress } from './types';
import { RoutineCard, DropPosition } from './RoutineCard';

interface Props {
  routines: RoutineWithProgress[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name?: string; metadata?: string; frequencyPerWeek?: number }) => void;
  onReorder: (routines: RoutineWithProgress[]) => void;
}

interface DragState {
  draggedId: string | null;
  targetId: string | null;
  position: DropPosition;
}

export function RoutineList({ routines, onIncrement, onDecrement, onDelete, onEdit, onReorder }: Props) {
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    targetId: null,
    position: null,
  });
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

    const draggedIndex = routines.findIndex((r) => r.id === draggedIdRef.current);
    const targetIndex = routines.findIndex((r) => r.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newRoutines = [...routines];
    const [dragged] = newRoutines.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (dragState.position === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newRoutines.splice(insertIndex, 0, dragged);
    onReorder(newRoutines);

    setDragState({ draggedId: null, targetId: null, position: null });
    draggedIdRef.current = null;
  };

  const handleDragEnd = () => {
    setDragState({ draggedId: null, targetId: null, position: null });
    draggedIdRef.current = null;
  };

  if (routines.length === 0) {
    return (
      <div className="empty-state">
        <p>No routines yet. Add your first routine above.</p>
      </div>
    );
  }

  return (
    <div className="routine-list" onDragEnd={handleDragEnd}>
      {routines.map((routine) => (
        <RoutineCard
          key={routine.id}
          routine={routine}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onDelete={onDelete}
          onEdit={onEdit}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dropPosition={dragState.targetId === routine.id ? dragState.position : null}
        />
      ))}
    </div>
  );
}
