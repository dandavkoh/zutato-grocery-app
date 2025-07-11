import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ProductDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-b-3xl px-6 pt-8 pb-8 flex flex-col items-center">
        <span className="absolute left-4 top-6 text-white text-sm font-semibold">11:59</span>
        <button className="absolute left-4 top-14 bg-yellow-400/60 rounded-full p-2" onClick={() => navigate(-1)}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-4xl font-bold text-white mt-6 mb-2 drop-shadow-lg">{name || 'Produkt'}</div>
        <div className="flex justify-center items-center mb-2">
          {/* Produkt-Icon: Ananas */}
          <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 48"><path strokeLinecap="round" strokeLinejoin="round" d="M24 4C20 14 14 16 14 24a10 10 0 0020 0c0-8-6-10-10-20z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 18c1 1 2 1 3 0m3 0c1 1 2 1 3 0" /></svg>
        </div>
        <button className="absolute right-6 bottom-6 bg-yellow-300/80 rounded-full p-3 shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8" /></svg>
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 px-0 pb-8 pt-2 w-full max-w-md mx-auto">
        {/* Läden */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">LÄDEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Wähle Läden aus, die diesem Produkt zugeordnet werden sollen.</span>
            <svg className="w-5 h-5 text-gray-500 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        {/* Personen */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">PERSONEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Wähle Personen aus, die diesem Produkt zugeordnet werden sollen.</span>
            <svg className="w-5 h-5 text-gray-500 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        {/* Notiz */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">NOTIZ</div>
          <div className="text-gray-400">Notiz hinzufügen</div>
        </div>
        {/* Menge & Einheit */}
        <div className="flex gap-2 px-5">
          <div className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-2">
            <div className="text-xs text-gray-400 mb-1">MENGE</div>
            <div className="text-gray-300">Menge</div>
          </div>
          <button
            className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-2 flex items-center justify-between text-left"
            onClick={() => navigate(`/product/${name}/unit`)}
          >
            <div>
              <div className="text-xs text-gray-400 mb-1">EINHEIT</div>
              <div className="text-gray-300">Stücke (Stk)</div>
            </div>
            <svg className="w-5 h-5 text-gray-500 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        {/* Kategorie wechseln */}
        <button
          className="mt-4 bg-neutral-900 border-b border-neutral-800 px-5 py-4 w-full text-left"
          onClick={() => navigate(`/product/${name}/category`)}
        >
          <div className="text-xs text-gray-400 mb-1">KATEGORIE WECHSELN</div>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8" /></svg>
            <span className="text-gray-300">Obst</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage; 