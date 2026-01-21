import { useState, useRef, useEffect } from 'react';
import { Todo } from './types';
import { Confetti } from './Confetti';

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
  onTouchStart?: (e: React.TouchEvent, id: string) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
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
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showConfetti, setShowConfetti] = useState<{ x: number; y: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkboxRef = useRef<HTMLLabelElement>(null);
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

  const handleToggle = () => {
    // Only show confetti when completing (not uncompleting)
    if (!todo.completed && checkboxRef.current) {
      const rect = checkboxRef.current.getBoundingClientRect();
      setShowConfetti({ x: rect.left + rect.width / 2, y: rect.top });
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 300);
    }
    onToggle(todo.id);
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          x={showConfetti.x}
          y={showConfetti.y}
          onComplete={() => setShowConfetti(null)}
        />
      )}
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''} ${isEditing ? 'editing' : ''}`}
      style={{ marginLeft: `${indent * 24}px` }}
      data-drag-id={todo.id}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragOver={(e) => onDragOver(e, todo.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, todo.id)}
      onTouchStart={onTouchStart ? (e) => onTouchStart(e, todo.id) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span className="drag-handle">⋮⋮</span>
      <label ref={checkboxRef} className={`todo-checkbox ${celebrating ? 'celebrating' : ''}`}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
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
    </>
  );
}
