export class RequestCoalescer {
  private pending = new Map<string, {
    timer: NodeJS.Timeout;
    latestData: any;
    resolve: (value: any) => void;
  }>();
  
  /**
   * Coalesce rapid updates to the same resource
   */
  async coalesce<T>(
    key: string,
    data: T,
    executor: (data: T) => Promise<any>,
    delayMs: number = 500
  ): Promise<any> {
    return new Promise((resolve) => {
      // Clear existing timer for this key
      if (this.pending.has(key)) {
        const existing = this.pending.get(key)!;
        clearTimeout(existing.timer);
      }
      
      // Set new timer
      const timer = setTimeout(async () => {
        const entry = this.pending.get(key);
        this.pending.delete(key);
        
        if (entry) {
          try {
            const result = await executor(entry.latestData);
            entry.resolve(result);
          } catch (error) {
            entry.resolve(error);
          }
        }
      }, delayMs);
      
      this.pending.set(key, {
        timer,
        latestData: data,
        resolve
      });
    });
  }
  
  /**
   * Cancel a pending coalesced request
   */
  cancel(key: string): void {
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.pending.delete(key);
    }
  }
  
  /**
   * Check if a key has a pending request
   */
  hasPending(key: string): boolean {
    return this.pending.has(key);
  }
  
  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }
  
  /**
   * Clear all pending requests
   */
  clearAll(): void {
    for (const [key, entry] of this.pending.entries()) {
      clearTimeout(entry.timer);
    }
    this.pending.clear();
  }
}

export const requestCoalescer = new RequestCoalescer();
