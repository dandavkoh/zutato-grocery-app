import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from './store';

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
  const dispatch = useDispatch();
  const selected = 'Stücke (Stk)';

  useEffect(() => {
    dispatch(setHeader({
      title: 'Einheit',
      showBack: true,
      onBack: () => navigate(-1),
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, navigate]);

  return (
    <div className="w-full pb-8 pt-2">
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
  );
};

export default UnitSelectPage; 