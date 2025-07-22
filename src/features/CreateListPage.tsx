import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import { ListsController } from '../api/supabaseApi';
import { useAuth } from '../contexts/AuthContext';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const CreateListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [listName, setListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const listsController = new ListsController();

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Benenne deine neue Einkaufsliste',
      showBack: true,
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate('/lists');
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

  const handleCreateList = async () => {
    if (!listName.trim() || !user) {
      return;
    }

    setIsCreating(true);
    
    try {
      console.log('Creating list with name:', listName.trim());
      console.log('User ID:', user.id);
      
      const response = await listsController.createList({
        name: listName.trim(),
        description: `Einkaufsliste: ${listName.trim()}`,
        created_by: user.id
      });

      if (response.error) {
        console.error('Failed to create list:', response.error);
        if (response.error.includes('row-level security policy')) {
          alert('Berechtigungsfehler: Bitte stellen Sie sicher, dass Sie angemeldet sind.');
        } else {
          alert('Fehler beim Erstellen der Liste: ' + response.error);
        }
      } else {
        console.log('List created successfully:', response.data);
        navigate('/lists');
      }
    } catch (error) {
      console.error('Unexpected error creating list:', error);
      alert('Unerwarteter Fehler beim Erstellen der Liste');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        <div className="mb-6">
          <label htmlFor="listName" className="block text-white text-lg font-medium mb-3">
            Listenname
          </label>
          <input
            id="listName"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="z.B. Wochenendeinkauf"
            className="w-full bg-neutral-900 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
            autoFocus
          />
        </div>
        
        <button
          onClick={handleCreateList}
          disabled={!listName.trim() || isCreating}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl mb-4 flex items-center justify-center text-lg gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
        >
          <FontAwesomeIcon icon={isCreating ? "fa-spinner" : "fa-plus"} size="xl" style="regular" className={isCreating ? "animate-spin" : ""}/>
          {isCreating ? 'ERSTELLE...' : 'LISTE ERSTELLEN'}
        </button>
      </div>
    </div>
  );
};

export default CreateListPage; 