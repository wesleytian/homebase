import { useState } from 'react';
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

type DragType = 'todo' | 'section' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  targetId: string | null;
  targetType: DragType;
  position: DropPosition;
}

interface Props {
  section: ToggleSection;
  todos: Todo[];
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (id: string, text: string) => void;
  onAddTodo: (text: string, sectionId: string) => void;
  onTodoDragStart: (e: React.DragEvent, id: string) => void;
  onTodoDragOver: (e: React.DragEvent, id: string) => void;
  onTodoDragLeave: () => void;
  onTodoDrop: (e: React.DragEvent, id: string) => void;
  onSectionDragStart: (e: React.DragEvent, id: string) => void;
  onSectionDragOver: (e: React.DragEvent, id: string) => void;
  onSectionDrop: (e: React.DragEvent, id: string) => void;
  onDropOnSection: (e: React.DragEvent, sectionId: string) => void;
  onMoveToToday: (sectionId: string) => void;
  dragState: DragState;
}

export function TodoSection({
  section,
  todos,
  onToggleSection,
  onDeleteSection,
  onEditSection,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onAddTodo,
  onTodoDragStart,
  onTodoDragOver,
  onTodoDragLeave,
  onTodoDrop,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDrop,
  onDropOnSection,
  onMoveToToday,
  dragState,
}: Props) {
  const [newTodo, setNewTodo] = useState('');
  const [todoHovering, setTodoHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);

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

  const isSectionDropTarget = dragState.targetId === section.id && dragState.targetType === 'section';
  const isSectionDragging = dragState.draggedId === section.id && dragState.type === 'section';
  const isTodoDropTarget = todoHovering && dragState.type === 'todo';

  return (
    <div
      className={`todo-section ${isSectionDropTarget ? `drop-${dragState.position}` : ''}`}
      onDragOver={(e) => onSectionDragOver(e, section.id)}
      onDrop={(e) => onSectionDrop(e, section.id)}
    >
      <div
        className={`section-header ${isSectionDragging ? 'dragging' : ''} ${isTodoDropTarget ? 'todo-drop-target' : ''}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onSectionDragStart(e, section.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragState.type === 'todo') {
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
          if (dragState.type === 'todo') {
            onDropOnSection(e, section.id);
          } else {
            onSectionDrop(e, section.id);
          }
        }}
        onClick={() => onToggleSection(section.id)}
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
        <span className="section-count">{todos.length}</span>
        {isDateSection(section.name) && section.name !== getTodayFormatted() && todos.some(t => !t.completed) && (
          <button
            className="section-move-today"
            title="Move unfinished to today"
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
            onDeleteSection(section.id);
          }}
        >
          ×
        </button>
      </div>
      {!section.collapsed && (
        <div className="section-content">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              onDelete={onDeleteTodo}
              onEdit={onEditTodo}
              onDragStart={onTodoDragStart}
              onDragOver={onTodoDragOver}
              onDragLeave={onTodoDragLeave}
              onDrop={onTodoDrop}
              dropPosition={dragState.targetId === todo.id && dragState.targetType === 'todo' ? dragState.position : null}
              isDragging={dragState.draggedId === todo.id}
            />
          ))}
          <form className="section-add-form" onSubmit={handleAdd}>
              <input
                type="text"
                placeholder="Add todo..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
          </form>
        </div>
      )}
    </div>
  );
}
