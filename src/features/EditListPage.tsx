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



const EditListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  
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
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, list?.name]);

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
      console.log('Saving list name:', { id: list.id, name: listName.trim() });
      
      // Fire & forget - don't await the result
      listsController.updateList(list.id, { name: listName.trim() }).catch(error => {
        console.error('Failed to save list name (fire & forget):', error);
      });
      
      console.log('List name save initiated (fire & forget)');
      
      // Update the header title immediately
      dispatch(setHeader({
        title: listName.trim(),
        showBack: true,
        background: 'bg-yellow-400',
      }));
      
      // Update the original list name so the button becomes inactive
      setOriginalListName(listName.trim());
    } catch (error) {
      console.error('Unexpected error saving list name:', error);
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
    if (!list) return;
    
    setMembersLoading(true);
    try {
      const response = await listsController.getListMembers(list.id);
      if (response.error) {
        console.error('Failed to load members:', response.error);
      } else {
        setMembers(response.data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, [list?.id]);

  // Sort members: current user first, then others
  const sortedMembers = members.sort((a, b) => {
    if (a.user_id === user?.id) return -1;
    if (b.user_id === user?.id) return 1;
    return 0;
  });

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      alert('Du kannst dich nicht selbst aus der Liste entfernen!');
      return;
    }
    
    // TODO: Implement actual member removal via API
    console.log('Delete member:', memberId);
  };

  const handleDeleteList = async () => {
    if (showDeleteConfirm) {
      try {
        console.log('Deleting list:', list.id);
        const response = await listsController.deleteList(list.id);
        
        if (response.error) {
          console.error('Failed to delete list:', response.error);
          alert('Fehler beim Löschen der Liste: ' + response.error);
        } else {
          navigate('/lists');
        }
      } catch (error) {
        console.error('Unexpected error deleting list:', error);
        alert('Unerwarteter Fehler beim Löschen der Liste');
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="flex-1">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        {/* List Name Section */}
        <div className="mb-8">
          <label className="block text-white text-sm font-medium mb-3 uppercase tracking-wide">
            NAME DER EINKAUFSLISTE
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon icon="fa-tag" size="base" style="regular" className="text-yellow-400"/>
            </div>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-neutral-900 border border-gray-700 rounded-2xl pl-12 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
              placeholder="Listenname eingeben (Enter zum Speichern)"
            />
            {listName && (
              <button
                onClick={() => setListName('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon="fa-times" size="base" style="regular"/>
              </button>
            )}
          </div>
          <button
            onClick={handleSaveListName}
            disabled={!canSaveTitle}
            className={`w-full font-semibold py-3 rounded-2xl transition-colors mt-3 ${
              canSaveTitle 
                ? 'bg-yellow-400 text-white hover:bg-yellow-500' 
                : 'bg-neutral-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            TITEL ÄNDERN
          </button>
        </div>

        {/* Invitation Manager Section */}
        <InvitationManager listId={list.id} />

        {/* Members Section */}
        <div className="mb-8">
          <label className="block text-white text-sm font-medium mb-3 uppercase tracking-wide">
            MITGLIEDERLISTE
          </label>
          {membersLoading ? (
            <div className="text-center py-4">
              <div className="text-white">Lade Mitglieder...</div>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {sortedMembers.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between bg-neutral-900 rounded-2xl p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                          <FontAwesomeIcon icon="fa-user" size="base" style="regular" className="text-white"/>
                        </div>
                        <div>
                          {isCurrentUser ? (
                            <>
                              <div className="text-white font-medium">
                                {user?.firstName && user?.lastName 
                                  ? `${user.firstName} ${user.lastName}`
                                  : user?.firstName || user?.lastName || 'Du'
                                }
                              </div>
                              <div className="text-gray-400 text-sm">{user?.email}</div>
                            </>
                          ) : (
                            <>
                              <div className="text-white font-medium">User ID: {member.user_id}</div>
                              <div className="text-gray-400 text-sm">Rolle: {member.role === 'owner' ? 'Besitzer' : 'Mitglied'}</div>
                            </>
                          )}
                          <div className="text-gray-400 text-xs">Beigetreten: {new Date(member.accepted_at).toLocaleDateString('de-DE')}</div>
                        </div>
                      </div>
                      {member.role !== 'owner' && !isCurrentUser && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <FontAwesomeIcon icon="fa-trash" size="base" style="regular"/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleDeleteList}
            className={`w-full font-semibold py-3 rounded-2xl transition-colors ${
              showDeleteConfirm 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            {showDeleteConfirm ? 'WIRKLICH LÖSCHEN?' : 'LISTE LÖSCHEN'}
          </button>
          
          {showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-2xl hover:bg-neutral-800 transition-colors"
            >
              ABBRECHEN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditListPage; 