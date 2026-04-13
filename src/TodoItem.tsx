import { useState, useRef, useEffect, useCallback } from 'react';
import { Todo } from './types';
import { Confetti } from './Confetti';

export type DropPosition = 'above' | 'below' | null;

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string, isBullet?: boolean) => void;
  onIndent: (id: string, indent: number) => void;
  onCreateBelow?: (id: string, indent: number) => void;
  onCreateAbove?: (id: string, indent: number) => void;
  onDeleteAndFocusAbove?: (id: string) => void;
  onFocusPrev?: (cursorPos: number) => void;
  onFocusNext?: (cursorPos: number) => void;
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
  onFocusChange?: (id: string | null) => void;
  onTouchStart?: (e: React.TouchEvent, id: string) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  dragCount?: number; // Number of items being dragged (for visual)
  onConvertToToggle?: (id: string) => void;
  onToggleCollapse?: (id: string) => void;
  onClearSelection?: () => void;
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onIndent,
  onCreateBelow,
  onCreateAbove,
  onDeleteAndFocusAbove,
  onFocusPrev,
  onFocusNext,
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
  onFocusChange,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  dragCount = 1,
  onConvertToToggle,
  onToggleCollapse,
  onClearSelection,
}: Props) {
  const [localText, setLocalText] = useState(todo.text);
  const [showConfetti, setShowConfetti] = useState<{ x: number; y: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLLabelElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const indent = todo.indent ?? 0;

  // Only sync from props if we don't have unsaved local changes
  // This prevents ANY external update from overwriting user's typing
  useEffect(() => {
    if (!hasUnsavedChangesRef.current && !isFocused) {
      setLocalText(todo.text);
    }
  }, [todo.text, isFocused]);

  // Debounced auto-save to prevent data loss on refresh
  const debouncedSave = useCallback((text: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    hasUnsavedChangesRef.current = true;
    saveTimeoutRef.current = window.setTimeout(() => {
      const trimmed = text.trim();
      if (trimmed && trimmed !== todo.text) {
        onEdit(todo.id, trimmed);
      }
      hasUnsavedChangesRef.current = false;
    }, 500);
  }, [todo.id, todo.text, onEdit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Convert ~~text~~ to <s>text</s> and **text** to <b>text</b> for contentEditable
  const textToHtml = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>');
  };

  // Convert HTML back to markdown markup from contentEditable (recursive)
  const htmlToText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const walk = (node: Node, inStrike: boolean, inBold: boolean): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      const isStrike = node.nodeName === 'S' || node.nodeName === 'STRIKE';
      const isBoldTag = node.nodeName === 'B' || node.nodeName === 'STRONG';
      let inner = '';
      node.childNodes.forEach(child => {
        inner += walk(child, inStrike || isStrike, inBold || isBoldTag);
      });
      if (isStrike && !inStrike) {
        return '~~' + inner + '~~';
      }
      if (isBoldTag && !inBold) {
        return '**' + inner + '**';
      }
      return inner;
    };
    let result = '';
    div.childNodes.forEach(node => {
      result += walk(node, false, false);
    });
    return result;
  };

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

  // Sync localText to contentEditable when not focused (and on mount)
  const editableMountedRef = useRef(false);
  useEffect(() => {
    if (editableRef.current && (localText.includes('~~') || localText.includes('**'))) {
      if (!isFocused || !editableMountedRef.current) {
        editableRef.current.innerHTML = textToHtml(localText);
        editableMountedRef.current = true;
      }
    }
  }, [localText, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newText = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Convert "- " at start to bullet (remove the dash, bullet icon replaces checkbox)
    if (newText.startsWith('- ') && !todo.isBullet) {
      newText = newText.slice(2); // Remove "- " prefix
      setLocalText(newText);
      // Immediately save with isBullet: true
      onEdit(todo.id, newText, true);
      hasUnsavedChangesRef.current = false;
      // Move cursor to start
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(0, 0);
        }
      }, 0);
      return;
    }

    // Convert "-> " to "→ " anywhere in text
    if (newText.includes('-> ')) {
      const arrowIndex = newText.indexOf('-> ');
      newText = newText.replace('-> ', '→ ');
      setLocalText(newText);
      debouncedSave(newText);
      // Adjust cursor position (we removed 1 character)
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = cursorPos > arrowIndex + 2 ? cursorPos - 1 : cursorPos;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
      return;
    }

    setLocalText(newText);
    debouncedSave(newText);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Clear any pending debounced save since we're saving now
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const trimmed = localText.trim();
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed);
    } else {
      setLocalText(todo.text);
    }
    hasUnsavedChangesRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Clear any pending debounced save since we're saving now
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // If empty, convert to empty line (no checkbox) and don't create new todo
      if (localText.trim() === '') {
        onEdit(todo.id, '');
        hasUnsavedChangesRef.current = false;
        inputRef.current?.blur();
        return;
      }

      // Save current text first
      const trimmed = localText.trim();
      if (trimmed !== todo.text) {
        onEdit(todo.id, trimmed);
      }
      hasUnsavedChangesRef.current = false;
      // If cursor is at the start of non-empty todo, create new todo above; otherwise below
      const cursorAtStart = inputRef.current?.selectionStart === 0 && inputRef.current?.selectionEnd === 0;
      const hasText = localText.length > 0;
      if (cursorAtStart && hasText && onCreateAbove) {
        onCreateAbove(todo.id, indent);
      } else if (onCreateBelow) {
        onCreateBelow(todo.id, indent);
      }
    } else if (e.key === 'Backspace' && localText === '') {
      e.preventDefault();
      if (onDeleteAndFocusAbove) {
        onDeleteAndFocusAbove(todo.id);
      } else {
        onDelete(todo.id);
      }
    } else if (e.key === 'Escape') {
      setLocalText(todo.text);
      inputRef.current?.blur();
    } else if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      // Cmd/Ctrl+B: toggle bold on selected text
      e.preventDefault();
      const textarea = inputRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return; // No selection

      const before = localText.slice(0, start);
      const selected = localText.slice(start, end);
      const after = localText.slice(end);

      let newText: string;
      let newStart: number;
      let newEnd: number;

      // Toggle: if already wrapped with **, remove them; otherwise add them
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
        const unwrapped = selected.slice(2, -2);
        newText = before + unwrapped + after;
        newStart = start;
        newEnd = end - 4;
      } else if (before.endsWith('**') && after.startsWith('**')) {
        newText = before.slice(0, -2) + selected + after.slice(2);
        newStart = start - 2;
        newEnd = end - 2;
      } else {
        newText = before + '**' + selected + '**' + after;
        newStart = start;
        newEnd = end + 4;
      }

      setLocalText(newText);
      debouncedSave(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    } else if (e.key === 'x' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      // Cmd/Ctrl+Shift+X: toggle strikethrough on selected text
      e.preventDefault();
      const textarea = inputRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return; // No selection

      const before = localText.slice(0, start);
      const selected = localText.slice(start, end);
      const after = localText.slice(end);

      let newText: string;
      let newStart: number;
      let newEnd: number;

      // Toggle: if already wrapped with ~~, remove them; otherwise add them
      if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length > 4) {
        // Remove ~~ from inside selection
        const unwrapped = selected.slice(2, -2);
        newText = before + unwrapped + after;
        newStart = start;
        newEnd = end - 4;
      } else if (before.endsWith('~~') && after.startsWith('~~')) {
        // Remove ~~ from outside selection
        newText = before.slice(0, -2) + selected + after.slice(2);
        newStart = start - 2;
        newEnd = end - 2;
      } else {
        // Add ~~
        newText = before + '~~' + selected + '~~' + after;
        newStart = start;
        newEnd = end + 4;
      }

      setLocalText(newText);
      debouncedSave(newText);
      // Restore selection after React re-renders
      setTimeout(() => {
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    } else if (e.key === 'ArrowUp' && onFocusPrev) {
      e.preventDefault();
      onFocusPrev(inputRef.current?.selectionStart || 0);
    } else if (e.key === 'ArrowDown' && onFocusNext) {
      e.preventDefault();
      onFocusNext(inputRef.current?.selectionStart || 0);
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
      // Reset first so re-checking triggers a fresh confetti
      setShowConfetti(null);
      requestAnimationFrame(() => {
        setShowConfetti({ x: rect.left + rect.width / 2, y: rect.top });
      });
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 300);
    }
    onToggle(todo.id);
  };

  // Close action menu when clicking outside
  useEffect(() => {
    if (!showActionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionMenu]);

  // Check if this is an empty spacer line
  const isEmptyLine = todo.text === '' && !isFocused;

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
      className={`todo-item ${isEmptyLine ? 'empty-line' : ''} ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''} ${isSelected ? 'selected' : ''} ${todo.isToggle && dropPosition ? 'toggle-drop-target' : ''}`}
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
        // Handle selection based on modifier keys
        if ((e.shiftKey || e.metaKey || e.ctrlKey) && onSelect) {
          e.preventDefault();
          onSelect(todo.id, e);
        } else {
          // Regular click clears multi-selection
          onClearSelection?.();
        }
        // Click on empty line to focus it
        if (isEmptyLine) {
          inputRef.current?.focus();
        }
      }}
      onTouchStart={onTouchStart ? (e) => onTouchStart(e, todo.id) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {!isEmptyLine && (
        <>
          <span
            className="drag-handle"
            onClick={(e) => {
              e.stopPropagation();
              // Show action menu on click
              setShowActionMenu(!showActionMenu);
            }}
          >⋮⋮</span>
          {showActionMenu && onConvertToToggle && todo.text.trim() && !todo.isToggle && (
            <div className="todo-action-menu" ref={actionMenuRef}>
              <button
                className="todo-action-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToToggle(todo.id);
                  setShowActionMenu(false);
                }}
              >
                Convert to toggle
              </button>
            </div>
          )}
          {todo.isToggle ? (
            <span
              className={`toggle-arrow ${todo.toggleCollapsed ? '' : 'open'}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.(todo.id);
              }}
            >▶</span>
          ) : todo.isBullet ? (
            <span className="todo-bullet">•</span>
          ) : (
            <label ref={checkboxRef} className={`todo-checkbox ${celebrating ? 'celebrating' : ''}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={handleToggle}
              />
              <span className="checkmark"></span>
            </label>
          )}
        </>
      )}
      {(localText.includes('~~') || localText.includes('**')) ? (
        <div
          ref={editableRef}
          className={`todo-editable ${todo.completed ? 'completed' : ''}`}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => { setIsFocused(true); onFocusChange?.(todo.id); }}
          onBlur={(e) => {
            setIsFocused(false);
            onFocusChange?.(null);
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
              saveTimeoutRef.current = null;
            }
            const newText = htmlToText(e.currentTarget.innerHTML).trim();
            if (newText && newText !== todo.text) {
              onEdit(todo.id, newText);
            }
            // Sync localText so the correct branch renders after blur
            setLocalText(newText || todo.text);
            hasUnsavedChangesRef.current = false;
          }}
          onInput={(e) => {
            let newText = htmlToText(e.currentTarget.innerHTML);
            // Convert "- " at start to bullet (remove the dash, bullet icon replaces checkbox)
            if (newText.startsWith('- ') && !todo.isBullet) {
              newText = newText.slice(2); // Remove "- " prefix
              e.currentTarget.innerHTML = textToHtml(newText);
              // Move cursor to start
              const range = document.createRange();
              const sel = window.getSelection();
              if (e.currentTarget.firstChild) {
                range.setStart(e.currentTarget.firstChild, 0);
                range.collapse(true);
              } else {
                range.selectNodeContents(e.currentTarget);
                range.collapse(true);
              }
              sel?.removeAllRanges();
              sel?.addRange(range);
              // Immediately save with isBullet: true
              onEdit(todo.id, newText, true);
              hasUnsavedChangesRef.current = false;
              return;
            }
            // Convert "-> " to "→ " anywhere in text
            if (newText.includes('-> ')) {
              newText = newText.replace('-> ', '→ ');
              e.currentTarget.innerHTML = textToHtml(newText);
              // Move cursor to end
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(e.currentTarget);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
            hasUnsavedChangesRef.current = true;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = window.setTimeout(() => {
              const trimmed = newText.trim();
              if (trimmed && trimmed !== todo.text) {
                onEdit(todo.id, trimmed);
              }
              hasUnsavedChangesRef.current = false;
            }, 500);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
              }
              const newText = htmlToText(e.currentTarget.innerHTML).trim();

              // If empty, convert to empty line (no checkbox) and don't create new todo
              if (newText === '') {
                onEdit(todo.id, '');
                hasUnsavedChangesRef.current = false;
                e.currentTarget.blur();
                return;
              }

              if (newText !== todo.text) {
                onEdit(todo.id, newText);
              }
              hasUnsavedChangesRef.current = false;
              // Check if cursor is at start of non-empty todo
              const sel = window.getSelection();
              const cursorAtStart = sel && sel.anchorOffset === 0 && sel.focusOffset === 0 && sel.anchorNode === e.currentTarget.firstChild;
              const hasText = newText.length > 0;
              if (cursorAtStart && hasText && onCreateAbove) {
                onCreateAbove(todo.id, indent);
              } else if (onCreateBelow) {
                onCreateBelow(todo.id, indent);
              }
            } else if (e.key === 'Escape') {
              setLocalText(todo.text);
              e.currentTarget.innerHTML = textToHtml(todo.text);
              e.currentTarget.blur();
            } else if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
              e.preventDefault();
              const sel = window.getSelection();
              if (!sel || sel.isCollapsed) return;
              document.execCommand('bold');
            } else if (e.key === 'x' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
              e.preventDefault();
              const sel = window.getSelection();
              if (!sel || sel.isCollapsed) return;
              document.execCommand('strikeThrough');
            } else if (e.key === 'ArrowUp' && onFocusPrev) {
              e.preventDefault();
              const sel = window.getSelection();
              onFocusPrev(sel?.anchorOffset || 0);
            } else if (e.key === 'ArrowDown' && onFocusNext) {
              e.preventDefault();
              const sel = window.getSelection();
              onFocusNext(sel?.anchorOffset || 0);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (e.shiftKey) {
                if (indent > 0) onIndent(todo.id, indent - 1);
              } else {
                if (canIndent && indent < 3) onIndent(todo.id, indent + 1);
              }
            }
          }}
        />
      ) : (
        <textarea
          ref={inputRef}
          className={`todo-text-input ${todo.completed ? 'completed' : ''}`}
          value={localText}
          onChange={handleChange}
          onFocus={() => { setIsFocused(true); onFocusChange?.(todo.id); }}
          onBlur={() => { handleBlur(); onFocusChange?.(null); }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
      )}
      <button className="todo-delete" onClick={() => onDelete(todo.id)}>×</button>
      {isDragging && dragCount > 1 && (
        <span className="todo-drag-count">+{dragCount - 1}</span>
      )}
    </div>
    </>
  );
}
