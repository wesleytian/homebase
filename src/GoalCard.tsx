import { useState, useRef, useEffect } from 'react';
import { Goal, GoalSubtask } from './types';

export type DropPosition = 'above' | 'below' | null;

interface Props {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { title?: string; description?: string; subtasks?: GoalSubtask[] }) => void;
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
  const [newSubtask, setNewSubtask] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

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

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubtask.trim();
    if (!trimmed) return;

    const newSubtaskItem: GoalSubtask = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
    };
    onEdit(goal.id, { subtasks: [...(goal.subtasks || []), newSubtaskItem] });
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (goal.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onEdit(goal.id, { subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = (goal.subtasks || []).filter((st) => st.id !== subtaskId);
    onEdit(goal.id, { subtasks: updatedSubtasks });
  };

  const subtasks = goal.subtasks || [];
  const completedCount = subtasks.filter((st) => st.completed).length;

  return (
    <div
      className={`goal-card ${dropPosition ? `drop-${dropPosition}` : ''} ${expanded ? 'expanded' : ''}`}
      draggable={!editingField && !expanded}
      onDragStart={(e) => onDragStart(e, goal.id)}
      onDragOver={(e) => onDragOver(e, goal.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, goal.id)}
    >
      <div className="goal-header">
        <span className="goal-drag-handle">⋮⋮</span>
        <button
          className={`goal-expand-toggle ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          ▶
        </button>
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
          {subtasks.length > 0 && (
            <span className="goal-subtask-count">
              {completedCount}/{subtasks.length}
            </span>
          )}
        </div>
        <button className="goal-delete" onClick={() => onDelete(goal.id)}>
          ×
        </button>
      </div>
      {expanded && (
        <div className="goal-details">
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
          ) : goal.description ? (
            <span className="goal-description" onClick={() => startEditing('description')}>
              {goal.description}
            </span>
          ) : null}
          <div className="goal-subtasks">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className={`goal-subtask ${subtask.completed ? 'completed' : ''}`}>
                <label className="subtask-checkbox">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtask(subtask.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <span className="subtask-text">{subtask.text}</span>
                <button className="subtask-delete" onClick={() => deleteSubtask(subtask.id)}>×</button>
              </div>
            ))}
            <form className="subtask-add-form" onSubmit={addSubtask}>
              <input
                ref={subtaskInputRef}
                type="text"
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
