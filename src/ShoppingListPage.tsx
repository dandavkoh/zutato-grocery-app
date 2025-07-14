import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from './store';

const recommendations = [
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="6" /></svg>, name: 'Zucker', sub: 'Brauner' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Toast' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Brei' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Gouda' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Zitronensaft' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Paprika' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Tomaten', sub: 'Gehackte' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Rucola' },
];
const seasonal = [
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6" /></svg>, name: 'Champignons' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6" /></svg>, name: 'Chicorée' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6" /></svg>, name: 'Rote Bete' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6" /></svg>, name: 'Weißkohl' },
];

const ShoppingListPage: React.FC = () => {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeader({
      title: 'Wocheneinkauf',
      showBack: false,
      background: 'bg-yellow-400',
      showSearchBar: true, // NEU: Suchleiste im Header anzeigen
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header entfernt, global! */}
      {/* Info-Box */}
      <div className="bg-neutral-900 flex items-center gap-3 px-4 py-3 mt-2 mb-2">
        <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17h18M4 17V7a2 2 0 012-2h12a2 2 0 012 2v10" /><circle cx="12" cy="14" r="4" /></svg>
        <span className="text-gray-200 text-sm flex-1">HNGRY wird ab dem 31. März 2025 nicht mehr verfügbar sein. <a href="#" className="underline text-gray-300">Mehr erfahren</a></span>
      </div>

      {/* Kategorien & Produkte */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="divide-y divide-neutral-800">
          {/* Obst */}
          <div>
            <div className="px-4 pt-4 pb-1 text-gray-300 text-sm">Obst</div>
            <button
              className="flex items-center px-4 py-3 bg-neutral-900 border-b border-neutral-800 w-full text-left"
              onClick={() => navigate('/product/Ananas')}
            >
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C10 7 7 8 7 12a5 5 0 0010 0c0-4-3-5-5-10z" /></svg>
              <span className="text-lg text-gray-200">Ananas</span>
              <span className="flex-1" />
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {/* Brot & Backwaren */}
          <div>
            <div className="px-4 pt-4 pb-1 text-gray-300 text-sm">Brot & Backwaren</div>
            <div className="flex items-center px-4 py-3 bg-neutral-900 border-b border-neutral-800">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>
              <span className="text-lg text-gray-200">Donuts</span>
              <span className="flex-1" />
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          {/* Süßigkeiten & Snacks */}
          <div>
            <div className="px-4 pt-4 pb-1 text-gray-300 text-sm">Süßigkeiten & Snacks</div>
            <div className="flex items-center px-4 py-3 bg-neutral-900 border-b border-neutral-800">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="6" /></svg>
              <span className="text-lg text-gray-200">Haribo <span className="text-gray-400 text-base ml-1">Schlangen</span></span>
              <span className="flex-1" />
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        </div>

        {/* Gekaufte Produkte */}
        <div className="mt-6">
          <div className="flex items-center px-4 pb-2">
            <span className="text-gray-300 text-xs font-semibold flex-1">GEKAUFTE PRODUKTE <span className="align-middle">^</span></span>
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 16v-4m4 4V8m4 8v-2" /></svg>
          </div>
          <div className="divide-y divide-neutral-800">
            <div className="flex items-center px-4 py-3">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10" /></svg>
              <span className="text-lg text-gray-400 line-through">Butter</span>
            </div>
            <div className="flex items-center px-4 py-3">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="6" /></svg>
              <span className="text-lg text-gray-400 line-through">Milch</span>
            </div>
            <div className="flex items-center px-4 py-3">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
              <span className="text-lg text-gray-200">Eier</span>
            </div>
            <div className="flex items-center px-4 py-3">
              <svg className="w-7 h-7 text-gray-300 mr-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
              <span className="text-lg text-gray-200 flex-1">Sahne</span>
              <span className="text-gray-400 text-base">4 Pkg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t border-neutral-800 flex justify-around items-center h-20 z-20">
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-yellow-400">
          <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 16v-4m4 4V8m4 8v-2" /></svg>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400">
          <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2" /></svg>
          <span className="text-xs font-semibold">Vorrat</span>
        </button>
      </div>

      {/* Bottom Sheet Sortiermenü */}
      {sortSheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSortSheetOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="mx-auto max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-8 shadow-2xl border-t border-neutral-800 relative">
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" onClick={() => setSortSheetOpen(false)} />
              <div className="text-center text-gray-400 text-sm mb-6">Liste sortieren</div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center text-yellow-400 font-semibold text-lg">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                  Nach Kategorie
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10m8-10v10M4 17h16" /></svg>
                  Letztes Produkt oben
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17V7m8 10V7M4 7h16" /></svg>
                  Letztes Produkt unten
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /><text x="17" y="21" fontSize="10" fill="currentColor">A</text></svg>
                  Alphabetisch
                </div>
              </div>
              <button className="absolute right-6 top-6 bg-yellow-400 rounded-full p-2 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h6m2 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingListPage; 