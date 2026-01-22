import { useCallback, useEffect, useRef } from 'react';

export interface UndoAction {
  type: string;
  undo: () => void;
  description: string;
}

const MAX_UNDO_STACK = 50;

export function useUndo() {
  const undoStack = useRef<UndoAction[]>([]);

  const pushUndo = useCallback((action: UndoAction) => {
    undoStack.current.push(action);
    // Keep stack size limited
    if (undoStack.current.length > MAX_UNDO_STACK) {
      undoStack.current.shift();
    }
  }, []);

  const undo = useCallback(() => {
    const action = undoStack.current.pop();
    if (action) {
      action.undo();
      return action.description;
    }
    return null;
  }, []);

  const canUndo = useCallback(() => {
    return undoStack.current.length > 0;
  }, []);

  // Listen for Cmd+Z / Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;

        // If in an input/textarea with content, let browser handle native undo
        if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.value) {
          return;
        }

        // Otherwise, use our undo system
        e.preventDefault();
        const description = undo();
        if (description) {
          console.log(`Undo: ${description}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return { pushUndo, undo, canUndo };
}
