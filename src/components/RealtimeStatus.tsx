import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import FontAwesomeIcon from './FontAwesomeIcon';
import { realtimeService } from '../services/realtimeService';

interface RealtimeStatusProps {
  isConnected?: boolean;
  listId?: string;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ isConnected: propIsConnected, listId: propListId }) => {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(propIsConnected ?? realtimeService.isConnected());
  const [currentListId, setCurrentListId] = useState<string | null>(propListId || null);

  useEffect(() => {
    // Extract listId from current path if not provided
    if (!propListId) {
      const pathParts = location.pathname.split('/');
      const listIdIndex = pathParts.findIndex(part => part === 'shopping-list') + 1;
      const listId = pathParts[listIdIndex];
      setCurrentListId(listId || null);
    } else {
      setCurrentListId(propListId);
    }
  }, [location.pathname, propListId]);

  useEffect(() => {
    // Update connection status
    const updateStatus = () => {
      setIsConnected(realtimeService.isConnected());
    };

    // Listen for online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Initial status
    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Only show if we're on a shopping list route
  if (!currentListId || !location.pathname.startsWith('/shopping-list/')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-medium
        ${isConnected 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
        }
      `}>
        <FontAwesomeIcon 
          icon={isConnected ? 'fa-wifi' : 'fa-wifi-slash'} 
          className="text-xs"
        />
        <span className="hidden sm:inline">
          {isConnected ? 'Live Sync' : 'Offline'}
        </span>
      </div>
    </div>
  );
};

export default RealtimeStatus; 