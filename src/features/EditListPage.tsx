import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import type { List } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

// Mock data für Mitglieder
interface ListMember {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
}

const EditListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get list data from navigation state
  const list = location.state?.list as List | undefined;
  
  // Local state
  const [listName, setListName] = useState(list?.name || '');
  const [members, setMembers] = useState<ListMember[]>([
    { id: '1', name: 'Ich', email: 'ich@example.com', isOwner: true },
    { id: '2', name: 'Alina Kohsyk', email: 'alina.f00@gmx.de', isOwner: false },
    { id: '3', name: 'Max Mustermann', email: 'max@example.com', isOwner: false },
  ]);
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

  const handleSaveList = () => {
    console.log('Saving list:', { id: list.id, name: listName });
    // TODO: Implement save logic
    alert('Liste gespeichert!');
    navigate('/lists');
  };

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.isOwner) {
      alert('Du kannst dich nicht selbst aus der Liste entfernen!');
      return;
    }
    
    setMembers(members.filter(m => m.id !== memberId));
    console.log('Deleted member:', memberId);
  };

  const handleAddMember = () => {
    console.log('Add new member');
    // TODO: Implement add member logic
    alert('Neues Mitglied hinzufügen - TODO');
  };

  const handleDeleteList = () => {
    if (showDeleteConfirm) {
      console.log('Deleting list:', list.id);
      // TODO: Implement delete logic
      alert('Liste gelöscht!');
      navigate('/lists');
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
              className="w-full bg-neutral-900 border border-gray-700 rounded-2xl pl-12 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
              placeholder="Listenname eingeben"
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
        </div>

        {/* Members Section */}
        <div className="mb-8">
          <label className="block text-white text-sm font-medium mb-3 uppercase tracking-wide">
            MITGLIEDERLISTE
          </label>
          <div className="space-y-3 mb-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-neutral-900 rounded-2xl p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                    <FontAwesomeIcon icon="fa-user" size="base" style="regular" className="text-white"/>
                  </div>
                  <div>
                    <div className="text-white font-medium">{member.name}</div>
                    <div className="text-gray-400 text-sm">{member.email}</div>
                  </div>
                </div>
                {!member.isOwner && (
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <FontAwesomeIcon icon="fa-trash" size="base" style="regular"/>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAddMember}
            className="w-full bg-neutral-900 border border-yellow-400 text-white font-semibold py-3 rounded-2xl hover:bg-yellow-400 hover:text-black transition-colors"
          >
            NEUES MITGLIED HINZUFÜGEN
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleSaveList}
            className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-2xl hover:bg-yellow-500 transition-colors"
          >
            LISTE SPEICHERN
          </button>
          
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