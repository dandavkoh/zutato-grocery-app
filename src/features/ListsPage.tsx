import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useListsDexie } from '../hooks/useListsDexie';
import { useAuth } from '../contexts/AuthContext';

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // Use the lists hook
  const { lists, loading, error } = useListsDexie();

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
            <div className="text-white font-semibold">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.lastName || 'Benutzer'
              }
            </div>
            <div className="text-gray-400 text-sm">{user?.email || 'E-Mail nicht verfügbar'}</div>
          </div>
          <button className="text-gray-400 hover:text-yellow-400 text-2xl">
            <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          </button>
        </div>
        <button 
          onClick={() => navigate('/create-list')}
          className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-4 flex items-center justify-center text-lg gap-2"
        >
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
            {lists.map((list: any) => (
              <div key={list.id} className="bg-[#5a470a] rounded-2xl relative overflow-hidden w-full hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-stretch relative z-10 h-full">
                  {/* Linker klickbarer Bereich - Navigiert zur ShoppingListPage */}
                  <div
                    className="flex-1 cursor-pointer p-6"
                    onClick={() => {
                      console.log('ListsPage - Clicking list:', list);
                      console.log('ListsPage - Navigating to listId:', list.id);
                      navigate(`/shopping-list/${list.id}`);
                    }}
                  >
                    <div>
                      <div className="text-white text-xl font-semibold mb-2">{list.name}</div>
                      <div className="flex items-center gap-4 text-white/80 text-base">
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
                  
                  {/* Senkrechte Trennlinie */}
                  <div className="w-px bg-white/20 mx-4 my-6"></div>
                  
                  {/* Rechter klickbarer Bereich - Navigiert zur EditListPage */}
                  <div 
                    className="flex items-center justify-center w-16 cursor-pointer"
                    onClick={() => {
                      console.log('Edit button clicked for list:', list.id);
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