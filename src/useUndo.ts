import { useCallback, useEffect, useRef } from 'react';

export interface UndoAction {
  type: string;
  undo: () => void;
  description: string;
}

const MAX_UNDO_STACK = 50;
const SHAKE_THRESHOLD = 15; // Acceleration threshold for shake detection
const SHAKE_TIMEOUT = 1000; // Minimum time between shake undos (ms)

export function useUndo() {
  const undoStack = useRef<UndoAction[]>([]);
  const lastShakeTime = useRef<number>(0);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });

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

  // Mobile shake detection for undo
  useEffect(() => {
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acceleration = e.accelerationIncludingGravity;
      if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
        return;
      }

      const { x, y, z } = acceleration;
      const last = lastAcceleration.current;

      // Calculate change in acceleration
      const deltaX = Math.abs(x - last.x);
      const deltaY = Math.abs(y - last.y);
      const deltaZ = Math.abs(z - last.z);

      lastAcceleration.current = { x, y, z };

      // Check if shake threshold exceeded
      const totalDelta = deltaX + deltaY + deltaZ;
      if (totalDelta > SHAKE_THRESHOLD) {
        const now = Date.now();
        // Debounce: only trigger if enough time has passed since last shake
        if (now - lastShakeTime.current > SHAKE_TIMEOUT) {
          lastShakeTime.current = now;
          const description = undo();
          if (description) {
            console.log(`Shake Undo: ${description}`);
          }
        }
      }
    };

    // Request permission for iOS 13+
    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
          }
        } catch {
          // Permission denied or error
        }
      } else {
        // Non-iOS or older iOS - just add listener
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [undo]);

  return { pushUndo, undo, canUndo };
}
