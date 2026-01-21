import { useState, useRef } from 'react';
import { Todo, ToggleSection } from './types';
import { TodoItem, DropPosition } from './TodoItem';
import { TodoSection } from './TodoSection';

interface Props {
  todos: Todo[];
  sections: ToggleSection[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (id: string, text: string) => void;
  onIndentTodo: (id: string, indent: number) => void;
  onAddTodo: (text: string, sectionId: string | null) => void;
  onMoveTodo: (id: string, newSectionId: string | null) => void;
  onReorderTodos: (todos: Todo[]) => void;
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onAddSection: (name: string) => void;
  onReorderSections: (sections: ToggleSection[]) => void;
  onMoveToToday: (sectionId: string) => void;
}

type DragType = 'todo' | 'section' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  targetId: string | null;
  targetType: DragType;
  position: DropPosition;
}

const TODO_LIMIT = 12;

export function TodoList({
  todos,
  sections,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onIndentTodo,
  onAddTodo,
  onMoveTodo,
  onReorderTodos,
  onToggleSection,
  onDeleteSection,
  onEditSection,
  onAddSection,
  onReorderSections,
  onMoveToToday,
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
  });
  const dragRef = useRef<{ type: DragType; id: string } | null>(null);

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim()) return;
    onAddSection(newSection.trim());
    setNewSection('');
    setShowSectionInput(false);
  };

  // Todo drag handlers
  const handleTodoDragStart = (e: React.DragEvent, id: string) => {
    dragRef.current = { type: 'todo', id };
    setDragState((s) => ({ ...s, type: 'todo', draggedId: id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTodoDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dragRef.current || dragRef.current.id === targetId) {
      setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    setDragState((s) => ({ ...s, targetId, targetType: 'todo', position }));
  };

  const handleTodoDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.type !== 'todo') return;
    if (dragRef.current.id === targetId) return;

    const draggedTodo = todos.find((t) => t.id === dragRef.current!.id);
    const targetTodo = todos.find((t) => t.id === targetId);
    if (!draggedTodo || !targetTodo) return;

    // If moving to a different section, update sectionId
    if (draggedTodo.sectionId !== targetTodo.sectionId) {
      onMoveTodo(draggedTodo.id, targetTodo.sectionId);
    }

    // Reorder within the list
    const draggedIndex = todos.findIndex((t) => t.id === dragRef.current!.id);
    const targetIndex = todos.findIndex((t) => t.id === targetId);

    const newTodos = [...todos];
    const [dragged] = newTodos.splice(draggedIndex, 1);

    // Update sectionId for the dragged todo
    dragged.sectionId = targetTodo.sectionId;

    let insertIndex = targetIndex;
    if (dragState.position === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    newTodos.splice(insertIndex, 0, dragged);
    onReorderTodos(newTodos);

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

    const draggedTodo = todos.find((t) => t.id === dragRef.current!.id);
    if (!draggedTodo || draggedTodo.sectionId === sectionId) return;

    onMoveTodo(draggedTodo.id, sectionId);
    resetDragState();
  };

  // Drop on unsectioned area
  const handleDropOnUnsectioned = (e: React.DragEvent) => {
    e.preventDefault();
    setUnsectionedHover(false);
    if (!dragRef.current || dragRef.current.type !== 'todo') return;

    const draggedTodo = todos.find((t) => t.id === dragRef.current!.id);
    if (!draggedTodo || draggedTodo.sectionId === null) return;

    onMoveTodo(draggedTodo.id, null);
    resetDragState();
  };

  const handleDragLeave = () => {
    setDragState((s) => ({ ...s, targetId: null, targetType: null, position: null }));
  };

  const resetDragState = () => {
    setDragState({ type: null, draggedId: null, targetId: null, targetType: null, position: null });
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
            canIndent={index > 0}
            onDragStart={handleTodoDragStart}
            onDragOver={handleTodoDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleTodoDrop}
            dropPosition={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.position : null}
            isDragging={dragState.draggedId === todo.id}
          />
        ))}
      </div>

      {sections.map((section) => (
        <TodoSection
          key={section.id}
          section={section}
          todos={todos.filter((t) => t.sectionId === section.id)}
          onToggleSection={onToggleSection}
          onDeleteSection={onDeleteSection}
          onEditSection={onEditSection}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          onEditTodo={onEditTodo}
          onIndentTodo={onIndentTodo}
          onAddTodo={onAddTodo}
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
