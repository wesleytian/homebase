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
  onCreateBelow?: (id: string, indent: number) => void;
  onDeleteAndFocusAbove?: (id: string) => void;
  canIndent: boolean;
  confettiEnabled?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPosition: DropPosition;
  dropIndent: number | null;
  isDragging: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, e: React.MouseEvent) => void;
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
  onCreateBelow,
  onDeleteAndFocusAbove,
  canIndent,
  confettiEnabled = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPosition,
  dropIndent,
  isDragging,
  isSelected = false,
  onSelect,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: Props) {
  const [localText, setLocalText] = useState(todo.text);
  const [showConfetti, setShowConfetti] = useState<{ x: number; y: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const checkboxRef = useRef<HTMLLabelElement>(null);
  const indent = todo.indent ?? 0;

  // Sync local text with todo.text when it changes externally
  useEffect(() => {
    if (!isFocused) {
      setLocalText(todo.text);
    }
  }, [todo.text, isFocused]);

  // Auto-resize textarea
  const autoResize = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    autoResize();
  }, [localText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = localText.trim();
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed);
    } else {
      setLocalText(todo.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save current text first
      const trimmed = localText.trim();
      if (trimmed && trimmed !== todo.text) {
        onEdit(todo.id, trimmed);
      }
      // Create new todo below with same indent level
      if (onCreateBelow) {
        onCreateBelow(todo.id, indent);
      }
    } else if (e.key === 'Backspace' && localText === '' && onDeleteAndFocusAbove) {
      e.preventDefault();
      onDeleteAndFocusAbove(todo.id);
    } else if (e.key === 'Escape') {
      setLocalText(todo.text);
      inputRef.current?.blur();
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
    // Only show confetti when completing (not uncompleting) and if enabled
    if (confettiEnabled && !todo.completed && checkboxRef.current) {
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
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''} ${isSelected ? 'selected' : ''}`}
      style={{
        marginLeft: `${indent * 24}px`,
        '--drop-indent-offset': dropIndent !== null ? `${(dropIndent - indent) * 24}px` : '0px'
      } as React.CSSProperties}
      data-drag-id={todo.id}
      draggable={!isFocused}
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragOver={(e) => onDragOver(e, todo.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, todo.id)}
      onClick={(e) => {
        // Only handle selection if shift/cmd/ctrl is held, to avoid interfering with normal clicks
        if ((e.shiftKey || e.metaKey || e.ctrlKey) && onSelect) {
          e.preventDefault();
          onSelect(todo.id, e);
        }
      }}
      onTouchStart={onTouchStart ? (e) => onTouchStart(e, todo.id) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span
        className="drag-handle"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(todo.id, e);
        }}
      >⋮⋮</span>
      <label ref={checkboxRef} className={`todo-checkbox ${celebrating ? 'celebrating' : ''}`}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
        />
        <span className="checkmark"></span>
      </label>
      <textarea
        ref={inputRef}
        className={`todo-text-input ${todo.completed ? 'completed' : ''}`}
        value={localText}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button className="todo-delete" onClick={() => onDelete(todo.id)}>×</button>
    </div>
    </>
  );
}
