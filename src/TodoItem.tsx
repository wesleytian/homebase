import { useState, useRef, useEffect } from 'react';
import { Todo } from './types';

export type DropPosition = 'above' | 'below' | null;

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onIndent: (id: string, indent: number) => void;
  canIndent: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPosition: DropPosition;
  isDragging: boolean;
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onIndent,
  canIndent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPosition,
  isDragging,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const indent = todo.indent ?? 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed);
    } else {
      setEditText(todo.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: decrease indent
        if (indent > 0) {
          onIndent(todo.id, indent - 1);
        }
      } else {
        // Tab: increase indent (only if canIndent)
        if (canIndent && indent < 3) {
          onIndent(todo.id, indent + 1);
        }
      }
    }
  };

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''} ${isEditing ? 'editing' : ''}`}
      style={{ marginLeft: `${indent * 24}px` }}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragOver={(e) => onDragOver(e, todo.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, todo.id)}
    >
      <span className="drag-handle">⋮⋮</span>
      <label className="todo-checkbox">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />
        <span className="checkmark"></span>
      </label>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="todo-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="todo-text" onClick={() => setIsEditing(true)}>
          {todo.text}
        </span>
      )}
      <button className="todo-delete" onClick={() => onDelete(todo.id)}>×</button>
    </div>
  );
}
