import React from 'react';
import { useNavigate } from 'react-router-dom';

const units = [
  'Keine',
  'Stücke (Stk)',
  'Milliliter (ml)',
  'Liter (l)',
  'Gramm (g)',
  'Kilogramm (kg)',
  'Packungen (Pkg)',
  'Flaschen (Fl)',
  'Kästen',
  'Boxen',
  'Gläser',
  'Dosen',
  'Tuben',
];

const UnitSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const selected = 'Stücke (Stk)';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="relative bg-yellow-400 rounded-b-3xl px-6 pt-8 pb-6 flex flex-col items-center">
        <span className="absolute left-4 top-6 text-white text-sm font-semibold">11:59</span>
        <button className="absolute left-4 top-14 bg-yellow-400/60 rounded-full p-2" onClick={() => navigate(-1)}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-3xl font-cursive text-white font-bold mt-6 mb-2 drop-shadow-lg">Einheit</div>
      </div>
      <div className="flex-1 w-full max-w-md mx-auto pb-8 pt-2">
        {units.map((unit) => (
          <div key={unit} className="flex items-center px-5 py-3 border-b border-neutral-800 bg-neutral-900">
            <span className="text-lg text-gray-300 flex-1">{unit}</span>
            {unit === selected && (
              <span className="text-yellow-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4" /></svg>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnitSelectPage; 