import { useState, useRef, useEffect } from 'react';
import { Goal } from './types';

export type DropPosition = 'above' | 'below' | null;

interface Props {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { title?: string; description?: string }) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPosition: DropPosition;
}

export function GoalCard({
  goal,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPosition,
}: Props) {
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField === 'title' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (editingField === 'description' && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: 'title' | 'description') => {
    setEditingField(field);
    if (field === 'title') setEditValue(goal.title);
    else setEditValue(goal.description);
  };

  const saveEdit = () => {
    if (!editingField) return;

    const trimmed = editValue.trim();
    if (editingField === 'title' && trimmed && trimmed !== goal.title) {
      onEdit(goal.id, { title: trimmed });
    } else if (editingField === 'description' && trimmed !== goal.description) {
      onEdit(goal.id, { description: trimmed });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  return (
    <div
      className={`goal-card ${dropPosition ? `drop-${dropPosition}` : ''}`}
      draggable={!editingField}
      onDragStart={(e) => onDragStart(e, goal.id)}
      onDragOver={(e) => onDragOver(e, goal.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, goal.id)}
    >
      <span className="goal-drag-handle">⋮⋮</span>
      <div className="goal-content">
        {editingField === 'title' ? (
          <input
            ref={inputRef}
            type="text"
            className="goal-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="goal-title" onClick={() => startEditing('title')}>
            {goal.title}
          </span>
        )}
        {editingField === 'description' ? (
          <textarea
            ref={textareaRef}
            className="goal-edit-textarea"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            placeholder="Add description..."
            rows={2}
          />
        ) : (
          <span className="goal-description" onClick={() => startEditing('description')}>
            {goal.description || 'Add description...'}
          </span>
        )}
      </div>
      <button className="goal-delete" onClick={() => onDelete(goal.id)}>
        ×
      </button>
    </div>
  );
}
