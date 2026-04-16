import { globalQueueService } from './globalQueueService';
import { dexieService } from './dexieService';
import { logDebug, logError } from '../utils/logger';

export interface GlobalServiceStatus {
  // Interceptor removed
  queue: {
    queueLength: number;
    isProcessing: boolean;
    isOnline: boolean;
  };
  database: {
    total: number;
    active: number;
    deleted: number;
    queuedRequests: number;
  };
}

class GlobalServiceManager {
  private static instance: GlobalServiceManager | null = null;
  private static isInitialized = false;
  private isManagerActive = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Event handler references for cleanup
  private handleVisibilityChange = () => {
    if (!document.hidden) {
      logDebug('👁️ [GlobalServiceManager] App became visible, ensuring services are active');
      this.ensureServicesActive();
    }
  };

  private handleFocus = () => {
    logDebug('🎯 [GlobalServiceManager] Window focused, ensuring services are active');
    this.ensureServicesActive();
  };

  private handleLoad = () => {
    logDebug('📄 [GlobalServiceManager] Page loaded, ensuring services are active');
    this.ensureServicesActive();
  };

  private handleBeforeUnload = () => {
    logDebug('🚪 [GlobalServiceManager] Page unloading, services remain active');
  };

  private handlePopState = () => {
    logDebug('🔄 [GlobalServiceManager] Route changed, ensuring services are active');
    this.ensureServicesActive();
  };

  private handleHashChange = () => {
    logDebug('🔄 [GlobalServiceManager] Hash changed, ensuring services are active');
    this.ensureServicesActive();
  };

  constructor() {
    if (GlobalServiceManager.instance) {
      return GlobalServiceManager.instance;
    }
    
    if (GlobalServiceManager.isInitialized) {
      return GlobalServiceManager.instance!;
    }
    
    GlobalServiceManager.instance = this;
    GlobalServiceManager.isInitialized = true;
    this.initialize();
  }

  private initialize() {
    logDebug('🔧 [GlobalServiceManager] Initializing global service manager...');
    
    // Set up event listeners for app lifecycle
    this.setupAppLifecycleListeners();
    
    // Initialize services
    this.ensureServicesActive();
    
    this.isManagerActive = true;
    logDebug('✅ [GlobalServiceManager] Global service manager initialized');
  }

  private setupAppLifecycleListeners() {
    // Listen for visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for focus events (window focus)
    window.addEventListener('focus', this.handleFocus);

    // Listen for page load events
    window.addEventListener('load', this.handleLoad);

    // Listen for beforeunload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Listen for route changes (for SPA navigation)
    window.addEventListener('popstate', this.handlePopState);

    // Listen for hash changes (for hash-based routing)
    window.addEventListener('hashchange', this.handleHashChange);

    // Periodic health check (every 60 seconds)
    this.healthCheckInterval = setInterval(() => {
      if (this.isManagerActive) {
        logDebug('💓 [GlobalServiceManager] Periodic health check');
        this.ensureServicesActive();
      }
    }, 60000);
  }

  /**
   * Clean up event listeners and intervals to prevent memory leaks
   */
  public destroy(): void {
    logDebug('🧹 [GlobalServiceManager] Cleaning up event listeners and intervals...');
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('load', this.handleLoad);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('hashchange', this.handleHashChange);
    
    // Clear interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isManagerActive = false;
    
    logDebug('✅ [GlobalServiceManager] Cleanup completed');
  }

  private ensureServicesActive() {
    logDebug('🔧 [GlobalServiceManager] Ensuring all services are active...');
    
    // Queue service is automatically active, but we can trigger a status check
    globalQueueService.getQueueStatus().then(status => {
      if (status.queueLength > 0 && navigator.onLine && !status.isProcessing) {
        logDebug('🔄 [GlobalServiceManager] Queue has items and we\'re online, processing...');
        globalQueueService.processQueuedRequests();
      }
    });
    
    logDebug('✅ [GlobalServiceManager] All services ensured to be active');
  }

  // Public methods
  public async getGlobalStatus(): Promise<GlobalServiceStatus> {
    const queueStatus = globalQueueService.getStatus();
    const databaseStats = await dexieService.getFullStats();
    
    return {
      queue: queueStatus,
      database: databaseStats
    };
  }

  public isActive(): boolean {
    return this.isManagerActive;
  }

  public async forceServiceActivation(): Promise<void> {
    logDebug('🔄 [GlobalServiceManager] Force activating all services...');
    this.ensureServicesActive();
    
    // Force process queue if online
    if (navigator.onLine) {
      await globalQueueService.forceProcessQueue();
    }
  }

  public async getServiceHealth(): Promise<{
    manager: boolean;
    queue: boolean;
    database: boolean;
  }> {
    const queueStatus = globalQueueService.getStatus();
    
    let databaseHealthy = false;
    try {
      await dexieService.getFullStats();
      databaseHealthy = true;
    } catch (error) {
      logError('❌ [GlobalServiceManager] Database health check failed:', error);
    }
    
    return {
      manager: this.isManagerActive,
      queue: !queueStatus.isProcessing, // Queue is healthy if not stuck processing
      database: databaseHealthy
    };
  }

  public async getDetailedStatus(): Promise<{
    services: GlobalServiceStatus;
    health: Awaited<ReturnType<GlobalServiceManager['getServiceHealth']>>;
    queueDetails: Awaited<ReturnType<typeof globalQueueService['getQueueDetails']>>;
  }> {
    const [services, health, queueDetails] = await Promise.all([
      this.getGlobalStatus(),
      this.getServiceHealth(),
      globalQueueService.getQueueDetails()
    ]);
    
    return {
      services,
      health,
      queueDetails
    };
  }

  public async resetServices(): Promise<void> {
    logDebug('🔄 [GlobalServiceManager] Resetting all services...');
    
    // Clear queue
    await globalQueueService.clearQueuedRequests();
    
    logDebug('✅ [GlobalServiceManager] All services reset');
  }

  public async processQueueNow(): Promise<void> {
    logDebug('🔄 [GlobalServiceManager] Processing queue now...');
    await globalQueueService.forceProcessQueue();
  }

  public async clearQueue(): Promise<void> {
    logDebug('🗑️ [GlobalServiceManager] Clearing queue...');
    await globalQueueService.clearQueuedRequests();
  }

  // Debug methods
  public async debugServices(): Promise<void> {
    logDebug('🔍 [GlobalServiceManager] Debug information:');
    
    const status = await this.getDetailedStatus();
    logDebug('📊 [GlobalServiceManager] Service Status:', status);
    
    // Log queue details
    const queueDetails = await globalQueueService.getQueueDetails();
    logDebug('📝 [GlobalServiceManager] Queue Details:', queueDetails);
    
    // Log database stats
    const dbStats = await dexieService.getFullStats();
    logDebug('💾 [GlobalServiceManager] Database Stats:', dbStats);
  }
}

// Export singleton instance
export const globalServiceManager = new GlobalServiceManager();
