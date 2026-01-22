import { useRef, useCallback, useEffect } from 'react';

export type DropPosition = 'above' | 'below' | null;

const LONG_PRESS_DURATION = 400; // ms before drag starts
const LONG_PRESS_MOVE_THRESHOLD = 10; // px - cancel if moved more than this

interface TouchDragState {
  isDragging: boolean;
  draggedId: string | null;
  draggedElement: HTMLElement | null;
  preview: HTMLElement | null;
  startY: number;
  startX: number;
  offsetY: number;
  offsetX: number;
  scrollInterval: number | null;
  lastTargetId: string | null;
  lastPosition: DropPosition;
  longPressTimer: number | null;
  pendingDragId: string | null;
  pendingElement: HTMLElement | null;
}

interface UseTouchDragOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  targetSelector: string;
  onReorder: (items: T[]) => void;
  onDragStateChange?: (draggedId: string | null, targetId: string | null, position: DropPosition) => void;
}

// Trigger haptic feedback if available
function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(50); // 50ms vibration
  }
}

export function useTouchDrag<T>({ items, getItemId, targetSelector, onReorder, onDragStateChange }: UseTouchDragOptions<T>) {
  const stateRef = useRef<TouchDragState>({
    isDragging: false,
    draggedId: null,
    draggedElement: null,
    preview: null,
    startY: 0,
    startX: 0,
    offsetY: 0,
    offsetX: 0,
    scrollInterval: null,
    lastTargetId: null,
    lastPosition: null,
    longPressTimer: null,
    pendingDragId: null,
    pendingElement: null,
  });

  const cleanupPreview = useCallback(() => {
    const state = stateRef.current;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (state.preview) {
      state.preview.remove();
      state.preview = null;
    }
    if (state.scrollInterval) {
      clearInterval(state.scrollInterval);
      state.scrollInterval = null;
    }
    if (state.draggedElement) {
      state.draggedElement.style.opacity = '';
    }
    if (state.pendingElement) {
      state.pendingElement.classList.remove('touch-pending');
    }
    state.pendingDragId = null;
    state.pendingElement = null;
    // Remove any drop indicators
    document.querySelectorAll('.touch-drop-above, .touch-drop-below, .touch-pending').forEach(el => {
      el.classList.remove('touch-drop-above', 'touch-drop-below', 'touch-pending');
    });
  }, []);

  const startDragging = useCallback((element: HTMLElement, id: string, touchX: number, touchY: number) => {
    const state = stateRef.current;
    const rect = element.getBoundingClientRect();

    state.isDragging = true;
    state.draggedId = id;
    state.draggedElement = element;
    state.offsetY = touchY - rect.top;
    state.offsetX = touchX - rect.left;

    // Create preview clone
    const preview = element.cloneNode(true) as HTMLElement;
    preview.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      opacity: 0.9;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      transform: scale(1.02);
      background: white;
      border-radius: 6px;
    `;
    document.body.appendChild(preview);
    state.preview = preview;

    // Dim the original element
    element.style.opacity = '0.3';
    element.classList.remove('touch-pending');

    // Trigger haptic feedback
    triggerHaptic();

    onDragStateChange?.(id, null, null);
  }, [onDragStateChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    const element = e.currentTarget as HTMLElement;
    const state = stateRef.current;

    // Store start position for move threshold check
    state.startY = touch.clientY;
    state.startX = touch.clientX;
    state.pendingDragId = id;
    state.pendingElement = element;

    // Check if touch started on drag handle - if so, start immediately
    const handle = element.querySelector('.drag-handle, .routine-drag-handle, .goal-drag-handle, .section-drag-handle, .friend-drag-handle, .subtask-drag-handle');
    if (handle) {
      const handleRect = handle.getBoundingClientRect();
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      const isOnHandle = touchX >= handleRect.left - 20 && touchX <= handleRect.right + 20 &&
                         touchY >= handleRect.top - 10 && touchY <= handleRect.bottom + 10;
      if (isOnHandle) {
        // Start dragging immediately when touching handle
        startDragging(element, id, touch.clientX, touch.clientY);
        return;
      }
    }

    // Otherwise, start long press timer
    element.classList.add('touch-pending');

    // Store the initial touch position for the timer callback
    const initialX = touch.clientX;
    const initialY = touch.clientY;

    state.longPressTimer = window.setTimeout(() => {
      // Use stored position since touch event may be stale
      startDragging(element, id, initialX, initialY);
      state.longPressTimer = null;
    }, LONG_PRESS_DURATION);
  }, [startDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    const touch = e.touches[0];

    // If we have a pending long press, check if moved too much
    if (state.longPressTimer && state.pendingElement) {
      const deltaX = Math.abs(touch.clientX - state.startX);
      const deltaY = Math.abs(touch.clientY - state.startY);
      if (deltaX > LONG_PRESS_MOVE_THRESHOLD || deltaY > LONG_PRESS_MOVE_THRESHOLD) {
        // Cancel the long press - user is scrolling
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
        state.pendingElement.classList.remove('touch-pending');
        state.pendingElement = null;
        state.pendingDragId = null;
        return;
      }
    }

    if (!state.isDragging || !state.preview || !state.draggedElement) return;

    e.preventDefault(); // Prevent scrolling while dragging

    // Move preview
    state.preview.style.top = `${touch.clientY - state.offsetY}px`;
    state.preview.style.left = `${touch.clientX - state.offsetX}px`;

    // Auto-scroll when near edges
    const scrollThreshold = 80;
    const scrollSpeed = 10;

    if (state.scrollInterval) {
      clearInterval(state.scrollInterval);
      state.scrollInterval = null;
    }

    if (touch.clientY < scrollThreshold) {
      state.scrollInterval = window.setInterval(() => {
        window.scrollBy(0, -scrollSpeed);
      }, 16);
    } else if (touch.clientY > window.innerHeight - scrollThreshold) {
      state.scrollInterval = window.setInterval(() => {
        window.scrollBy(0, scrollSpeed);
      }, 16);
    }

    // Find drop target under touch point
    state.preview.style.display = 'none';
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    state.preview.style.display = '';

    // Clear previous drop indicators
    document.querySelectorAll('.touch-drop-above, .touch-drop-below').forEach(el => {
      el.classList.remove('touch-drop-above', 'touch-drop-below');
    });

    if (elemBelow) {
      const target = elemBelow.closest(targetSelector) as HTMLElement;

      if (target) {
        const targetId = target.dataset.dragId;

        if (targetId && targetId !== state.draggedId) {
          const targetRect = target.getBoundingClientRect();
          const midY = targetRect.top + targetRect.height / 2;
          const position: DropPosition = touch.clientY < midY ? 'above' : 'below';

          target.classList.add(`touch-drop-${position}`);
          state.lastTargetId = targetId;
          state.lastPosition = position;
          onDragStateChange?.(state.draggedId, targetId, position);
        }
      }
    }
  }, [targetSelector, onDragStateChange]);

  const handleTouchEnd = useCallback(() => {
    const state = stateRef.current;

    // Cancel any pending long press
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (state.pendingElement) {
      state.pendingElement.classList.remove('touch-pending');
      state.pendingElement = null;
      state.pendingDragId = null;
    }

    if (!state.isDragging) return;

    const draggedId = state.draggedId;
    const targetId = state.lastTargetId;
    const position = state.lastPosition;

    cleanupPreview();
    onDragStateChange?.(null, null, null);

    if (draggedId && targetId && targetId !== draggedId) {
      const draggedIndex = items.findIndex(item => getItemId(item) === draggedId);
      const targetIndex = items.findIndex(item => getItemId(item) === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newItems = [...items];
        const [dragged] = newItems.splice(draggedIndex, 1);

        let insertIndex = targetIndex;
        if (position === 'below') {
          insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        } else {
          insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        }

        newItems.splice(insertIndex, 0, dragged);
        onReorder(newItems);
      }
    }

    state.isDragging = false;
    state.draggedId = null;
    state.draggedElement = null;
    state.lastTargetId = null;
    state.lastPosition = null;
  }, [items, getItemId, onReorder, cleanupPreview, onDragStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPreview();
    };
  }, [cleanupPreview]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
