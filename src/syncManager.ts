// Debounced sync manager for optimistic updates
// Updates local state immediately, batches DB writes

type SyncOperation = {
  id: string;
  type: 'todo' | 'section' | 'routine' | 'goal' | 'journal' | 'friend';
  action: 'create' | 'update' | 'delete' | 'reorder';
  data: unknown;
  timestamp: number;
};

class SyncManager {
  private pendingOps: Map<string, SyncOperation> = new Map();
  private flushTimeout: number | null = null;
  private flushInterval = 2000; // 2 seconds
  private flushCallbacks: Map<string, (ops: SyncOperation[]) => Promise<void>> = new Map();
  private isFlushing = false;

  // Register a flush callback for a specific type
  registerFlushCallback(type: string, callback: (ops: SyncOperation[]) => Promise<void>) {
    this.flushCallbacks.set(type, callback);
  }

  // Queue an operation
  queue(op: Omit<SyncOperation, 'timestamp'>) {
    const key = `${op.type}-${op.action}-${op.id}`;

    // For reorder, use a special key since it affects all items
    const actualKey = op.action === 'reorder' ? `${op.type}-reorder` : key;

    this.pendingOps.set(actualKey, {
      ...op,
      timestamp: Date.now(),
    });

    this.scheduleFlush();
  }

  // Schedule a flush
  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = window.setTimeout(() => this.flush(), this.flushInterval);
  }

  // Flush all pending operations
  async flush() {
    if (this.isFlushing || this.pendingOps.size === 0) return;

    this.isFlushing = true;
    const ops = Array.from(this.pendingOps.values());
    this.pendingOps.clear();

    // Group by type
    const byType = new Map<string, SyncOperation[]>();
    for (const op of ops) {
      const existing = byType.get(op.type) || [];
      existing.push(op);
      byType.set(op.type, existing);
    }

    // Execute callbacks for each type
    const promises: Promise<void>[] = [];
    for (const [type, typeOps] of byType) {
      const callback = this.flushCallbacks.get(type);
      if (callback) {
        promises.push(
          callback(typeOps).catch((err) => {
            console.error(`Sync error for ${type}:`, err);
            // Re-queue failed operations
            for (const op of typeOps) {
              this.queue(op);
            }
          })
        );
      }
    }

    await Promise.all(promises);
    this.isFlushing = false;
  }

  // Force immediate flush (e.g., on page unload)
  async flushNow() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    await this.flush();
  }

  // Check if there are pending changes
  hasPendingChanges() {
    return this.pendingOps.size > 0;
  }
}

export const syncManager = new SyncManager();

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    syncManager.flushNow();
  });

  // Also flush when tab becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      syncManager.flushNow();
    }
  });
}
