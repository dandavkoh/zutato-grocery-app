import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useListsDexie } from '../hooks/useListsDexie';
import { useAuth } from '../contexts/AuthContext';
import InvitationRedeem from '../components/InvitationRedeem';

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // Use the lists hook
  const { lists, loading, error, refetch } = useListsDexie();

  useEffect(() => {
    dispatch(setHeader({
      title: 'Meine Listen',
      showBack: false,
      background: '',
      showFilterIcon: false,
      showRightButton: false,
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
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

        <button 
          onClick={() => navigate('/create-list')}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg mb-6 flex items-center justify-center text-lg gap-2"
        >
          <FontAwesomeIcon icon="fa-plus" size="xl" style="regular"/>
          Neue Einkaufsliste
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
      </div>
    </div>
  );
};

export default ListsPage; 