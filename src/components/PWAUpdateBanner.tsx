import React, { useState, useEffect } from 'react';
import { pwaService } from '../services/pwaService';
import type { PWAUpdateEvent } from '../services/pwaService';
import FontAwesomeIcon from './FontAwesomeIcon';

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
          <FontAwesomeIcon icon="fa-wrench" size="base" style="regular"/>
        );
      case 'offline':
        return (
          <FontAwesomeIcon icon="fa-wifi-slash" size="base" style="regular"/>
        );
      case 'online':
        return (
          <FontAwesomeIcon icon="fa-wifi" size="base" style="regular"/>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-[200] p-4 ${getBannerStyle()}`}>
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
            <FontAwesomeIcon icon="fa-xmark" size="base" style="regular"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateBanner; 