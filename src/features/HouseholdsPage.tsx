import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const HouseholdsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeader({
      title: 'Meine Haushalte',
      showBack: false,
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  return (
    <div className="flex-1">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        <p className="text-gray-200 mb-3">Haushalte anzeigen für</p>
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
        <button
          className="bg-yellow-400 rounded-2xl p-6 relative overflow-hidden w-full text-left hover:shadow-lg transition-shadow"
          onClick={() => navigate('/shopping-list')}
        >
          <div className="absolute left-0 bottom-0 w-full h-20 bg-yellow-500/30 rounded-b-2xl" style={{zIndex:0}}></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-white text-xl font-semibold mb-2">Wocheneinkauf</div>
              <div className="flex items-center gap-4 text-white/80 text-base">
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon="fa-users" size="base" style="regular"/>
                  2
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon="fa-clipboard-list-check" size="base" style="regular"/>
                  3
                </span>
              </div>
            </div>
            <span className="bg-white/30 rounded-full p-2 text-white">
              <FontAwesomeIcon icon="fa-pen" size="base" style="regular"/>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default HouseholdsPage; 