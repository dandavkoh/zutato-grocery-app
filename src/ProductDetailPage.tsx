import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from './store';

const ProductDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setHeader({
      title: name || 'Produkt',
      showBack: true,
      onBack: () => navigate(-1),
      rightButton: (
        <button className="bg-yellow-300/80 rounded-full p-3 shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8" /></svg>
        </button>
      ),
      background: 'bg-gradient-to-b from-yellow-400 to-yellow-500',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, name, navigate]);

  return (
    <div className="flex-1">
      {/* Details */}
      <div className="flex-1 px-0 pb-8 pt-2 w-full max-w-md mx-auto">
        <div className="flex flex-col gap-3">
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
          <div className="flex gap-2">
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
            className="bg-neutral-900 border-b border-neutral-800 px-5 py-4 w-full text-left"
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
    </div>
  );
};

export default ProductDetailPage; 