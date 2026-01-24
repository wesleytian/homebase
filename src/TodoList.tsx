import { useState, useRef, useEffect, useCallback } from 'react';
import { Todo, ToggleSection } from './types';
import { TodoItem, DropPosition } from './TodoItem';
import { TodoSection } from './TodoSection';
import { useTouchDrag } from './useTouchDrag';
import { UndoAction } from './useUndo';

interface Props {
  todos: Todo[];
  sections: ToggleSection[];
  confettiEnabled?: boolean;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (id: string, text: string) => void;
  onIndentTodo: (id: string, indent: number) => void;
  onAddTodo: (text: string, sectionId: string | null) => void;
  onAddTodoAfter: (text: string, afterTodoId: string, indent?: number) => void;
  onMoveTodo: (id: string, newSectionId: string | null) => void;
  onReorderTodos: (todos: Todo[]) => void;
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onAddSection: (name: string) => void;
  onReorderSections: (sections: ToggleSection[]) => void;
  onMoveToToday: (sectionId: string) => void;
  pushUndo: (action: UndoAction) => void;
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

const TODO_LIMIT = 12;

export function TodoList({
  todos,
  sections,
  confettiEnabled = false,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onIndentTodo,
  onAddTodo,
  onAddTodoAfter,
  onMoveTodo,
  onReorderTodos,
  onToggleSection,
  onDeleteSection,
  onEditSection,
  onAddSection,
  onReorderSections,
  onMoveToToday,
  pushUndo,
}: Props) {
  const [newSection, setNewSection] = useState('');
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [unsectionedHover, setUnsectionedHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    draggedId: null,
    targetId: null,
    targetType: null,
    position: null,
    targetIndent: 0,
  });
  const dragRef = useRef<{ type: DragType; id: string; selectedIds?: Set<string> } | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Handle click on todo for selection
  const handleTodoSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedId) {
      // Shift+click: select range
      const lastIndex = todos.findIndex((t) => t.id === lastSelectedId);
      const currentIndex = todos.findIndex((t) => t.id === id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = todos.slice(start, end + 1).map((t) => t.id);
        setSelectedIds(new Set([...selectedIds, ...rangeIds]));
      }
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+click: toggle selection
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
      setLastSelectedId(id);
    } else {
      // Regular click: select only this one
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    }
  }, [todos, selectedIds, lastSelectedId]);

  // Keyboard shortcuts for selected todos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Copy selected todos
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedIds.size > 0) {
        const selectedTodos = todos.filter((t) => selectedIds.has(t.id));
        const text = selectedTodos.map((t) => t.text).join('\n');
        navigator.clipboard.writeText(text);
      }
      // Escape clears selection
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
      // Tab to indent, Shift+Tab to de-indent selected todos
      if (e.key === 'Tab' && selectedIds.size > 0) {
        // Only handle if not focused on an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault();
        const selectedTodos = todos.filter((t) => selectedIds.has(t.id));

        if (e.shiftKey) {
          // De-indent all selected todos
          for (const todo of selectedTodos) {
            const currentIndent = todo.indent ?? 0;
            if (currentIndent > 0) {
              onIndentTodo(todo.id, currentIndent - 1);
            }
          }
        } else {
          // Indent all selected todos (max indent is 3)
          for (const todo of selectedTodos) {
            const currentIndent = todo.indent ?? 0;
            if (currentIndent < 3) {
              onIndentTodo(todo.id, currentIndent + 1);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, todos, onIndentTodo]);

  // Touch drag for todos
  const touchDrag = useTouchDrag({
    items: todos,
    getItemId: (t) => t.id,
    targetSelector: '.todo-item',
    onReorder: onReorderTodos,
    onDragStateChange: (draggedId, targetId, position) => {
      if (draggedId) {
        setDragState((s) => ({ ...s, type: 'todo', draggedId, targetId, targetType: 'todo', position, targetIndent: 0 }));
      } else {
        resetDragState();
      }
    },
  });

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim()) return;
    onAddSection(newSection.trim());
    setNewSection('');
    setShowSectionInput(false);
  };

  // Todo drag handlers
  const handleTodoDragStart = (e: React.DragEvent, id: string) => {
    // If dragging a selected todo, include all selected todos
    // If dragging an unselected todo, just drag that one (and clear selection)
    let draggedIds: Set<string>;
    if (selectedIds.has(id)) {
      draggedIds = selectedIds;
    } else {
      draggedIds = new Set([id]);
      setSelectedIds(new Set([id]));
    }
    dragRef.current = { type: 'todo', id, selectedIds: draggedIds };
    setDragState((s) => ({ ...s, type: 'todo', draggedId: id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTodoDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dragRef.current || dragRef.current.id === targetId) {
      setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null, targetIndent: 0 }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    // Calculate target indent based on horizontal position
    // Get the container's left edge as baseline
    const container = e.currentTarget.closest('.unsectioned-area, .section-content');
    const containerLeft = container?.getBoundingClientRect().left ?? rect.left;
    const relativeX = e.clientX - containerLeft;
    // Each indent level is 24px, calculate target indent (0-3)
    const targetIndent = Math.min(3, Math.max(0, Math.floor(relativeX / 40)));

    setDragState((s) => ({ ...s, targetId, targetType: 'todo', position, targetIndent }));
  };

  const handleTodoDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedIds = dragRef.current.selectedIds || new Set([dragRef.current.id]);

    // Can't drop on one of the dragged items
    if (draggedIds.has(targetId)) {
      resetDragState();
      return;
    }

    const targetTodo = todos.find((t) => t.id === targetId);
    if (!targetTodo) return;

    // Get dragged todos in their current order
    const draggedTodos = todos.filter((t) => draggedIds.has(t.id));
    if (draggedTodos.length === 0) return;

    // Save original state for undo
    const originalTodos = [...todos];
    const originalDraggedTodos = draggedTodos.map((t) => ({ ...t }));

    // Remove dragged todos from the list
    let newTodos = todos.filter((t) => !draggedIds.has(t.id));

    // Find where to insert (target index in the filtered list)
    let targetIndex = newTodos.findIndex((t) => t.id === targetId);
    if (targetIndex === -1) {
      resetDragState();
      return;
    }

    // Adjust insert position based on drop position
    if (dragState.position === 'below') {
      targetIndex += 1;
    }

    // Update section and indent for all dragged todos
    const updatedDraggedTodos = draggedTodos.map((t) => ({
      ...t,
      sectionId: targetTodo.sectionId,
      indent: dragState.targetIndent,
    }));

    // Insert all dragged todos at the target position
    newTodos.splice(targetIndex, 0, ...updatedDraggedTodos);
    onReorderTodos(newTodos);

    // Update indent in DB for all moved todos
    for (const todo of draggedTodos) {
      if (todo.indent !== dragState.targetIndent) {
        onIndentTodo(todo.id, dragState.targetIndent);
      }
      if (todo.sectionId !== targetTodo.sectionId) {
        onMoveTodo(todo.id, targetTodo.sectionId);
      }
    }

    // Push undo action
    const movedCount = draggedTodos.length;
    pushUndo({
      type: 'move-todos',
      description: `Move ${movedCount} todo${movedCount > 1 ? 's' : ''}`,
      undo: () => {
        // Restore original order and properties
        onReorderTodos(originalTodos);
        // Restore original section and indent for each moved todo
        for (const original of originalDraggedTodos) {
          onMoveTodo(original.id, original.sectionId);
          onIndentTodo(original.id, original.indent ?? 0);
        }
      },
    });

    // Clear selection after drop
    setSelectedIds(new Set());
    resetDragState();
  };

  // Section drag handlers
  const handleSectionDragStart = (e: React.DragEvent, id: string) => {
    dragRef.current = { type: 'section', id };
    setDragState((s) => ({ ...s, type: 'section', draggedId: id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dragRef.current || dragRef.current.type !== 'section') return;
    if (dragRef.current.id === targetId) {
      setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    setDragState((s) => ({ ...s, targetId, targetType: 'section', position }));
  };

  const handleSectionDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'section') return;
    if (dragRef.current.id === targetId) return;

    const draggedIndex = sections.findIndex((s) => s.id === dragRef.current!.id);
    const targetIndex = sections.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSections = [...sections];
    const [dragged] = newSections.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (dragState.position === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newSections.splice(insertIndex, 0, dragged);
    onReorderSections(newSections);

    resetDragState();
  };

  // Drop on section header (to move todo into section)
  const handleDropOnSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedIds = dragRef.current.selectedIds || new Set([dragRef.current.id]);
    const draggedTodos = todos.filter((t) => draggedIds.has(t.id));

    // Save original sections for undo
    const originalSections = draggedTodos.map((t) => ({ id: t.id, sectionId: t.sectionId }));
    const todosToMove = draggedTodos.filter((t) => t.sectionId !== sectionId);

    if (todosToMove.length === 0) {
      resetDragState();
      return;
    }

    // Move all selected todos to the section
    for (const todo of todosToMove) {
      onMoveTodo(todo.id, sectionId);
    }

    // Push undo action
    pushUndo({
      type: 'move-todos-to-section',
      description: `Move ${todosToMove.length} todo${todosToMove.length > 1 ? 's' : ''} to section`,
      undo: () => {
        for (const original of originalSections) {
          onMoveTodo(original.id, original.sectionId);
        }
      },
    });

    setSelectedIds(new Set());
    resetDragState();
  };

  // Drop on unsectioned area
  const handleDropOnUnsectioned = (e: React.DragEvent) => {
    e.preventDefault();
    setUnsectionedHover(false);
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedIds = dragRef.current.selectedIds || new Set([dragRef.current.id]);
    const draggedTodos = todos.filter((t) => draggedIds.has(t.id));

    // Save original sections for undo
    const originalSections = draggedTodos.map((t) => ({ id: t.id, sectionId: t.sectionId }));
    const todosToMove = draggedTodos.filter((t) => t.sectionId !== null);

    if (todosToMove.length === 0) {
      resetDragState();
      return;
    }

    // Move all selected todos to unsectioned
    for (const todo of todosToMove) {
      onMoveTodo(todo.id, null);
    }

    // Push undo action
    pushUndo({
      type: 'move-todos-to-unsectioned',
      description: `Move ${todosToMove.length} todo${todosToMove.length > 1 ? 's' : ''} to unsectioned`,
      undo: () => {
        for (const original of originalSections) {
          onMoveTodo(original.id, original.sectionId);
        }
      },
    });

    setSelectedIds(new Set());
    resetDragState();
  };

  const handleDragLeave = () => {
    setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null, targetIndent: 0 }));
  };

  const resetDragState = () => {
    setDragState({ type: null, draggedId: null, targetId: null, targetType: null, position: null, targetIndent: 0 });
    setUnsectionedHover(false);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  // Check if dragging a todo from a section
  const isDraggingFromSection = dragState.type === 'todo' &&
    todos.find((t) => t.id === dragState.draggedId)?.sectionId !== null;

  const unsectionedTodos = todos.filter((t) => t.sectionId === null);
  const totalTodos = todos.length;
  const needsExpansion = totalTodos > TODO_LIMIT;

  return (
    <div className={`todo-list ${expanded ? 'expanded' : ''} ${needsExpansion && !expanded ? 'collapsed' : ''}`} onDragEnd={handleDragEnd}>
      {showSectionInput ? (
        <form className="section-add-form" onSubmit={handleAddSection}>
          <input
            type="text"
            placeholder="Section name..."
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            autoFocus
            onBlur={() => !newSection && setShowSectionInput(false)}
          />
        </form>
      ) : (
        <button className="add-section-btn" onClick={() => setShowSectionInput(true)}>
          + Add Section
        </button>
      )}

      <div
        className={`unsectioned-area ${unsectionedHover && isDraggingFromSection ? 'drop-target' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (isDraggingFromSection) {
            setUnsectionedHover(true);
          }
        }}
        onDragLeave={() => setUnsectionedHover(false)}
        onDrop={handleDropOnUnsectioned}
      >
        {unsectionedTodos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggleTodo}
            onDelete={onDeleteTodo}
            onEdit={onEditTodo}
            onIndent={onIndentTodo}
            onCreateBelow={(id, indent) => onAddTodoAfter('', id, indent)}
            onDeleteAndFocusAbove={index > 0 ? (id) => {
              const prevTodo = unsectionedTodos[index - 1];
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
            onDragStart={handleTodoDragStart}
            onDragOver={handleTodoDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleTodoDrop}
            dropPosition={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.position : null}
            dropIndent={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.targetIndent : null}
            isDragging={dragState.draggedId === todo.id || (dragRef.current?.selectedIds?.has(todo.id) === true && dragState.type === 'todo')}
            isSelected={selectedIds.has(todo.id)}
            onSelect={handleTodoSelect}
            onTouchStart={touchDrag.handleTouchStart}
            onTouchMove={touchDrag.handleTouchMove}
            onTouchEnd={touchDrag.handleTouchEnd}
          />
        ))}
      </div>

      {sections.map((section) => (
        <TodoSection
          key={section.id}
          section={section}
          todos={todos.filter((t) => t.sectionId === section.id)}
          confettiEnabled={confettiEnabled}
          onToggleSection={onToggleSection}
          onDeleteSection={onDeleteSection}
          onEditSection={onEditSection}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          onEditTodo={onEditTodo}
          onIndentTodo={onIndentTodo}
          onAddTodo={onAddTodo}
          onAddTodoAfter={onAddTodoAfter}
          onTodoDragStart={handleTodoDragStart}
          onTodoDragOver={handleTodoDragOver}
          onTodoDragLeave={handleDragLeave}
          onTodoDrop={handleTodoDrop}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragOver={handleSectionDragOver}
          onSectionDrop={handleSectionDrop}
          onDropOnSection={handleDropOnSection}
          onMoveToToday={onMoveToToday}
          dragState={dragState}
          selectedIds={selectedIds}
          onTodoSelect={handleTodoSelect}
          onTodoTouchStart={touchDrag.handleTouchStart}
          onTodoTouchMove={touchDrag.handleTouchMove}
          onTodoTouchEnd={touchDrag.handleTouchEnd}
        />
      ))}

      {needsExpansion && (
        <button
          className="todo-expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show all (${totalTodos} items)`}
        </button>
      )}
    </div>
  );
}
