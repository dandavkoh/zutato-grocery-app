import React, { useState, useEffect } from 'react';
import { globalServiceManager } from '../services/globalServiceManager';
import { globalQueueService } from '../services/globalQueueService';

interface ServiceStatus {
  services: {
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
  };
  health: {
    manager: boolean;
    queue: boolean;
    database: boolean;
  };
  queueDetails: {
    total: number;
    byMethod: Record<string, number>;
  };
}

const GlobalServicesDebugInfo: React.FC = () => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshStatus = async () => {
    try {
      const detailedStatus = await globalServiceManager.getDetailedStatus();
      setStatus(detailedStatus);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to get service status:', error);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleProcessQueue = async () => {
    try {
      await globalServiceManager.processQueueNow();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  };

  const handleClearQueue = async () => {
    try {
      await globalServiceManager.clearQueue();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  };

  const handleResetServices = async () => {
    try {
      await globalServiceManager.resetServices();
      await refreshStatus();
    } catch (error) {
      console.error('Failed to reset services:', error);
    }
  };

  const handleDebugServices = async () => {
    try {
      await globalServiceManager.debugServices();
    } catch (error) {
      console.error('Failed to debug services:', error);
    }
  };

  if (!status) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Global Services Debug</h3>
        <p>Loading service status...</p>
      </div>
    );
  }

  const getHealthColor = (healthy: boolean) => healthy ? 'text-green-600' : 'text-red-600';
  const getHealthIcon = (healthy: boolean) => healthy ? '✅' : '❌';

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Global Services Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={refreshStatus}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl ${getHealthColor(status.health.manager)}`}>
            {getHealthIcon(status.health.manager)}
          </div>
          <div className="text-sm font-medium">Manager</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl ${getHealthColor(status.health.queue)}`}>
            {getHealthIcon(status.health.queue)}
          </div>
          <div className="text-sm font-medium">Queue</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl ${getHealthColor(status.health.database)}`}>
            {getHealthIcon(status.health.database)}
          </div>
          <div className="text-sm font-medium">Database</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded">
          <div className="text-lg font-bold text-blue-600">{status.services.queue.queueLength}</div>
          <div className="text-sm text-gray-600">Queued Requests</div>
        </div>
        <div className="bg-white p-3 rounded">
          <div className="text-lg font-bold text-green-600">{status.services.database.active}</div>
          <div className="text-sm text-gray-600">Active Items</div>
        </div>
        <div className="bg-white p-3 rounded">
          <div className="text-lg font-bold text-orange-600">{status.services.database.deleted}</div>
          <div className="text-sm text-gray-600">Deleted Items</div>
        </div>
        <div className="bg-white p-3 rounded">
          <div className={`text-lg font-bold ${status.services.queue.isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {status.services.queue.isOnline ? 'Online' : 'Offline'}
          </div>
          <div className="text-sm text-gray-600">Connection</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleProcessQueue}
          disabled={status.services.queue.queueLength === 0 || status.services.queue.isProcessing}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
        >
          Process Queue ({status.services.queue.queueLength})
        </button>
        <button
          onClick={handleClearQueue}
          disabled={status.services.queue.queueLength === 0}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-400"
        >
          Clear Queue
        </button>
        <button
          onClick={handleResetServices}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
        >
          Reset Services
        </button>
        <button
          onClick={handleDebugServices}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
        >
          Debug Console
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Interceptor removed */}

          {/* Queue Details */}
          <div className="bg-white p-4 rounded">
            <h4 className="font-semibold mb-2">Queue Service</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Queue Length:</span>
                <span className="ml-2 font-bold">{status.services.queue.queueLength}</span>
              </div>
              <div>
                <span className="font-medium">Processing:</span>
                <span className={`ml-2 ${getHealthColor(!status.services.queue.isProcessing)}`}>
                  {status.services.queue.isProcessing ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Online:</span>
                <span className={`ml-2 ${getHealthColor(status.services.queue.isOnline)}`}>
                  {status.services.queue.isOnline ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            {status.queueDetails.total > 0 && (
              <div className="mt-3">
                <h5 className="font-medium mb-2">Queue by Method:</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(status.queueDetails.byMethod).map(([method, count]) => (
                    <span key={method} className="px-2 py-1 bg-gray-200 rounded text-xs">
                      {method}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Database Details */}
          <div className="bg-white p-4 rounded">
            <h4 className="font-semibold mb-2">Database Service</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Items:</span>
                <span className="ml-2 font-bold">{status.services.database.total}</span>
              </div>
              <div>
                <span className="font-medium">Active Items:</span>
                <span className="ml-2 font-bold text-green-600">{status.services.database.active}</span>
              </div>
              <div>
                <span className="font-medium">Deleted Items:</span>
                <span className="ml-2 font-bold text-orange-600">{status.services.database.deleted}</span>
              </div>
              <div>
                <span className="font-medium">Queued Requests:</span>
                <span className="ml-2 font-bold text-blue-600">{status.services.database.queuedRequests}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalServicesDebugInfo;
