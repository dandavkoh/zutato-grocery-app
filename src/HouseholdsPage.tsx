import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from './store';

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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        <button className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-4 flex items-center justify-center text-lg gap-2">
          <span className="text-2xl">+</span> Neue Einkaufsliste
        </button>
        <button className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-6 flex items-center justify-center text-lg gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m7.5 0h-7.5m7.5 0v10.5A2.25 2.25 0 0113.5 21h-3a2.25 2.25 0 01-2.25-2.25V9m7.5 0h-7.5" />
          </svg>
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
                <span className="flex items-center gap-1"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'><path strokeLinecap='round' strokeLinejoin='round' d='M17 20h5v-2a3 3 0 00-3-3h-1.28a2 2 0 01-1.42-.59l-2.83-2.83a2 2 0 00-1.42-.59H9.41a2 2 0 00-1.42.59l-2.83 2.83A2 2 0 014.59 15H3a3 3 0 00-3 3v2h5' /></svg>2</span>
                <span className="flex items-center gap-1"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'><path strokeLinecap='round' strokeLinejoin='round' d='M5.25 6.75A2.25 2.25 0 017.5 4.5h9a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-12z' /></svg>3</span>
              </div>
            </div>
            <span className="bg-white/30 rounded-full p-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h6m2 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          {/* Illustration */}
          <div className="absolute left-4 bottom-4 flex gap-2 opacity-80 z-0">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff3" /></svg>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" fill="#fff3" /></svg>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" fill="#fff3" /></svg>
          </div>
        </button>
      </div>
    </div>
  );
};

export default HouseholdsPage; 