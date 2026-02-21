import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Todo, ToggleSection } from './types';
import { TodoItem, DropPosition } from './TodoItem';

// Check if section name matches date format like "Mon, 1/19" or "Tues, 2/20"
const DATE_PATTERN = /^(Mon|Tues|Wed|Thurs|Fri|Sat|Sun),?\s*\d{1,2}\/\d{1,2}$/i;

function isDateSection(name: string): boolean {
  return DATE_PATTERN.test(name);
}

function getTodayFormatted(): string {
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const now = new Date();
  const dayName = days[now.getDay()];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  return `${dayName}, ${month}/${date}`;
}

// Check if a date section is from a past day (before today)
function isPastDateSection(name: string): boolean {
  if (!isDateSection(name)) return false;

  const match = name.match(/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;

  const month = parseInt(match[1]) - 1; // 0-indexed
  const day = parseInt(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date for the section (assume current year, adjust if needed)
  let sectionDate = new Date(currentYear, month, day);

  // If section date is more than 6 months in the future, it's probably from last year
  if (sectionDate.getTime() > now.getTime() + 180 * 24 * 60 * 60 * 1000) {
    sectionDate = new Date(currentYear - 1, month, day);
  }

  // Compare dates (ignore time)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sectionDayStart = new Date(sectionDate.getFullYear(), sectionDate.getMonth(), sectionDate.getDate());

  return sectionDayStart.getTime() < todayStart.getTime();
}

type DragType = 'todo' | 'section' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  targetId: string | null;
  targetType: DragType;
  position: DropPosition;
  targetIndent: number;
}

interface Props {
  section: ToggleSection;
  todos: Todo[];
  allSections: ToggleSection[];
  allTodos: Todo[];
  confettiEnabled?: boolean;
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onAddSection: (name: string, parentId?: string | null) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (id: string, text: string, isBullet?: boolean) => void;
  onIndentTodo: (id: string, indent: number) => void;
  onAddTodo: (text: string, sectionId: string) => void;
  onAddTodoAfter: (text: string, afterTodoId: string, indent?: number) => void;
  onAddTodoBefore: (text: string, beforeTodoId: string, indent?: number) => void;
  onTodoDragStart: (e: React.DragEvent, id: string) => void;
  onTodoDragOver: (e: React.DragEvent, id: string) => void;
  onTodoDragLeave: () => void;
  onTodoDrop: (e: React.DragEvent, id: string) => void;
  onSectionDragStart: (e: React.DragEvent, id: string) => void;
  onSectionDragOver: (e: React.DragEvent, id: string) => void;
  onSectionDrop: (e: React.DragEvent, id: string) => void;
  onDropOnSection: (e: React.DragEvent, sectionId: string) => void;
  onDropAtEndOfSection: (e: React.DragEvent, sectionId: string) => void;
  onMoveToToday: (sectionId: string) => void;
  dragState: DragState;
  selectedIds?: Set<string>;
  onTodoSelect?: (id: string, e: React.MouseEvent) => void;
  onTodoFocusChange?: (id: string | null) => void;
  onTodoTouchStart?: (e: React.TouchEvent, id: string) => void;
  onTodoTouchMove?: (e: React.TouchEvent) => void;
  onTodoTouchEnd?: () => void;
  dragSelectedCount?: number;
  onConvertTodoToToggle?: (todoId: string) => void;
  onToggleCollapse?: (todoId: string) => void;
  onClearSelection?: () => void;
  depth?: number;
}

export function TodoSection({
  section,
  todos,
  allSections,
  allTodos,
  confettiEnabled = false,
  onToggleSection,
  onDeleteSection,
  onEditSection,
  onAddSection,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onIndentTodo,
  onAddTodo,
  onAddTodoAfter,
  onAddTodoBefore,
  onTodoDragStart,
  onTodoDragOver,
  onTodoDragLeave,
  onTodoDrop,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDrop,
  onDropOnSection,
  onDropAtEndOfSection,
  onMoveToToday,
  dragState,
  selectedIds,
  onTodoSelect,
  onTodoFocusChange,
  onTodoTouchStart,
  onTodoTouchMove,
  onTodoTouchEnd,
  dragSelectedCount = 1,
  onConvertTodoToToggle,
  onToggleCollapse,
  onClearSelection,
  depth = 0,
}: Props) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const [newTodo, setNewTodo] = useState('');
  const [todoHovering, setTodoHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [countFlash, setCountFlash] = useState(false);
  const checkableTodos = useMemo(() => todos.filter(t => !t.isBullet), [todos]);

  // Filter out children of collapsed toggles
  const visibleTodos = useMemo(() => {
    const result: typeof todos = [];
    let collapsedToggleIndent: number | null = null;

    for (const todo of todos) {
      const todoIndent = todo.indent ?? 0;

      // If we're inside a collapsed toggle and this todo is more indented, skip it
      if (collapsedToggleIndent !== null && todoIndent > collapsedToggleIndent) {
        continue;
      }

      // If we hit same or lower indent, we've exited the collapsed toggle's children
      if (collapsedToggleIndent !== null && todoIndent <= collapsedToggleIndent) {
        collapsedToggleIndent = null;
      }

      result.push(todo);

      // If this is a collapsed toggle, start skipping children
      if (todo.isToggle && todo.toggleCollapsed) {
        collapsedToggleIndent = todoIndent;
      }
    }

    return result;
  }, [todos]);

  // Get child sections
  const childSections = useMemo(() =>
    allSections.filter(s => s.parentId === section.id).sort((a, b) => a.order - b.order),
    [allSections, section.id]
  );
  const completedCount = useMemo(() => checkableTodos.filter(t => t.completed).length, [checkableTodos]);
  const prevCompletedRef = useRef(completedCount);

  useEffect(() => {
    if (completedCount > prevCompletedRef.current) {
      setCountFlash(true);
      const t = setTimeout(() => setCountFlash(false), 600);
      prevCompletedRef.current = completedCount;
      return () => clearTimeout(t);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    if (showDeleteConfirm) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          onDeleteSection(section.id);
          setShowDeleteConfirm(false);
        } else if (e.key === 'Escape') {
          setShowDeleteConfirm(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showDeleteConfirm, section.id, onDeleteSection]);

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue.trim() !== section.name) {
      onEditSection(section.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    onAddTodo(newTodo.trim(), section.id);
    setNewTodo('');
  };

  const focusTodoAtIndex = useCallback((index: number, cursorPos?: number) => {
    const todo = visibleTodos[index];
    if (!todo) return;
    setTimeout(() => {
      const el = document.querySelector(`[data-drag-id="${todo.id}"] .todo-text-input, [data-drag-id="${todo.id}"] .todo-editable`) as HTMLElement;
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement) {
          const pos = cursorPos !== undefined ? Math.min(cursorPos, el.value.length) : el.value.length;
          el.setSelectionRange(pos, pos);
        } else {
          const sel = window.getSelection();
          const textNode = el.firstChild;
          if (sel && textNode) {
            const len = textNode.textContent?.length || 0;
            const pos = cursorPos !== undefined ? Math.min(cursorPos, len) : len;
            sel.collapse(textNode, pos);
          }
        }
      }
    }, 0);
  }, [visibleTodos]);

  const isSectionDropTarget = dragState.targetId === section.id && dragState.targetType === 'section';
  const isSectionDragging = dragState.draggedId === section.id && dragState.type === 'section';
  const isTodoDropTarget = todoHovering && dragState.type === 'todo';
  const isToday = section.name === getTodayFormatted();

  return (
    <div
      className={`todo-section ${isSectionDropTarget ? `drop-${dragState.position}` : ''} ${isToday ? 'today-section' : ''}`}
      onDragOver={(e) => onSectionDragOver(e, section.id)}
      onDrop={(e) => onSectionDrop(e, section.id)}
    >
      <div
        className={`section-header ${isSectionDragging ? 'dragging' : ''} ${isTodoDropTarget ? 'todo-drop-target' : ''}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          wasDraggingRef.current = true;
          onSectionDragStart(e, section.id);
        }}
        onDragEnd={() => {
          // Reset after a short delay to allow click event to be blocked first
          setTimeout(() => {
            wasDraggingRef.current = false;
          }, 100);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragState.type === 'todo') {
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            setTodoHovering(true);
          }
        }}
        onDragLeave={() => {
          setTodoHovering(false);
        }}
        onDrop={(e) => {
          e.stopPropagation();
          setTodoHovering(false);
          wasDraggingRef.current = true; // Prevent click from firing toggle
          if (dragState.type === 'todo') {
            onDropOnSection(e, section.id);
          } else {
            onSectionDrop(e, section.id);
          }
        }}
        onClick={() => {
          if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
          }
          onToggleSection(section.id);
        }}
      >
        <span className="section-drag-handle">⋮⋮</span>
        <span className={`section-arrow ${section.collapsed ? '' : 'open'}`}>▶</span>
        {isEditing ? (
          <input
            className="section-name-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSubmit();
              if (e.key === 'Escape') {
                setEditValue(section.name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="section-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditValue(section.name);
              setIsEditing(true);
            }}
          >
            {section.name}
          </span>
        )}
        <span className={'section-count' + (countFlash ? ' count-flash' : '')}>{completedCount}/{checkableTodos.length}</span>
        {isPastDateSection(section.name) && todos.some(t => !t.completed) && (
          <button
            className="section-move-today"
            data-tooltip="Move unfinished to today"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToToday(section.id);
            }}
          >
            → today
          </button>
        )}
        <button
          className="section-delete"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
        >
          ×
        </button>
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()} ref={deleteConfirmRef}>
              <p>Delete "{section.name}"?</p>
              <p className="delete-confirm-hint">Press Enter to confirm or Escape to cancel</p>
              <div className="delete-confirm-buttons">
                <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="delete-confirm-yes" onClick={() => {
                  onDeleteSection(section.id);
                  setShowDeleteConfirm(false);
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {!section.collapsed && (
        <div className="section-content">
          {visibleTodos.map((todo, index) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              onDelete={onDeleteTodo}
              onEdit={onEditTodo}
              onIndent={onIndentTodo}
              onCreateBelow={(id, indent) => onAddTodoAfter('', id, indent)}
              onCreateAbove={(id, indent) => onAddTodoBefore('', id, indent)}
              onFocusPrev={index > 0 ? (pos: number) => focusTodoAtIndex(index - 1, pos) : undefined}
              onFocusNext={index < visibleTodos.length - 1 ? (pos: number) => focusTodoAtIndex(index + 1, pos) : () => addInputRef.current?.focus()}
              onDeleteAndFocusAbove={index > 0 ? (id) => {
                const prevTodo = visibleTodos[index - 1];
                onDeleteTodo(id);
                // Focus the previous todo's input after a short delay
                setTimeout(() => {
                  const prevInput = document.querySelector(`[data-drag-id="${prevTodo.id}"] .todo-text-input`) as HTMLInputElement;
                  if (prevInput) {
                    prevInput.focus();
                    prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
                  }
                }, 0);
              } : undefined}
              canIndent={index > 0}
              confettiEnabled={confettiEnabled}
              onDragStart={onTodoDragStart}
              onDragOver={onTodoDragOver}
              onDragLeave={onTodoDragLeave}
              onDrop={onTodoDrop}
              dropPosition={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.position : null}
              dropIndent={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.targetIndent : null}
              isDragging={dragState.draggedId === todo.id || (selectedIds?.has(todo.id) === true && dragState.type === 'todo' && dragState.draggedId !== null)}
              isSelected={selectedIds?.has(todo.id) || false}
              onSelect={onTodoSelect}
              onFocusChange={onTodoFocusChange}
              onTouchStart={onTodoTouchStart}
              onTouchMove={onTodoTouchMove}
              onTouchEnd={onTodoTouchEnd}
              dragCount={dragState.draggedId === todo.id ? dragSelectedCount : 1}
              onConvertToToggle={onConvertTodoToToggle}
              onToggleCollapse={onToggleCollapse}
              onClearSelection={onClearSelection}
            />
          ))}
          <div
            className={`section-drop-zone ${todoHovering ? 'active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragState.type === 'todo') {
                e.dataTransfer.dropEffect = 'move';
                setTodoHovering(true);
              }
            }}
            onDragLeave={() => setTodoHovering(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTodoHovering(false);
              if (dragState.type === 'todo') {
                onDropAtEndOfSection(e, section.id);
              }
            }}
          />
          <form className="section-add-form" onSubmit={handleAdd}>
              <input
                ref={addInputRef}
                type="text"
                placeholder="Add todo..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' && visibleTodos.length > 0) {
                    e.preventDefault();
                    const pos = (e.target as HTMLInputElement).selectionStart || 0;
                    focusTodoAtIndex(visibleTodos.length - 1, pos);
                  }
                }}
              />
          </form>

          {/* Child sections (nested toggles) */}
          {childSections.map((childSection) => (
            <TodoSection
              key={childSection.id}
              section={childSection}
              todos={allTodos.filter((t) => t.sectionId === childSection.id)}
              allSections={allSections}
              allTodos={allTodos}
              confettiEnabled={confettiEnabled}
              onToggleSection={onToggleSection}
              onDeleteSection={onDeleteSection}
              onEditSection={onEditSection}
              onAddSection={onAddSection}
              onToggleTodo={onToggleTodo}
              onDeleteTodo={onDeleteTodo}
              onEditTodo={onEditTodo}
              onIndentTodo={onIndentTodo}
              onAddTodo={onAddTodo}
              onAddTodoAfter={onAddTodoAfter}
              onAddTodoBefore={onAddTodoBefore}
              onTodoDragStart={onTodoDragStart}
              onTodoDragOver={onTodoDragOver}
              onTodoDragLeave={onTodoDragLeave}
              onTodoDrop={onTodoDrop}
              onSectionDragStart={onSectionDragStart}
              onSectionDragOver={onSectionDragOver}
              onSectionDrop={onSectionDrop}
              onDropOnSection={onDropOnSection}
              onDropAtEndOfSection={onDropAtEndOfSection}
              onMoveToToday={onMoveToToday}
              dragState={dragState}
              selectedIds={selectedIds}
              onTodoSelect={onTodoSelect}
              onTodoFocusChange={onTodoFocusChange}
              onTodoTouchStart={onTodoTouchStart}
              onTodoTouchMove={onTodoTouchMove}
              onTodoTouchEnd={onTodoTouchEnd}
              dragSelectedCount={dragSelectedCount}
              onConvertTodoToToggle={onConvertTodoToToggle}
              onToggleCollapse={onToggleCollapse}
              onClearSelection={onClearSelection}
              depth={depth + 1}
            />
          ))}

        </div>
      )}
    </div>
  );
}
