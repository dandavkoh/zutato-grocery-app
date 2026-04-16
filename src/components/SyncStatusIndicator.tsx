import React, { useState, useEffect } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { dexieService } from '../services/dexieService';
import FontAwesomeIcon from './FontAwesomeIcon';
import DeadLetterQueueModal from './DeadLetterQueueModal';

/**
 * Visual sync status indicator component
 * Shows online/offline status, sync progress, pending changes count, and last sync time
 * Positioned in the top-right corner with a clean, non-intrusive design
 */
const SyncStatusIndicator: React.FC = () => {
  const { isOnline, queueLength, isSyncing, lastSyncTime } = useSyncStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [dlqCount, setDlqCount] = useState(0);
  const [showDLQModal, setShowDLQModal] = useState(false);

  // Load dead letter queue count
  useEffect(() => {
    const loadDLQCount = async () => {
      const count = await dexieService.getDeadLetterQueueCount();
      setDlqCount(count);
    };

    loadDLQCount();

    // Refresh DLQ count every 30 seconds
    const interval = setInterval(loadDLQCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // Determine the status icon and color
  const getStatusIcon = () => {
    if (!isOnline) {
      return { icon: 'fa-wifi-slash', color: 'text-red-500', bgColor: 'bg-red-50', label: 'Offline' };
    }
    if (isSyncing) {
      return { icon: 'fa-cloud-arrow-up', color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Syncing' };
    }
    if (queueLength > 0) {
      return { icon: 'fa-cloud', color: 'text-yellow-500', bgColor: 'bg-yellow-50', label: 'Pending' };
    }
    return { icon: 'fa-circle-check', color: 'text-green-500', bgColor: 'bg-green-50', label: 'Synced' };
  };

  const status = getStatusIcon();

  // Format last sync time
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 ${status.bgColor} hover:shadow-md transition-all duration-200`}
        aria-label={`Sync status: ${status.label}`}
        aria-expanded={showDetails}
      >
        <FontAwesomeIcon 
          icon={status.icon} 
          className={`${status.color} ${isSyncing ? 'animate-pulse' : ''}`}
          size="sm"
        />
        {queueLength > 0 && (
          <span className={`text-xs font-semibold ${status.color}`}>
            {queueLength}
          </span>
        )}
        {/* DLQ warning badge */}
        {dlqCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            !
          </span>
        )}
      </button>

      {/* Details popover */}
      {showDetails && (
        <>
          {/* Backdrop to close popover */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
            aria-hidden="true"
          />
          
          {/* Popover content */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync Status</h3>
              
              {/* Online status */}
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon 
                  icon={isOnline ? 'fa-wifi' : 'fa-wifi-slash'} 
                  className={isOnline ? 'text-green-500' : 'text-red-500'}
                  size="sm"
                />
                <span className="text-sm text-gray-700">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Queue status */}
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon 
                  icon="fa-clock" 
                  className="text-gray-500"
                  size="sm"
                />
                <span className="text-sm text-gray-700">
                  {queueLength === 0 
                    ? 'Alle Änderungen synchronisiert' 
                    : `${queueLength} ausstehende Änderung${queueLength !== 1 ? 'en' : ''}`}
                </span>
              </div>

              {/* Syncing indicator */}
              {isSyncing && (
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon 
                    icon="fa-spinner" 
                    className="text-blue-500 animate-spin"
                    size="sm"
                  />
                  <span className="text-sm text-gray-700">
                    Synchronisiere gerade...
                  </span>
                </div>
              )}

              {/* Last sync time */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <FontAwesomeIcon 
                  icon="fa-history" 
                  className="text-gray-400"
                  size="sm"
                  style="regular"
                />
                <span className="text-xs text-gray-500">
                  Letzte Synchronisierung: {formatLastSyncTime()}
                </span>
              </div>

              {/* Offline warning */}
              {!isOnline && queueLength > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  Änderungen werden automatisch synchronisiert, sobald Sie wieder online sind
                </div>
              )}

              {/* Dead letter queue warning */}
              {dlqCount > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon 
                        icon="fa-exclamation-triangle" 
                        className="text-red-600"
                        size="sm"
                      />
                      <span className="text-sm font-medium text-red-900">
                        {dlqCount} Fehlgeschlagene Anfrage{dlqCount !== 1 ? 'n' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-red-700 mb-2">
                    Einige Anfragen sind nach mehreren Versuchen fehlgeschlagen und müssen manuell überprüft werden.
                  </p>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setShowDLQModal(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors"
                  >
                    Fehlgeschlagene Anfragen anzeigen
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Dead Letter Queue Modal */}
      <DeadLetterQueueModal
        isOpen={showDLQModal}
        onClose={() => {
          setShowDLQModal(false);
          // Refresh DLQ count after closing modal
          dexieService.getDeadLetterQueueCount().then(setDlqCount);
        }}
      />
    </div>
  );
};

export default SyncStatusIndicator;
