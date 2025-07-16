import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import type { RootState } from '../stores/store';

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

const searchResults = [
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Mehl Roggen' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Mehl Roggen 500', amount: '500' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Mehl', sub: 'Roggen', amount: '500 g' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Roggenmehl', sub: 'Mehl', amount: '500 g' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Weizenmehl', sub: 'Roggen', amount: '500 kg' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Dinkelmehl', sub: 'Roggen', amount: '500 g' },
  { icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>, name: 'Paniermehl', sub: 'Roggen', amount: '500 g' },
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.search.value);

  useEffect(() => {
    dispatch(setHeader({
      title: '',
      showBack: false,
      background: 'bg-yellow-400',
      showSearchBar: true, // NEU: Suchleiste im Header anzeigen
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, navigate]);

  const showResults = search.length > 0;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header entfernt, global! */}
      {showResults ? (
        <div className="w-full pb-8 pt-2">
          <div className="px-4 pt-2 pb-1 flex items-center gap-2 text-gray-300 text-base font-semibold">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8v8H8z" /></svg>
            Einkaufsvorschläge
          </div>
          <div className="divide-y divide-neutral-800">
            {searchResults.map((item, i) => (
              <div key={i} className="flex items-center px-4 py-3 bg-neutral-900">
                <span className="mr-4 text-gray-300">{item.icon}</span>
                <span className="text-base text-gray-200 flex-1">
                  {item.name} {item.sub && <span className="text-gray-400 text-sm ml-1">{item.sub}</span>}
                </span>
                {item.amount && <span className="text-gray-400 text-sm mr-2">{item.amount}</span>}
                <button className="rounded-full border-2 border-yellow-400 text-yellow-400 w-8 h-8 flex items-center justify-center ml-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Importieren-Box */}
          <div className="mx-4 mt-6 mb-4 p-4 rounded-2xl border border-gray-600 bg-neutral-900 flex flex-col relative overflow-hidden">
            <div className="text-lg text-gray-200 font-semibold mb-1">Rezepte importieren</div>
            <div className="text-gray-400 text-sm mb-4">Füge die Zutaten aus deinen online Lieblingsrezepten ganz einfach per Link hinzu.</div>
            <button className="bg-yellow-400 text-white font-semibold rounded-full px-5 py-2 text-base w-fit">Dein Rezept hinzufügen</button>
            <div className="absolute right-4 bottom-2 opacity-30">
              <svg width="100" height="60" viewBox="0 0 100 60" fill="none"><rect x="60" y="30" width="30" height="20" rx="4" stroke="white" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="4" stroke="white" strokeWidth="2"/><rect x="40" y="10" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="80" y="10" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="10" y="40" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="30" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="50" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="70" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="90" y="40" width="5" height="5" rx="1" stroke="white" strokeWidth="2"/><rect x="40" y="30" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="20" y="30" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="60" y="10" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="80" y="30" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="90" y="10" width="5" height="5" rx="1" stroke="white" strokeWidth="2"/></svg>
            </div>
          </div>

          {/* Empfehlungen */}
          <div className="px-4 mb-2">
            <div className="text-xs text-gray-400 font-semibold mb-1">FÜR DICH EMPFOHLEN</div>
            <div className="text-gray-400 text-xs mb-3">Aufgrund deiner Aktivitäten gehen wir davon aus, dass du diese Artikel bald benötigen wirst.</div>
            <div className="grid grid-cols-2 gap-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center bg-neutral-900 rounded-xl px-4 py-3 border border-neutral-800">
                  <span className="mr-3 text-gray-300">{rec.icon}</span>
                  <span className="text-base text-gray-200 flex-1">{rec.name} {rec.sub && <span className='text-gray-400 text-sm'>{rec.sub}</span>}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saisonale Produkte */}
          <div className="px-4 mt-4">
            <div className="text-xs text-gray-400 font-semibold mb-1">SAISONALE PRODUKTE</div>
            <div className="text-gray-400 text-xs mb-3">Aktuell sind diese Produkte in Saison.</div>
            <div className="grid grid-cols-2 gap-3">
              {seasonal.map((item, i) => (
                <div key={i} className="flex items-center bg-neutral-900 rounded-xl px-4 py-3 border border-neutral-800">
                  <span className="mr-3 text-gray-300">{item.icon}</span>
                  <span className="text-base text-gray-200 flex-1">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
    </div>
  );
};

export default SearchPage; 