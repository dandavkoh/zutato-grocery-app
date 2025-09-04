import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useListsDexie } from '../hooks/useListsDexie';
import { useAuth } from '../contexts/AuthContext';
import InvitationRedeem from '../components/InvitationRedeem';
import PWADebugInfo from '../components/PWADebugInfo';
import { environment } from '../config/environment';

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // Use the lists hook
  const { lists, loading, error, refetch } = useListsDexie();
  
  // Check if user has reached the maximum number of lists
  const MAX_LISTS = environment.maxListsPerUser;
  const hasReachedMaxLists = lists.length >= MAX_LISTS;

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullThreshold = 80; // Distance in pixels to trigger refresh

  useEffect(() => {
    dispatch(setHeader({
      title: 'Meine Listen',
      showBack: false,
      background: '',
      showFilterIcon: false,
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only track touch start if we're at the very top of the page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      // Don't set isPulling to true yet - wait for actual downward movement
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Only handle pull-to-refresh if we're at the top and have a start position
    if (window.scrollY > 0 || startY === 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    // Only activate pull-to-refresh for downward pulls (positive distance)
    // And only if the distance is significant enough (more than 10px)
    if (distance > 10) {
      if (!isPulling) {
        setIsPulling(true); // Only set pulling state when actually pulling down
      }
      
      // Only prevent default if the event is cancelable
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        setPullDistance(Math.min(distance * 0.5, pullThreshold * 1.5)); // Dampen the pull
      });
    } else if (distance < -10) {
      // If pulling up significantly (negative distance), reset pull state
      requestAnimationFrame(() => {
        setPullDistance(0);
        setIsPulling(false);
      });
    }
  }, [isPulling, startY, pullThreshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) {
      // Reset start position if we weren't pulling
      setStartY(0);
      return;
    }
    
    // Immediately reset pulling state and distance
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
    
    if (pullDistance >= pullThreshold) {
      // Trigger refresh
      setIsRefreshing(true);
      
      try {
        // Use the refetch function to refresh lists from Supabase
        await refetch();
        
        // Wait a bit to show the refresh animation
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error refreshing:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Multiple safety resets to ensure pullDistance is always 0
    setTimeout(() => setPullDistance(0), 10);
    setTimeout(() => setPullDistance(0), 50);
    setTimeout(() => setPullDistance(0), 100);
    setTimeout(() => setPullDistance(0), 200);
  }, [isPulling, pullDistance, pullThreshold, refetch]);

  // Add touch event listeners
  useEffect(() => {
    const options = { passive: false, capture: false };
    
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, options);
      document.removeEventListener('touchmove', handleTouchMove, options);
      document.removeEventListener('touchend', handleTouchEnd, options);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Safety effect to ensure pullDistance is always correct
  useEffect(() => {
    // If we're not pulling and not refreshing, ensure pullDistance is 0
    if (!isPulling && !isRefreshing && pullDistance !== 0) {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, pullDistance]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pull-to-Refresh Container - includes ALL content */}
      <div 
        className="will-change-transform"
        style={{ 
          transform: `translate3d(0, ${pullDistance}px, 0)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {/* Pull-to-Refresh Indicator - only visible when pulling */}
        {isPulling && !isRefreshing && (
          <div 
            className="flex items-center justify-center py-4 bg-gray-50"
            style={{ 
              opacity: Math.min(pullDistance / pullThreshold, 1)
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="text-orange-600"
                style={{ 
                  transform: `rotate(${Math.min(pullDistance / pullThreshold, 1) * 180}deg)`,
                  transition: 'transform 0.2s ease'
                }}
              >
                <FontAwesomeIcon 
                  icon="fa-arrow-down" 
                  size="lg"
                />
              </div>
              <span className="text-orange-600 text-sm font-medium">
                {pullDistance >= pullThreshold ? 'Loslassen zum Aktualisieren' : 'Ziehen zum Aktualisieren'}
              </span>
            </div>
          </div>
        )}

        {/* Refresh Loading Indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              <span className="text-orange-600 text-sm font-medium">Aktualisiere...</span>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-gray-600 mb-3">Listen anzeigen für</p>
        <div className="flex items-center bg-white rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
          <div className="w-12 h-12 rounded-full mr-4 border-2 border-orange-500 bg-orange-500 flex items-center justify-center">
            <FontAwesomeIcon icon="fa-user" size="xl" style="regular" className="text-white"/>
          </div>
          <div className="flex-1">
            <div className="text-gray-900 font-semibold">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.lastName || 'Benutzer'
              }
            </div>
            <div className="text-gray-500 text-sm">{user?.email || 'E-Mail nicht verfügbar'}</div>
          </div>
          <button 
            onClick={() => navigate('/account')}
            className="text-gray-600 hover:text-orange-600 text-2xl"
          >
            <FontAwesomeIcon icon="fa-pen" size="xl" style="regular"/>
          </button>
        </div>

        {/* Info banner when list limit is reached */}
        {hasReachedMaxLists && (
          <div className="mb-4">
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg px-4 py-3 flex items-start gap-3">
              <FontAwesomeIcon icon="fa-circle-info" className="mt-0.5" />
              <div className="text-sm">
                Du hast das Maximum von {MAX_LISTS} Einkaufslisten erreicht. Bitte lösche eine bestehende Liste, bevor du eine neue erstellst.
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => navigate('/create-list')}
          disabled={hasReachedMaxLists}
          className={`w-full font-semibold py-3 rounded-lg mb-6 flex items-center justify-center text-lg gap-2 ${
            hasReachedMaxLists
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          {hasReachedMaxLists ? 'Listenlimit erreicht' : 'Neue Einkaufsliste'}
        </button>
        
        <InvitationRedeem onSuccess={() => {
          if (refetch) {
            refetch();
          }
        }} />

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-700">Lade Listen...</div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <div className="text-red-600">Fehler beim Laden der Listen</div>
          </div>
        )}
        
        {!loading && !error && lists && lists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list: any) => (
              <div key={list.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-stretch">
                  <div
                    className="flex-1 cursor-pointer p-5"
                    onClick={() => {
                      navigate(`/shopping-list/${list.id}`);
                    }}
                  >
                    <div>
                      <div className="text-gray-900 text-lg font-semibold mb-2">{list.name}</div>
                      <div className="flex items-center gap-4 text-gray-600 text-sm">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon="fa-clipboard-list-check" size="base" style="regular"/>
                          {/* {new Date(list.created_at).toLocaleDateString('de-DE')} */}
                          TODO 123
                        </span>
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon="fa-user" size="base" style="regular"/>
                          {/* {list.created_by} */}
                          TODO 123
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-px bg-gray-200 my-4"></div>
                  <div 
                    className="flex items-center justify-center w-16 cursor-pointer text-gray-600 hover:text-orange-600"
                    onClick={() => {
                      navigate('/edit-list', { state: { list } });
                    }}
                  >
                    <FontAwesomeIcon icon="fa-pen" size="base" style="regular"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && !error && (!lists || lists.length === 0) && (
          <div className="text-center py-8">
            <div className="text-gray-500">Keine Listen gefunden</div>
          </div>
        )}
        
        {/* PWA Debug Info - ganz unten */}
        <PWADebugInfo />
        </div>
      </div>
    </div>
  );
};

export default ListsPage; 