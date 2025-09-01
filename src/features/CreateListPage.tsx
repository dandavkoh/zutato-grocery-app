import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../store';
import { ListsController } from '../api/supabaseApi';
import { useAuth } from '../contexts/AuthContext';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { generateGuid } from '../utils/guidUtils';
import { environment } from '../config/environment';
import { useListsDexie } from '../hooks/useListsDexie';

const CreateListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [listName, setListName] = useState('');

  const { user } = useAuth();
  const listsController = new ListsController();
  const { lists } = useListsDexie();
  
  // Check if user has reached the maximum number of lists
  const MAX_LISTS = environment.maxListsPerUser;
  const hasReachedMaxLists = lists.length >= MAX_LISTS;

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Benenne deine neue Einkaufsliste',
      showBack: true,
      background: '',
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

  // Redirect if user has reached the maximum number of lists
  useEffect(() => {
    if (hasReachedMaxLists) {
      navigate('/lists');
    }
  }, [hasReachedMaxLists, navigate]);

  // Don't render if user has reached the maximum number of lists
  if (hasReachedMaxLists) {
    return null;
  }

  const handleCreateList = async () => {
    if (!listName.trim() || !user) {
      return;
    }

    console.log('Creating list with name:', listName.trim());
    console.log('User ID:', user.id);
    
    // Fire and forget - but wait for the result, so we can navigate after the list is created
    await listsController.createList({
      id: generateGuid(), // Generate standard GUID (with hyphens)
      name: listName.trim(),
      description: `Einkaufsliste: ${listName.trim()}`,
      created_by: user.id
    }).catch(error => {
      console.error('Failed to create list (fire & forget):', error);
    });

    console.log('List creation initiated (fire & forget)');
    
    // Navigate immediately
    navigate('/lists');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label htmlFor="listName" className="block text-gray-900 text-sm font-semibold mb-3">
            Listenname
          </label>
          <input
            id="listName"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="z.B. Wocheneinkauf"
            className="w-full bg-gray-50 border border-gray-400 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40"
            autoFocus
          />
        </div>

        <button
          onClick={handleCreateList}
          disabled={!listName.trim() || hasReachedMaxLists}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg mb-4 flex items-center justify-center text-lg gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          {hasReachedMaxLists ? 'Listenlimit erreicht' : 'Liste erstellen'}
        </button>
      </div>
    </div>
  );
};

export default CreateListPage; 