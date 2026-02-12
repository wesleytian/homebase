import { useState, useRef } from 'react';
import { RoutineWithProgress } from './types';
import { RoutineCard, DropPosition } from './RoutineCard';
import { useTouchDrag } from './useTouchDrag';

interface Props {
  routines: RoutineWithProgress[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name?: string; metadata?: string; frequencyPerWeek?: number }) => void;
  onReorder: (routines: RoutineWithProgress[]) => void;
  onAdd: (name: string, frequency: number, metadata: string) => void;
  confettiEnabled?: boolean;
  // Week navigation
  weekOffset?: number;
  weekDateRange?: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  canGoPrev?: boolean;
}

interface DragState {
  draggedId: string | null;
  targetId: string | null;
  position: DropPosition;
}

export function RoutineList({ routines, onIncrement, onDecrement, onDelete, onEdit, onReorder, onAdd, confettiEnabled = false, weekOffset = 0, weekDateRange, onPrevWeek, onNextWeek, canGoPrev = true }: Props) {
  const [addingTo, setAddingTo] = useState<'daily' | 'weekly-weekday' | 'weekly-weekend' | null>(null);
  const [newName, setNewName] = useState('');
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    targetId: null,
    position: null,
  });
  const draggedIdRef = useRef<string | null>(null);

  // Touch drag for mobile
  const touchDrag = useTouchDrag({
    items: routines,
    getItemId: (r) => r.id,
    targetSelector: '.routine-card-compact',
    onReorder: onReorder,
    onDragStateChange: (draggedId, targetId, position) => {
      if (draggedId) {
        setDragState({ draggedId, targetId, position });
      } else {
        setDragState({ draggedId: null, targetId: null, position: null });
      }
    },
  });

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !addingTo) return;
    const freq = addingTo === 'daily' ? 7 : addingTo === 'weekly-weekday' ? 5 : 2;
    onAdd(newName.trim(), freq, '');
    setNewName('');
    setAddingTo(null);
  };

  // Split routines into daily (5-7x/week for weekdays or everyday) and weekly (less than 5x)
  const dailyRoutines = routines.filter(r => r.frequencyPerWeek >= 5);
  const weeklyRoutines = routines.filter(r => r.frequencyPerWeek < 5);

  const renderRoutineCard = (routine: RoutineWithProgress) => (
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
      confettiEnabled={confettiEnabled}
      isPastWeek={weekOffset < 0}
      onTouchStart={touchDrag.handleTouchStart}
      onTouchMove={touchDrag.handleTouchMove}
      onTouchEnd={touchDrag.handleTouchEnd}
    />
  );

  return (
    <div className="routine-list" onDragEnd={handleDragEnd}>
      {/* Week navigation */}
      {onPrevWeek && onNextWeek && (
        <div className="routine-week-nav">
          <button
            className="routine-week-arrow"
            onClick={onPrevWeek}
            disabled={!canGoPrev}
            aria-label="Previous week"
          >
            &lt;
          </button>
          <span className="routine-week-label">{weekDateRange || 'This Week'}</span>
          <button
            className="routine-week-arrow"
            onClick={onNextWeek}
            disabled={weekOffset === 0}
            aria-label="Next week"
          >
            &gt;
          </button>
        </div>
      )}

      <div className="routine-section-header">
        <span className="routine-section-label">Daily</span>
        <button className="routine-add-inline" onClick={() => { setAddingTo('daily'); setNewName(''); }}>+</button>
      </div>
      {addingTo === 'daily' && (
        <form className="routine-add-inline-form" onSubmit={handleAdd}>
          <input type="text" placeholder="Routine name..." value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus onBlur={() => !newName && setAddingTo(null)} />
        </form>
      )}
      {dailyRoutines.map(renderRoutineCard)}

      {(dailyRoutines.length > 0 || weeklyRoutines.length > 0) && (
        <div className="routine-section-divider" />
      )}

      <div className="routine-section-header">
        <span className="routine-section-label">Weekly</span>
        <div className="routine-add-inline-group">
          <button className="routine-add-inline" onClick={() => { setAddingTo('weekly-weekday'); setNewName(''); }} data-tooltip="Add weekday routine (5x/week)">+ weekday</button>
          <button className="routine-add-inline" onClick={() => { setAddingTo('weekly-weekend'); setNewName(''); }} data-tooltip="Add weekend routine (2x/week)">+ weekend</button>
        </div>
      </div>
      {(addingTo === 'weekly-weekday' || addingTo === 'weekly-weekend') && (
        <form className="routine-add-inline-form" onSubmit={handleAdd}>
          <input type="text" placeholder={`${addingTo === 'weekly-weekday' ? 'Weekday' : 'Weekend'} routine name...`} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus onBlur={() => !newName && setAddingTo(null)} />
        </form>
      )}
      {weeklyRoutines.map(renderRoutineCard)}
    </div>
  );
}
