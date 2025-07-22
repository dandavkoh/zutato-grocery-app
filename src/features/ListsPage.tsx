import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useLists } from '../hooks/useLists';

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Use the lists hook
  const { lists, loading, error } = useLists();
  
  // Debug logging
  console.log('ListsPage - Lists data:', lists);
  console.log('ListsPage - Loading:', loading);
  console.log('ListsPage - Error:', error);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Meine Listen',
      showBack: false,
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  return (
    <div className="flex-1">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        <p className="text-gray-200 mb-3">Listen anzeigen für</p>
        <div className="flex items-center bg-neutral-900 rounded-2xl p-4 mb-6 border border-gray-700">
          <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="Profil" className="w-12 h-12 rounded-full mr-4 border-2 border-yellow-400" />
          <div className="flex-1">
            <div className="text-white font-semibold">Daniel Kohsyk</div>
            <div className="text-gray-400 text-sm">daniel.kohsyk@web.de</div>
          </div>
          <button className="text-gray-400 hover:text-yellow-400 text-2xl">
            <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          </button>
        </div>
        <button className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-4 flex items-center justify-center text-lg gap-2">
          <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          Neue Einkaufsliste
        </button>
        <button className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-6 flex items-center justify-center text-lg gap-2">
          <FontAwesomeIcon icon="fa-right-to-bracket" size="xl" style="regular"/>
          Einkaufsliste beitreten
        </button>
        
        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-white">Lade Listen...</div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-400">Fehler beim Laden der Listen</div>
          </div>
        )}
        
        {/* Lists */}
        {!loading && !error && lists && lists.length > 0 && (
          <div className="space-y-4">
            {lists.map((list) => (
              <button
                key={list.id}
                className="bg-yellow-400 rounded-2xl p-6 relative overflow-hidden w-full text-left hover:shadow-lg transition-shadow"
                onClick={() => {
                  console.log('ListsPage - Clicking list:', list);
                  console.log('ListsPage - Navigating to listId:', list.id);
                  navigate(`/shopping-list/${list.id}`);
                }}
              >
                <div className="absolute left-0 bottom-0 w-full h-20 bg-yellow-500/30 rounded-b-2xl" style={{zIndex:0}}></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <div className="text-white text-xl font-semibold mb-2">{list.name}</div>
                                          <div className="flex items-center gap-4 text-white/80 text-base">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon="fa-calendar" size="base" style="regular"/>
                          {new Date(list.created_at).toLocaleDateString('de-DE')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon="fa-user" size="base" style="regular"/>
                          {list.created_by}
                        </span>
                      </div>
                  </div>
                  <span className="bg-white/30 rounded-full p-2 text-white">
                    <FontAwesomeIcon icon="fa-pen" size="base" style="regular"/>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!loading && !error && (!lists || lists.length === 0) && (
          <div className="text-center py-8">
            <div className="text-white/60">Keine Listen gefunden</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListsPage; 