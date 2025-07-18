import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService';
import type { PWAUpdateEvent, QueueStatus } from '../services/pwaService';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ queueLength: 0, isProcessing: false });
  const [lastEvent, setLastEvent] = useState<PWAUpdateEvent | null>(null);

  useEffect(() => {
    // Initial status
    setIsOnline(navigator.onLine);
    setQueueStatus(pwaService.getQueueStatus());

    // PWA Service callback
    const handlePWAEvent = (event: PWAUpdateEvent) => {
      setLastEvent(event);
      
      if (event.type === 'online') {
        setIsOnline(true);
      } else if (event.type === 'offline') {
        setIsOnline(false);
      } else if (event.type === 'queue_processed') {
        setQueueStatus(pwaService.getQueueStatus());
      }
    };

    pwaService.setUpdateCallback(handlePWAEvent);

    // Update queue status periodically
    const interval = setInterval(() => {
      setQueueStatus(pwaService.getQueueStatus());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Auto-hide success messages after 3 seconds
  useEffect(() => {
    if (lastEvent?.type === 'queue_processed') {
      const timer = setTimeout(() => {
        setLastEvent(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  if (isOnline && queueStatus.queueLength === 0 && !lastEvent) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      {/* Offline Status */}
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium">
          📴 Offline - Änderungen werden gespeichert und später synchronisiert
        </div>
      )}

      {/* Queue Status */}
      {queueStatus.queueLength > 0 && (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
          {queueStatus.isProcessing ? (
            <span>🔄 Synchronisiere {queueStatus.queueLength} Änderungen...</span>
          ) : (
            <span>📝 {queueStatus.queueLength} Änderungen warten auf Synchronisation</span>
          )}
        </div>
      )}

      {/* Success Message */}
      {lastEvent?.type === 'queue_processed' && (
        <div className="bg-green-500 text-white px-4 py-2 text-center text-sm font-medium">
          ✅ {lastEvent.message}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator; 