import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import { ListsController } from '../api/supabaseApi';
import type { List, ListMember } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import InvitationManager from '../components/InvitationManager';
import { useAuth } from '../contexts/AuthContext';
import { sentryErrorService } from '../services/sentryErrorService';
import { logDebug, logError } from '../utils/logger';



const EditListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // Get list data from navigation state
  const list = location.state?.list as List | undefined;
  const listsController = new ListsController();
  
  // Local state
  const [listName, setListName] = useState(list?.name || '');
  const [originalListName, setOriginalListName] = useState(list?.name || '');
  const [members, setMembers] = useState<ListMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: list?.name || 'Liste bearbeiten',
      showBack: true,
      background: '',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, list?.name]);

  // Listen for online/offline to gate loading of invitations/members
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate('/lists');
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);



  // If no list data is available, redirect
  if (!list) {
    navigate('/lists');
    return null;
  }



  const handleSaveListName = async () => {
    if (!list || !listName.trim()) {
      return;
    }

    // Don't save if name hasn't actually changed from original
    if (listName.trim() === originalListName) {
      return;
    }

    try {
      logDebug('Saving list name:', { id: list.id, name: listName.trim() });
      
      // Fire & forget - don't await the result
      listsController.updateList(list.id, { name: listName.trim() }).catch(error => {
        logError('Failed to save list name (fire & forget):', error);
      });
      
      logDebug('List name save initiated (fire & forget)');
      
      // Update the header title immediately
      dispatch(setHeader({
        title: listName.trim(),
        showBack: true,
        background: '',
      }));
      
      // Update the original list name so the button becomes inactive
      setOriginalListName(listName.trim());
    } catch (error) {
      logError('Unexpected error saving list name:', error);
      sentryErrorService.reportApiError(error, {
        url: 'edit-list-save',
        method: 'PUT',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveListName();
    }
  };

  // Check if the save button should be active
  const canSaveTitle = listName.trim() && listName.trim() !== originalListName;

  // Load members from API
  const loadMembers = async () => {
    if (!list || !isOnline) return;
    
    setMembersLoading(true);
    try {
      const response = await listsController.getListMembers(list.id);
      if (response.error) {
        logError('Failed to load members:', response.error);
      } else {
        setMembers(response.data || []);
      }
    } catch (error) {
      logError('Unexpected error loading members:', error);
      sentryErrorService.reportApiError(error, {
        url: 'edit-list-members',
        method: 'GET',
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Load members on mount
  useEffect(() => {
    if (isOnline) {
      loadMembers();
    }
  }, [list?.id, isOnline]);

  // Sort members: current user first, then others
  const sortedMembers = members.sort((a, b) => {
    if (a.user_id === user?.id) return -1;
    if (b.user_id === user?.id) return 1;
    return 0;
  });

  // Check if current user is the list owner
  const isListOwner = list?.created_by === user?.id;

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      alert('Du kannst dich nicht selbst aus der Liste entfernen!');
      return;
    }
    
    // Member removal not yet implemented
  };

  const handleDeleteList = async () => {
    if (showDeleteConfirm) {
      try {
        logDebug('Deleting list:', list.id);
        const response = await listsController.deleteList(list.id);
        
        if (response.error) {
          logError('Failed to delete list:', response.error);
          alert('Fehler beim Löschen der Liste: ' + response.error);
        } else {
          navigate('/lists');
        }
      } catch (error) {
        logError('Unexpected error deleting list:', error);
        sentryErrorService.reportApiError(error, {
          url: 'edit-list-delete',
          method: 'DELETE',
        });
        alert('Unerwarteter Fehler beim Löschen der Liste');
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        {/* List Name Section */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label className="block text-gray-900 text-sm font-semibold mb-3">
            Name der Einkaufsliste
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FontAwesomeIcon icon="fa-tag" size="base" style="regular"/>
            </div>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-gray-50 border border-gray-400 rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40"
              placeholder="Listenname eingeben (Enter zum Speichern)"
            />
            {listName && (
              <button
                onClick={() => setListName('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon="fa-times" size="base" style="regular"/>
              </button>
            )}
          </div>
          <button
            onClick={handleSaveListName}
            disabled={!canSaveTitle}
            className={`w-full font-semibold py-3 rounded-lg transition-colors mt-3 ${
              canSaveTitle 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Titel ändern
          </button>
        </div>

        {/* Invitation Manager Section - Only for list owners */}
        {isListOwner && (
          <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
            {isOnline ? (
              <InvitationManager listId={list.id} />
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon="fa-wifi-slash" size="base" className="text-gray-500" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">Keine Internetverbindung</div>
                  <div className="text-gray-600 text-sm">Stelle eine Verbindung her, um Einladungen zu verwalten. Wird automatisch geladen, sobald du online bist.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members Section */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label className="block text-gray-900 text-sm font-semibold mb-3">
            Mitgliederliste
          </label>
          {!isOnline ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg">
                <FontAwesomeIcon icon="fa-wifi-slash" size="base" className="text-gray-500" />
                <span>Mitglieder können offline nicht geladen werden. Bitte Internetverbindung herstellen.</span>
              </div>
            </div>
          ) : membersLoading ? (
            <div className="text-center py-4">
              <div className="text-gray-700">Lade Mitglieder...</div>
            </div>
          ) : (
            <div className="space-y-3 mb-2">
              {sortedMembers.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon="fa-user" size="base" style="regular" className="text-white"/>
                      </div>
                      <div>
                        {isCurrentUser ? (
                          <>
                            <div className="text-gray-900 font-medium">
                              {user?.firstName && user?.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user?.firstName || user?.lastName || 'Du'
                              }
                            </div>
                            <div className="text-gray-600 text-sm">{user?.email}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-gray-900 font-medium">User ID: {member.user_id}</div>
                            <div className="text-gray-600 text-sm">Rolle: {member.role === 'owner' ? 'Besitzer' : 'Mitglied'}</div>
                          </>
                        )}
                        <div className="text-gray-500 text-xs">Beigetreten: {new Date(member.accepted_at).toLocaleDateString('de-DE')}</div>
                      </div>
                    </div>
                    {member.role !== 'owner' && !isCurrentUser && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                        title="Mitglied entfernen"
                      >
                        <FontAwesomeIcon icon="fa-trash" size="base" style="regular"/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleDeleteList}
            className={`w-full font-semibold py-3 rounded-lg transition-colors ${
              showDeleteConfirm 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-white border border-gray-200 text-gray-900 hover:bg-red-50'
            }`}
          >
            {showDeleteConfirm ? 'Wirklich löschen?' : 'Liste löschen'}
          </button>
          
          {showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full bg-white border border-gray-200 text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditListPage; 