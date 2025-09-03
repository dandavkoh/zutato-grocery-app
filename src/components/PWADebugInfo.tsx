import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService';
import FontAwesomeIcon from './FontAwesomeIcon';

const PWADebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [queueStatus, setQueueStatus] = useState({ queueLength: 0, isProcessing: false });
  const [swStatus, setSwStatus] = useState({
    registered: false,
    active: false,
    databaseStats: { total: 0, active: 0, deleted: 0, queuedRequests: 0 }
  });

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const checkUpdateStatus = () => {
      setUpdateAvailable(pwaService.isUpdateAvailable());
    };

    const updateQueueStatus = async () => {
      try {
        const status = await pwaService.getQueueStatus();
        setQueueStatus(status);
      } catch (error) {
        console.error('Failed to get queue status:', error);
      }
    };

    const updateSWStatus = async () => {
      try {
        const status = await pwaService.getServiceWorkerStatus();
        setSwStatus(status);
      } catch (error) {
        console.error('Failed to get service worker status:', error);
      }
    };

    // Initial status check
    updateStatus();
    checkUpdateStatus();
    updateQueueStatus();
    updateSWStatus();

    // Set up event listeners
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Set up interval for status updates
    const interval = setInterval(() => {
      checkUpdateStatus();
      updateQueueStatus();
      updateSWStatus();
    }, 5000); // Update every 5 seconds

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      await pwaService.updateApp();
      setUpdateAvailable(false);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleProcessQueue = async () => {
    try {
      await pwaService.processQueuedRequests();
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  };

  const handleClearQueue = async () => {
    try {
      await pwaService.clearQueuedRequests();
      setQueueStatus({ queueLength: 0, isProcessing: false });
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="mt-8">
      {/* Accordion Header */}
      <div 
        onClick={toggleVisibility}
        className="bg-gray-100 border border-gray-300 text-gray-600 px-4 py-2 rounded-t-lg cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-between"
      >
        <span className="font-medium text-sm">🔧 Debug Info</span>
        <FontAwesomeIcon 
          icon={isVisible ? "chevron-down" : "chevron-right"} 
          className={`text-gray-500 transition-transform duration-200 ${isVisible ? 'rotate-0' : 'rotate-0'}`}
        />
      </div>

      {/* Accordion Content */}
      {isVisible && (
        <div className="bg-white border border-gray-300 border-t-0 p-3 max-h-80 overflow-y-auto rounded-b-lg text-sm">
          {/* Update Button */}
          {updateAvailable && (
            <div className="mb-3">
              <button
                onClick={handleUpdate}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2"
              >
                <FontAwesomeIcon icon="download" />
                Update verfügbar
              </button>
            </div>
          )}

          {/* Status Information */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${swStatus.registered ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                SW: {swStatus.registered ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {/* Queue Information */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Queue:</span>
              <div className="flex gap-1">
                <button
                  onClick={handleProcessQueue}
                  disabled={queueStatus.queueLength === 0 || queueStatus.isProcessing}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs"
                >
                  {queueStatus.isProcessing ? '⏳' : '🔄'}
                </button>
                {queueStatus.queueLength > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-gray-600 text-xs">
              <div>Items: <span className="font-mono">{queueStatus.queueLength}</span></div>
              <div>Status: {queueStatus.isProcessing ? 'Verarbeitung läuft' : 'Bereit'}</div>
            </div>
          </div>

          {/* Database Stats */}
          <div className="mb-3">
            <span className="font-medium text-gray-700 text-xs">Database:</span>
            <div className="text-gray-600 text-xs mt-1 grid grid-cols-2 gap-x-4">
              <div>Total: <span className="font-mono">{swStatus.databaseStats.total}</span></div>
              <div>Active: <span className="font-mono">{swStatus.databaseStats.active}</span></div>
              <div>Deleted: <span className="font-mono">{swStatus.databaseStats.deleted}</span></div>
              <div>Queued: <span className="font-mono">{swStatus.databaseStats.queuedRequests}</span></div>
            </div>
          </div>

          {/* Service Worker Status */}
          <div>
            <span className="font-medium text-gray-700 text-xs">Service Worker:</span>
            <div className="text-gray-600 text-xs mt-1">
              <div>Registered: {swStatus.registered ? '✓' : '✗'}</div>
              <div>Active: {swStatus.active ? '✓' : '✗'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWADebugInfo;
