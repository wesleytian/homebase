import { useState, useRef, useEffect } from 'react';
import { RoutineWithProgress } from './types';

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
}: Props) {
  const [editingField, setEditingField] = useState<'name' | 'metadata' | 'frequency' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isComplete = routine.completedThisWeek >= routine.frequencyPerWeek;

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

  return (
    <div
      className={`routine-card-compact ${isComplete ? 'complete' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
      draggable={!editingField}
      onDragStart={(e) => onDragStart(e, routine.id)}
      onDragOver={(e) => onDragOver(e, routine.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, routine.id)}
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
          className="compact-btn"
          onClick={() => onDecrement(routine.id)}
          disabled={routine.completedThisWeek === 0}
        >
          −
        </button>
        <button className="compact-btn primary" onClick={() => onIncrement(routine.id)}>
          +
        </button>
        <button className="compact-btn delete" onClick={() => onDelete(routine.id)}>
          ×
        </button>
      </div>
    </div>
  );
}
