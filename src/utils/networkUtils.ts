export class NetworkMonitor {
  private static isOnlineCache: boolean = navigator.onLine;
  private static lastCheckTime: number = 0;
  private static checkInProgress: Promise<boolean> | null = null;
  
  /**
   * Actively verify network connectivity by pinging a fast endpoint
   */
  static async isOnline(): Promise<boolean> {
    // Return cached value if checked recently (within 5 seconds)
    const now = Date.now();
    if (now - this.lastCheckTime < 5000) {
      return this.isOnlineCache;
    }
    
    // If check already in progress, wait for it
    if (this.checkInProgress) {
      return this.checkInProgress;
    }
    
    this.checkInProgress = this.performConnectivityCheck();
    const result = await this.checkInProgress;
    this.checkInProgress = null;
    
    return result;
  }
  
  private static async performConnectivityCheck(): Promise<boolean> {
    // First check navigator.onLine for quick offline detection
    if (!navigator.onLine) {
      this.isOnlineCache = false;
      this.lastCheckTime = Date.now();
      return false;
    }
    
    try {
      // Try to reach Supabase or a lightweight endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      this.isOnlineCache = response.ok;
      this.lastCheckTime = Date.now();
      return response.ok;
    } catch (error) {
      // Network error = offline
      this.isOnlineCache = false;
      this.lastCheckTime = Date.now();
      return false;
    }
  }
  
  /**
   * Get cached online status (instant, no network check)
   */
  static getCachedStatus(): boolean {
    return this.isOnlineCache;
  }
}
