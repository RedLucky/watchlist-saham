/**
 * AI Priority Mutex (Single-Slot Concurrency Gate)
 *
 * Protects CPU-only machines (e.g. Intel i5 without GPU) from CPU thrashing.
 * Enforces serial execution of local LLM inferences while prioritizing
 * interactive user operations (Chat, Screener) over background tasks (Worker).
 */

export const AI_PRIORITY = {
  HIGH: 1,      // Interactive user chat, live query
  NORMAL: 2,    // Screener requests
  LOW: 3        // Background queue jobs (ai-worker.js, deep research)
};

const DEFAULT_LOCK_TIMEOUT_MS = 120_000; // 2 minutes maximum hold time before emergency release

class AiPriorityMutex {
  constructor() {
    this.isLocked = false;
    this.currentOwner = null;
    this.lockAcquiredAt = null;
    this.queue = [];
  }

  /**
   * Executes a task function exclusively with priority arbitration
   * @param {Function} taskFn - Async function returning a promise
   * @param {number} priority - AI_PRIORITY level (1 = highest, 3 = lowest)
   * @param {string} taskName - Human-readable label for debugging
   */
  async runWithAiLock(taskFn, priority = AI_PRIORITY.NORMAL, taskName = 'ai-task') {
    await this._acquireLock(priority, taskName);
    try {
      return await taskFn();
    } finally {
      this._releaseLock(taskName);
    }
  }

  _acquireLock(priority, taskName) {
    // If currently unlocked or lock timed out, acquire immediately
    if (!this.isLocked || this._isLockExpired()) {
      this.isLocked = true;
      this.currentOwner = taskName;
      this.lockAcquiredAt = Date.now();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const item = { resolve, priority, taskName, enqueuedAt: Date.now() };

      // Priority insertion: lower numerical value means higher priority
      const insertIdx = this.queue.findIndex(q => q.priority > priority);
      if (insertIdx === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIdx, 0, item);
      }
    });
  }

  _releaseLock(taskName) {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.isLocked = true;
      this.currentOwner = next.taskName;
      this.lockAcquiredAt = Date.now();
      next.resolve();
    } else {
      this.isLocked = false;
      this.currentOwner = null;
      this.lockAcquiredAt = null;
    }
  }

  _isLockExpired() {
    if (!this.lockAcquiredAt) return false;
    const elapsed = Date.now() - this.lockAcquiredAt;
    if (elapsed > DEFAULT_LOCK_TIMEOUT_MS) {
      console.warn(`[AiPriorityMutex] Lock held by ${this.currentOwner} expired after ${elapsed}ms. Auto-releasing.`);
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      isLocked: this.isLocked,
      currentOwner: this.currentOwner,
      queueLength: this.queue.length,
      waitingTasks: this.queue.map(q => ({ name: q.taskName, priority: q.priority }))
    };
  }
}

// Global singleton instance across modules
const globalMutex = globalThis.__aiPriorityMutex || new AiPriorityMutex();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__aiPriorityMutex = globalMutex;
}

export const aiPriorityMutex = globalMutex;

export async function runWithAiLock(taskFn, priority = AI_PRIORITY.NORMAL, taskName = 'ai-task') {
  return globalMutex.runWithAiLock(taskFn, priority, taskName);
}

