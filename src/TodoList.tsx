import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  onEditTodo: (id: string, text: string, isBullet?: boolean) => void;
  onIndentTodo: (id: string, indent: number) => void;
  onAddTodo: (text: string, sectionId: string | null) => void;
  onAddTodoAfter: (text: string, afterTodoId: string, indent?: number) => void;
  onAddTodoBefore: (text: string, beforeTodoId: string, indent?: number) => void;
  onMoveTodo: (id: string, newSectionId: string | null) => void;
  onReorderTodos: (todos: Todo[]) => void;
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onAddSection: (name: string, parentId?: string | null) => void;
  onReorderSections: (sections: ToggleSection[]) => void;
  onMoveToToday: (sectionId: string) => void;
  onConvertTodoToToggle: (todoId: string) => void;
  onToggleCollapse: (todoId: string) => void;
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

// Matches a "Day, M/D" token anywhere in the name, so the section can be
// renamed freely (prefix/suffix text, *, emoji) without losing its date.
const DATE_PATTERN = /(Mon|Tues|Wed|Thurs|Fri|Sat|Sun),?\s*(\d{1,2})\/(\d{1,2})(?![\d/])/i;

function isDateSection(name: string): boolean {
  return DATE_PATTERN.test(name);
}

// Extract the 1-indexed month/day from a date-section name, or null.
function getSectionMonthDay(name: string): { month: number; day: number } | null {
  const m = name.match(DATE_PATTERN);
  if (!m) return null;
  return { month: parseInt(m[2]), day: parseInt(m[3]) };
}

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
  onAddTodoBefore,
  onMoveTodo,
  onReorderTodos,
  onToggleSection,
  onDeleteSection,
  onEditSection,
  onAddSection,
  onReorderSections,
  onMoveToToday,
  onConvertTodoToToggle,
  onToggleCollapse,
  pushUndo,
}: Props) {
  const [unsectionedHover, setUnsectionedHover] = useState(false);
  const [visibleSectionCount, setVisibleSectionCount] = useState(() => {
    const saved = localStorage.getItem('visibleSectionCount');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    draggedId: null,
    targetId: null,
    targetType: null,
    position: null,
    targetIndent: 0,
  });
  const dragRef = useRef<{ type: DragType; id: string; selectedIds?: Set<string> } | null>(null);

  // Persist visibleSectionCount to localStorage
  useEffect(() => {
    localStorage.setItem('visibleSectionCount', String(visibleSectionCount));
  }, [visibleSectionCount]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);

  // Handle focus change from TodoItem
  const handleFocusChange = useCallback((id: string | null) => {
    setFocusedTodoId(id);
    if (id) {
      setLastSelectedId(id);
    }
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection when clicking outside todos
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't clear if clicking on a todo item or its children
    if (target.closest('.todo-item') || target.closest('.section-header') || target.closest('.section-add-form')) {
      return;
    }
    // Don't clear if modifier keys are held
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      return;
    }
    setSelectedIds(new Set());
  }, []);

  // Handle click on todo for selection
  const handleTodoSelect = useCallback((id: string, e: React.MouseEvent) => {
    // Use focused todo as anchor for shift+click if available
    const anchorId = focusedTodoId || lastSelectedId;

    if (e.shiftKey && anchorId) {
      // Shift+click: select range from anchor to clicked
      const anchorIndex = todos.findIndex((t) => t.id === anchorId);
      const currentIndex = todos.findIndex((t) => t.id === id);
      if (anchorIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(anchorIndex, currentIndex);
        const end = Math.max(anchorIndex, currentIndex);
        const rangeIds = todos.slice(start, end + 1).map((t) => t.id);
        setSelectedIds(new Set(rangeIds));
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
  }, [todos, selectedIds, lastSelectedId, focusedTodoId]);

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

  // Document-level click handler to clear selection when clicking outside todos
  useEffect(() => {
    if (selectedIds.size === 0) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't clear if clicking on a todo item or interactive elements
      if (
        target.closest('.todo-item') ||
        target.closest('.section-header') ||
        target.closest('.section-add-form') ||
        target.closest('.subsection-add-form') ||
        target.closest('.add-subsection-btn') ||
        target.closest('.delete-confirm-overlay') ||
        target.closest('.todo-action-menu')
      ) {
        return;
      }
      // Don't clear if modifier keys are held (user might be extending selection)
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        return;
      }
      setSelectedIds(new Set());
    };

    // Use capture phase to handle clicks before other handlers can stopPropagation
    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [selectedIds.size]);

  // Touch drag for todos
  const touchDrag = useTouchDrag({
    items: todos,
    getItemId: (t) => t.id,
    targetSelector: '.todo-item',
    onReorder: onReorderTodos,
    getItemSectionId: (t) => t.sectionId,
    onMoveToSection: onMoveTodo,
    onDragStateChange: (draggedId, targetId, position) => {
      if (draggedId) {
        setDragState((s) => ({ ...s, type: 'todo', draggedId, targetId, targetType: 'todo', position, targetIndent: 0 }));
      } else {
        resetDragState();
      }
    },
  });

  // TEMP DIAGNOSTIC: log raw drag events at the document level.
  useEffect(() => {
    const fmt = (el: EventTarget | null) => {
      const node = el as HTMLElement;
      if (!node || !node.closest) return String(el);
      const sec = node.closest('.todo-section');
      const hdr = node.closest('.section-header');
      return `tag=${node.tagName} cls="${node.className}" inHeader=${!!hdr} inSection=${!!sec}`;
    };
    let lastOver = '';
    const onOver = (e: DragEvent) => {
      const s = fmt(e.target);
      if (s !== lastOver) { lastOver = s; console.log('[doc dragover]', s, 'defaultPrevented=', e.defaultPrevented); }
    };
    const onDrop = (e: DragEvent) => console.log('[doc DROP]', fmt(e.target), 'defaultPrevented=', e.defaultPrevented);
    const onEnd = () => console.log('[doc dragend]');
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    document.addEventListener('dragend', onEnd);
    return () => {
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('dragend', onEnd);
    };
  }, []);

  // Compute next available day section (today through next 7 days). Check by
  // the date token so renamed day sections still count as "already exists".
  const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const existingDays = new Set(
    sections
      .map((s) => getSectionMonthDay(s.name))
      .filter((md): md is { month: number; day: number } => md !== null)
      .map((md) => `${md.month}/${md.day}`)
  );
  let nextDaySection: string | null = null;
  const now = new Date();
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    if (!existingDays.has(`${d.getMonth() + 1}/${d.getDate()}`)) {
      nextDaySection = `${dayNames[d.getDay()]}, ${d.getMonth() + 1}/${d.getDate()}`;
      break;
    }
  }

  const handleAddNextDay = () => {
    if (nextDaySection) {
      // Increase visible count to keep existing sections visible
      // The new section will take a "guaranteed" slot (today/tomorrow),
      // so we need one more slot to maintain the same number of visible past sections
      setVisibleSectionCount((c) => c + 1);
      onAddSection(nextDaySection);
    }
  };

  // Create a list not tied to a day (always visible; rename via double-click on its title).
  const handleAddCustomList = () => {
    const name = window.prompt('Name this list')?.trim();
    if (name) {
      onAddSection(name);
    }
  };

  // Helper to get a todo and all its children (indented todos underneath)
  const getTodoWithChildren = (todoId: string, todoList: Todo[]): string[] => {
    const todo = todoList.find((t) => t.id === todoId);
    if (!todo) return [todoId];

    // Filter to only todos in the same section, preserving order
    const sectionTodos = todoList.filter((t) => t.sectionId === todo.sectionId);
    const todoIndex = sectionTodos.findIndex((t) => t.id === todoId);
    if (todoIndex === -1) return [todoId];

    const todoIndent = todo.indent ?? 0;
    const ids = [todoId];

    // Find all children (todos with higher indent until we hit same or lower indent)
    for (let i = todoIndex + 1; i < sectionTodos.length; i++) {
      const t = sectionTodos[i];
      const tIndent = t.indent ?? 0;
      // Stop if we hit a todo with same or lower indent (not a child)
      if (tIndent <= todoIndent) break;
      ids.push(t.id);
    }

    return ids;
  };

  // Todo drag handlers
  const handleTodoDragStart = (e: React.DragEvent, id: string) => {
    // If dragging a selected todo, include all selected todos plus their children
    // If dragging an unselected todo, drag that one plus its children
    let draggedIds: Set<string>;
    if (selectedIds.has(id)) {
      // Include children for all selected todos
      const allIds = new Set<string>();
      for (const selectedId of selectedIds) {
        for (const childId of getTodoWithChildren(selectedId, todos)) {
          allIds.add(childId);
        }
      }
      draggedIds = allIds;
    } else {
      // Drag this todo and its children
      draggedIds = new Set(getTodoWithChildren(id, todos));
      setSelectedIds(draggedIds);
    }
    dragRef.current = { type: 'todo', id, selectedIds: draggedIds };
    setDragState((s) => ({ ...s, type: 'todo', draggedId: id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTodoDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only handle todo-to-todo drag overs, not section drags
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    // Ignore if hovering over the dragged item or any of its children
    if (dragRef.current.selectedIds?.has(targetId)) {
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
    let targetIndent = Math.min(3, Math.max(0, Math.floor(relativeX / 40)));

    // Limit indent to at most one level deeper than the item directly above the
    // drop point (excluding the dragged items) — can't skip indent levels.
    const draggedIds = dragRef.current.selectedIds ?? new Set([dragRef.current.id]);
    const targetIdx = todos.findIndex((t) => t.id === targetId);
    let prevIndent = -1;
    // The item above the insertion point is the target itself when dropping below,
    // otherwise the nearest non-dragged item before the target.
    const startIdx = position === 'below' ? targetIdx : targetIdx - 1;
    for (let i = startIdx; i >= 0; i--) {
      if (draggedIds.has(todos[i].id)) continue;
      prevIndent = todos[i].indent ?? 0;
      break;
    }
    targetIndent = Math.min(targetIndent, prevIndent + 1);

    setDragState((s) => ({ ...s, targetId, targetType: 'todo', position, targetIndent }));
  };

  const handleTodoDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedIds = dragRef.current.selectedIds || new Set([dragRef.current.id]);
    const primaryDraggedId = dragRef.current.id; // The todo user actually dragged

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

    // Find the primary dragged todo to calculate indent offset
    const primaryTodo = todos.find((t) => t.id === primaryDraggedId);
    const primaryIndent = primaryTodo?.indent ?? 0;
    const indentOffset = dragState.targetIndent - primaryIndent;

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
    // Maintain relative indentation: apply the same offset to all todos
    const updatedDraggedTodos = draggedTodos.map((t) => {
      const originalIndent = t.indent ?? 0;
      const newIndent = Math.min(3, Math.max(0, originalIndent + indentOffset));
      return {
        ...t,
        sectionId: targetTodo.sectionId,
        indent: newIndent,
      };
    });

    // Insert all dragged todos at the target position
    newTodos.splice(targetIndex, 0, ...updatedDraggedTodos);
    onReorderTodos(newTodos);

    // Update indent in DB for all moved todos
    for (let i = 0; i < draggedTodos.length; i++) {
      const original = draggedTodos[i];
      const updated = updatedDraggedTodos[i];
      if (original.indent !== updated.indent) {
        onIndentTodo(original.id, updated.indent);
      }
      if (original.sectionId !== targetTodo.sectionId) {
        onMoveTodo(original.id, targetTodo.sectionId);
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
    // Some browsers won't initiate a drag unless data is set.
    e.dataTransfer.setData('text/plain', id);
    console.log('[section drag] start', id);
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
    console.log('[section drag] drop on', targetId, 'dragRef=', dragRef.current, 'pos=', dragState.position);
    if (!dragRef.current || dragRef.current.type !== 'section') return;
    if (dragRef.current.id === targetId) return;

    // Reorder against the order the user actually sees (Later pinned first),
    // not the raw array — otherwise "below Later" maps to Later's array slot
    // (which may be at the bottom) instead of the top of the list.
    const newSections = [...sections].sort((a, b) => {
      if (a.name.toLowerCase() === 'later') return -1;
      if (b.name.toLowerCase() === 'later') return 1;
      return 0;
    });

    const draggedIndex = newSections.findIndex((s) => s.id === dragRef.current!.id);
    const targetIndex = newSections.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

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

    // Save original state for undo
    const originalTodos = [...todos];

    // Move todos to top of the target section
    const movedIds = new Set(todosToMove.map((t) => t.id));
    const remaining = todos.filter((t) => !movedIds.has(t.id));
    const sectionTodos = remaining.filter((t) => t.sectionId === sectionId);
    const firstSectionTodo = sectionTodos[0];
    const insertIndex = firstSectionTodo
      ? remaining.indexOf(firstSectionTodo)
      : remaining.length;

    // Preserve original indentation when moving to section
    const updatedMoved = todosToMove.map((t) => ({ ...t, sectionId: sectionId }));
    remaining.splice(insertIndex, 0, ...updatedMoved);
    onReorderTodos(remaining);

    for (const todo of todosToMove) {
      onMoveTodo(todo.id, sectionId);
    }

    // Push undo action
    pushUndo({
      type: 'move-todos-to-section',
      description: `Move ${todosToMove.length} todo${todosToMove.length > 1 ? 's' : ''} to section`,
      undo: () => {
        onReorderTodos(originalTodos);
        for (const original of originalSections) {
          onMoveTodo(original.id, original.sectionId);
        }
      },
    });

    setSelectedIds(new Set());
    resetDragState();
  };

  // Drop at end of section (from drop zone at bottom of section content)
  const handleDropAtEndOfSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedIds = dragRef.current.selectedIds || new Set([dragRef.current.id]);
    const draggedTodos = todos.filter((t) => draggedIds.has(t.id));
    if (draggedTodos.length === 0) {
      resetDragState();
      return;
    }

    const originalTodos = [...todos];

    // Remove dragged todos
    const remaining = todos.filter((t) => !draggedIds.has(t.id));

    // Find the last todo in the target section (after removing dragged)
    const sectionTodos = remaining.filter((t) => t.sectionId === sectionId);
    const lastSectionTodo = sectionTodos[sectionTodos.length - 1];
    const insertIndex = lastSectionTodo
      ? remaining.indexOf(lastSectionTodo) + 1
      : remaining.length;

    // Update section for moved todos
    const updatedDragged = draggedTodos.map((t) => ({ ...t, sectionId }));
    remaining.splice(insertIndex, 0, ...updatedDragged);
    onReorderTodos(remaining);

    // Persist section changes
    for (const todo of draggedTodos) {
      if (todo.sectionId !== sectionId) {
        onMoveTodo(todo.id, sectionId);
      }
    }

    // Undo
    const originalSections = draggedTodos.map((t) => ({ id: t.id, sectionId: t.sectionId }));
    pushUndo({
      type: 'move-todos',
      description: `Move ${draggedTodos.length} todo${draggedTodos.length > 1 ? 's' : ''}`,
      undo: () => {
        onReorderTodos(originalTodos);
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
    // Only clear todo drag state, don't interfere with section drags
    if (dragRef.current?.type === 'todo') {
      setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null, targetIndent: 0 }));
    }
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

  // Filter out children of collapsed toggles in unsectioned area
  const visibleUnsectionedTodos = useMemo(() => {
    const result: typeof unsectionedTodos = [];
    let collapsedToggleIndent: number | null = null;

    for (const todo of unsectionedTodos) {
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
  }, [unsectionedTodos]);

  return (
    <div className="todo-list" onDragEnd={handleDragEnd} onClick={handleContainerClick}>
      <div className="section-add-buttons">
        {nextDaySection && (
          <button
            className="add-section-btn add-next-day-btn"
            onClick={handleAddNextDay}
          >
            + {nextDaySection}
          </button>
        )}
        <button
          className="add-section-btn add-custom-list-btn"
          onClick={handleAddCustomList}
        >
          + List
        </button>
      </div>

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
        {visibleUnsectionedTodos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggleTodo}
            onDelete={onDeleteTodo}
            onEdit={onEditTodo}
            onIndent={onIndentTodo}
            onCreateBelow={(id, indent, initialText) => onAddTodoAfter(initialText || '', id, indent)}
            onCreateAbove={(id, indent) => onAddTodoBefore('', id, indent)}
            onDeleteAndFocusAbove={index > 0 ? (id) => {
              const prevTodo = visibleUnsectionedTodos[index - 1];
              onDeleteTodo(id);
              setTimeout(() => {
                const el = document.querySelector(`[data-drag-id="${prevTodo.id}"] .todo-text-input, [data-drag-id="${prevTodo.id}"] .todo-editable`) as HTMLElement;
                if (!el) return;
                el.focus();
                if (el instanceof HTMLTextAreaElement) {
                  el.setSelectionRange(el.value.length, el.value.length);
                } else {
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  range.collapse(false);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
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
            onFocusChange={handleFocusChange}
            onTouchStart={touchDrag.handleTouchStart}
            onTouchMove={touchDrag.handleTouchMove}
            onTouchEnd={touchDrag.handleTouchEnd}
            dragCount={dragState.draggedId === todo.id ? (dragRef.current?.selectedIds?.size || 1) : 1}
            onConvertToToggle={onConvertTodoToToggle}
            onToggleCollapse={onToggleCollapse}
            onClearSelection={handleClearSelection}
          />
        ))}
      </div>

      {(() => {
        // Show today's and tomorrow's sections (if exist) + recent sections with todos up to visibleSectionCount
        const now = new Date();
        const currentYear = now.getFullYear();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Helper to parse section date
        const parseSectionDate = (section: ToggleSection) => {
          const md = getSectionMonthDay(section.name);
          if (!md) return null;
          const sectionDate = new Date(currentYear, md.month - 1, md.day);
          if (sectionDate.getTime() > now.getTime() + 180 * 24 * 60 * 60 * 1000) {
            sectionDate.setFullYear(currentYear - 1);
          }
          return sectionDate.getTime();
        };

        const matchesDay = (name: string, d: Date) => {
          const md = getSectionMonthDay(name);
          return !!md && md.month === d.getMonth() + 1 && md.day === d.getDate();
        };

        // Find today's section (even if empty)
        const todaySection = sections.find((s) => matchesDay(s.name, now));

        // Find tomorrow's section (even if empty)
        const tomorrowSection = sections.find((s) => matchesDay(s.name, tomorrow));

        // Get date sections with todos (excluding today/tomorrow since we handle them separately)
        const dateSectionsWithTodos = sections
          .filter((section) => {
            if (section.parentId) return false; // Exclude child sections
            if (section.name.toLowerCase() === 'later') return false;
            if (!isDateSection(section.name)) return false;
            if (todaySection && section.id === todaySection.id) return false;
            if (tomorrowSection && section.id === tomorrowSection.id) return false;
            const sectionTodos = todos.filter((t) => t.sectionId === section.id);
            return sectionTodos.length > 0;
          })
          .map((section) => ({ section, date: parseSectionDate(section) || 0 }))
          .sort((a, b) => b.date - a.date);

        // Build the list: today + tomorrow (if exist) + fill up to visibleSectionCount with recent sections
        const recentIds = new Set<string>();
        if (todaySection) {
          recentIds.add(todaySection.id);
        }
        if (tomorrowSection) {
          recentIds.add(tomorrowSection.id);
        }
        // Add recent sections with todos until we reach visibleSectionCount
        for (const { section } of dateSectionsWithTodos) {
          if (recentIds.size >= visibleSectionCount) break;
          recentIds.add(section.id);
        }

        const filtered = sections.filter((section) => {
          // Only show top-level sections (child sections render inside their parents)
          if (section.parentId) return false;
          if (section.name.toLowerCase() === 'later') return true;
          // Custom (non-date) lists are always shown, regardless of visible count.
          if (!isDateSection(section.name)) return true;
          return recentIds.has(section.id);
        });
        // Later pinned first; everything else keeps its stored order so custom
        // lists can be dragged to any position among the date sections.
        return filtered.sort((a, b) => {
          if (a.name.toLowerCase() === 'later') return -1;
          if (b.name.toLowerCase() === 'later') return 1;
          return 0; // stable: preserves the order-field ordering
        });
      })().map((section) => (
        <TodoSection
          key={section.id}
          section={section}
          todos={todos.filter((t) => t.sectionId === section.id)}
          allSections={sections}
          allTodos={todos}
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
          onTodoDragStart={handleTodoDragStart}
          onTodoDragOver={handleTodoDragOver}
          onTodoDragLeave={handleDragLeave}
          onTodoDrop={handleTodoDrop}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragOver={handleSectionDragOver}
          onSectionDrop={handleSectionDrop}
          onDropOnSection={handleDropOnSection}
          onDropAtEndOfSection={handleDropAtEndOfSection}
          onMoveToToday={onMoveToToday}
          dragState={dragState}
          selectedIds={selectedIds}
          onTodoSelect={handleTodoSelect}
          onTodoFocusChange={handleFocusChange}
          onTodoTouchStart={touchDrag.handleTouchStart}
          onTodoTouchMove={touchDrag.handleTouchMove}
          onTodoTouchEnd={touchDrag.handleTouchEnd}
          dragSelectedCount={dragRef.current?.selectedIds?.size || 1}
          onConvertTodoToToggle={onConvertTodoToToggle}
          onToggleCollapse={onToggleCollapse}
          onClearSelection={handleClearSelection}
        />
      ))}

      {(() => {
        // Count total date sections with todos (or today's section)
        const now = new Date();
        const todaySection = sections.find((s) => {
          const md = getSectionMonthDay(s.name);
          return !!md && md.month === now.getMonth() + 1 && md.day === now.getDate();
        });

        const dateSectionsWithTodos = sections.filter((s) => {
          if (s.parentId) return false; // Exclude child sections
          if (!isDateSection(s.name) || s.name.toLowerCase() === 'later') return false;
          if (todaySection && s.id === todaySection.id) return true; // Always count today
          const sectionTodos = todos.filter((t) => t.sectionId === s.id);
          return sectionTodos.length > 0;
        });

        const totalCount = dateSectionsWithTodos.length;
        const hasMore = totalCount > visibleSectionCount;
        const canShowLess = visibleSectionCount > 2;

        if (!hasMore && !canShowLess) return null;

        return (
          <div className="todo-expand-buttons">
            {hasMore && (
              <button
                className="todo-expand-btn"
                onClick={() => setVisibleSectionCount((c) => c + 2)}
              >
                Show more
              </button>
            )}
            {canShowLess && (
              <button
                className="todo-expand-btn"
                onClick={() => setVisibleSectionCount(2)}
              >
                Show less
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
