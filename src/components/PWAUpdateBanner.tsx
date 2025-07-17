import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService';
import type { PWAUpdateEvent } from '../services/pwaService';

const PWAUpdateBanner: React.FC = () => {
  const [updateEvent, setUpdateEvent] = useState<PWAUpdateEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set up update callback
    pwaService.setUpdateCallback((event) => {
      setUpdateEvent(event);
      setIsVisible(true);
      
      // Auto-hide after 5 seconds for non-update events
      if (event.type !== 'update') {
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    });

    return () => {
      pwaService.setUpdateCallback(() => {});
    };
  }, []);

  const handleUpdate = async () => {
    try {
      await pwaService.updateApp();
      setIsVisible(false);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !updateEvent) {
    return null;
  }

  const getBannerStyle = () => {
    switch (updateEvent.type) {
      case 'update':
        return 'bg-yellow-400 text-black';
      case 'offline':
        return 'bg-red-500 text-white';
      case 'online':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  const getIcon = () => {
    switch (updateEvent.type) {
      case 'update':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
          </svg>
        );
      case 'online':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 ${getBannerStyle()}`}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <span className="text-sm font-medium">{updateEvent.message}</span>
        </div>
        <div className="flex items-center space-x-2">
          {updateEvent.type === 'update' && (
            <button
              onClick={handleUpdate}
              className="px-3 py-1 bg-black text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              Aktualisieren
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateBanner; 