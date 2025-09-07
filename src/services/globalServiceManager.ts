import { globalInterceptorService } from './globalInterceptorService';
import { globalQueueService } from './globalQueueService';
import { dexieService } from './dexieService';

export interface GlobalServiceStatus {
  interceptor: {
    isActive: boolean;
    hasOriginalFetch: boolean;
    hasSupabaseInterceptor: boolean;
  };
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
    console.log('🔧 [GlobalServiceManager] Initializing global service manager...');
    
    // Set up event listeners for app lifecycle
    this.setupAppLifecycleListeners();
    
    // Initialize services
    this.ensureServicesActive();
    
    this.isManagerActive = true;
    console.log('✅ [GlobalServiceManager] Global service manager initialized');
  }

  private setupAppLifecycleListeners() {
    // Listen for visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ [GlobalServiceManager] App became visible, ensuring services are active');
        this.ensureServicesActive();
      }
    });

    // Listen for focus events (window focus)
    window.addEventListener('focus', () => {
      console.log('🎯 [GlobalServiceManager] Window focused, ensuring services are active');
      this.ensureServicesActive();
    });

    // Listen for page load events
    window.addEventListener('load', () => {
      console.log('📄 [GlobalServiceManager] Page loaded, ensuring services are active');
      this.ensureServicesActive();
    });

    // Listen for beforeunload
    window.addEventListener('beforeunload', () => {
      console.log('🚪 [GlobalServiceManager] Page unloading, services remain active');
    });

    // Listen for route changes (for SPA navigation)
    window.addEventListener('popstate', () => {
      console.log('🔄 [GlobalServiceManager] Route changed, ensuring services are active');
      this.ensureServicesActive();
    });

    // Listen for hash changes (for hash-based routing)
    window.addEventListener('hashchange', () => {
      console.log('🔄 [GlobalServiceManager] Hash changed, ensuring services are active');
      this.ensureServicesActive();
    });

    // Periodic health check (every 60 seconds)
    setInterval(() => {
      if (this.isManagerActive) {
        console.log('💓 [GlobalServiceManager] Periodic health check');
        this.ensureServicesActive();
      }
    }, 60000);
  }

  private ensureServicesActive() {
    console.log('🔧 [GlobalServiceManager] Ensuring all services are active...');
    
    // Ensure interceptor service is active
    globalInterceptorService.ensureInterceptors();
    
    // Queue service is automatically active, but we can trigger a status check
    globalQueueService.getQueueStatus().then(status => {
      if (status.queueLength > 0 && navigator.onLine && !status.isProcessing) {
        console.log('🔄 [GlobalServiceManager] Queue has items and we\'re online, processing...');
        globalQueueService.processQueuedRequests();
      }
    });
    
    console.log('✅ [GlobalServiceManager] All services ensured to be active');
  }

  // Public methods
  public async getGlobalStatus(): Promise<GlobalServiceStatus> {
    const interceptorStatus = globalInterceptorService.getStatus();
    const queueStatus = globalQueueService.getStatus();
    const databaseStats = await dexieService.getFullStats();
    
    return {
      interceptor: interceptorStatus,
      queue: queueStatus,
      database: databaseStats
    };
  }

  public isActive(): boolean {
    return this.isManagerActive;
  }

  public async forceServiceActivation(): Promise<void> {
    console.log('🔄 [GlobalServiceManager] Force activating all services...');
    this.ensureServicesActive();
    
    // Force process queue if online
    if (navigator.onLine) {
      await globalQueueService.forceProcessQueue();
    }
  }

  public async getServiceHealth(): Promise<{
    manager: boolean;
    interceptor: boolean;
    queue: boolean;
    database: boolean;
  }> {
    const interceptorStatus = globalInterceptorService.getStatus();
    const queueStatus = globalQueueService.getStatus();
    
    let databaseHealthy = false;
    try {
      await dexieService.getFullStats();
      databaseHealthy = true;
    } catch (error) {
      console.error('❌ [GlobalServiceManager] Database health check failed:', error);
    }
    
    return {
      manager: this.isManagerActive,
      interceptor: interceptorStatus.isActive,
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
    console.log('🔄 [GlobalServiceManager] Resetting all services...');
    
    // Clear queue
    await globalQueueService.clearQueuedRequests();
    
    // Re-initialize interceptor
    globalInterceptorService.ensureInterceptors();
    
    console.log('✅ [GlobalServiceManager] All services reset');
  }

  public async processQueueNow(): Promise<void> {
    console.log('🔄 [GlobalServiceManager] Processing queue now...');
    await globalQueueService.forceProcessQueue();
  }

  public async clearQueue(): Promise<void> {
    console.log('🗑️ [GlobalServiceManager] Clearing queue...');
    await globalQueueService.clearQueuedRequests();
  }

  // Debug methods
  public async debugServices(): Promise<void> {
    console.log('🔍 [GlobalServiceManager] Debug information:');
    
    const status = await this.getDetailedStatus();
    console.log('📊 [GlobalServiceManager] Service Status:', status);
    
    // Log interceptor details
    const interceptorStatus = globalInterceptorService.getStatus();
    console.log('🔍 [GlobalServiceManager] Interceptor Status:', interceptorStatus);
    
    // Log queue details
    const queueDetails = await globalQueueService.getQueueDetails();
    console.log('📝 [GlobalServiceManager] Queue Details:', queueDetails);
    
    // Log database stats
    const dbStats = await dexieService.getFullStats();
    console.log('💾 [GlobalServiceManager] Database Stats:', dbStats);
  }
}

// Export singleton instance
export const globalServiceManager = new GlobalServiceManager();
