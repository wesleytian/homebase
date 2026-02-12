import { useState, useRef, useEffect } from 'react';
import { RoutineWithProgress } from './types';
import { Confetti } from './Confetti';

export type DropPosition = 'above' | 'below' | null;

interface Props {
  routine: RoutineWithProgress;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name?: string; metadata?: string; frequencyPerWeek?: number }) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPosition: DropPosition;
  confettiEnabled?: boolean;
  isPastWeek?: boolean;
  onTouchStart?: (e: React.TouchEvent, id: string) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
}

export function RoutineCard({
  routine,
  onIncrement,
  onDecrement,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPosition,
  confettiEnabled = false,
  isPastWeek = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: Props) {
  const [editingField, setEditingField] = useState<'name' | 'metadata' | 'frequency' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showConfetti, setShowConfetti] = useState<{ x: number; y: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkBtnRef = useRef<HTMLButtonElement>(null);

  const isComplete = routine.completedThisWeek >= routine.frequencyPerWeek;
  const completedToday = routine.completedToday;

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: 'name' | 'metadata' | 'frequency') => {
    setEditingField(field);
    if (field === 'name') setEditValue(routine.name);
    else if (field === 'metadata') setEditValue(routine.metadata);
    else setEditValue(String(routine.frequencyPerWeek));
  };

  const saveEdit = () => {
    if (!editingField) return;

    const trimmed = editValue.trim();
    if (editingField === 'name' && trimmed && trimmed !== routine.name) {
      onEdit(routine.id, { name: trimmed });
    } else if (editingField === 'metadata' && trimmed !== routine.metadata) {
      onEdit(routine.id, { metadata: trimmed });
    } else if (editingField === 'frequency') {
      const num = parseInt(trimmed);
      if (!isNaN(num) && num >= 1 && num <= 7 && num !== routine.frequencyPerWeek) {
        onEdit(routine.id, { frequencyPerWeek: num });
      }
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    else if (e.key === 'Escape') setEditingField(null);
  };

  const handleCheck = (e: React.MouseEvent) => {
    // For past weeks: simple toggle - increment if not complete, decrement if complete
    if (isPastWeek) {
      if (isComplete) {
        onDecrement(routine.id);
      } else {
        onIncrement(routine.id);
      }
      return;
    }

    // Shift+click to add extra completion (for backfilling missed days)
    if (e.shiftKey) {
      if (confettiEnabled && checkBtnRef.current) {
        const rect = checkBtnRef.current.getBoundingClientRect();
        setShowConfetti({ x: rect.left + rect.width / 2, y: rect.top });
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 300);
      }
      onIncrement(routine.id);
      return;
    }

    if (completedToday) {
      onDecrement(routine.id);
    } else {
      // Show confetti when checking off (not unchecking) and if enabled
      if (confettiEnabled && checkBtnRef.current) {
        const rect = checkBtnRef.current.getBoundingClientRect();
        setShowConfetti({ x: rect.left + rect.width / 2, y: rect.top });
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 300);
      }
      onIncrement(routine.id);
    }
  };

  return (
    <>
    <div
      className={`routine-card-compact ${isComplete ? 'complete' : ''} ${completedToday ? 'completed-today' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
      data-drag-id={routine.id}
      draggable={!editingField}
      onDragStart={(e) => onDragStart(e, routine.id)}
      onDragOver={(e) => onDragOver(e, routine.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, routine.id)}
      onTouchStart={onTouchStart ? (e) => onTouchStart(e, routine.id) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span className="routine-drag-handle">⋮⋮</span>
      <div className="routine-main">
        {editingField === 'name' ? (
          <input
            ref={inputRef}
            type="text"
            className="routine-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="routine-name" onClick={() => startEditing('name')}>
            {routine.name}
          </span>
        )}
        {editingField === 'metadata' ? (
          <input
            ref={inputRef}
            type="text"
            className="routine-edit-input small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            placeholder="Add notes..."
          />
        ) : (
          <span className="routine-meta" onClick={() => startEditing('metadata')}>
            {routine.metadata || 'Add notes...'}
          </span>
        )}
      </div>
      <div className="routine-right">
        {routine.currentStreak > 0 && (
          <span className={`routine-streak ${routine.streakAtRisk ? 'at-risk' : ''}`} data-tooltip={`${routine.currentStreak} week streak${routine.streakAtRisk ? ' - meet your target this week to keep it!' : ''}`}>
            🔥 {routine.currentStreak}
          </span>
        )}
        {editingField === 'frequency' ? (
          <input
            ref={inputRef}
            type="number"
            min="1"
            max="7"
            className="routine-edit-input frequency"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="routine-progress-dots" onClick={() => startEditing('frequency')}>
            {Array.from({ length: routine.frequencyPerWeek }, (_, i) => (
              <span
                key={i}
                className={`progress-dot ${i < routine.completedThisWeek ? 'filled' : 'empty'}`}
              />
            ))}
          </div>
        )}
        <button
          ref={checkBtnRef}
          className={`routine-check-btn ${completedToday ? 'checked' : ''} ${celebrating ? 'celebrating' : ''}`}
          onClick={handleCheck}
          data-tooltip={completedToday ? 'Undo (Shift+click to add extra)' : 'Mark done'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button className="compact-btn delete" onClick={() => onDelete(routine.id)}>
          ×
        </button>
      </div>
    </div>
    {showConfetti && (
      <Confetti
        x={showConfetti.x}
        y={showConfetti.y}
        onComplete={() => setShowConfetti(null)}
      />
    )}
    </>
  );
}
