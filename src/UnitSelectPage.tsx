import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from './store';
import type { Unit } from './api/mockApi';

const units: (Unit | null)[] = [
  null, // Keine
  { name: 'Stücke', short: 'Stk' },
  { name: 'Milliliter', short: 'ml' },
  { name: 'Liter', short: 'l' },
  { name: 'Gramm', short: 'g' },
  { name: 'Kilogramm', short: 'kg' },
  { name: 'Packungen', short: 'Pkg' },
  { name: 'Flaschen', short: 'Fl' },
  { name: 'Kästen', short: 'Kst' },
  { name: 'Boxen', short: 'Box' },
  { name: 'Gläser', short: 'Gl' },
  { name: 'Dosen', short: 'Dose' },
  { name: 'Tuben', short: 'Tube' },
];

const UnitSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected: Unit = { name: 'Stücke', short: 'Stk' };

  useEffect(() => {
    dispatch(setHeader({
      title: 'Einheit',
      showBack: true,
      onBack: () => navigate(-1),
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, navigate]);

  const formatUnitDisplay = (unit: Unit | null) => {
    if (!unit) return 'Keine';
    return `${unit.name} (${unit.short})`;
  };

  const isSelected = (unit: Unit | null) => {
    if (!unit || !selected) return false;
    return unit.name === selected.name && unit.short === selected.short;
  };

  return (
    <div className="w-full pb-8 pt-2">
      {units.map((unit, index) => (
        <div key={index} className="flex items-center px-5 py-3 border-b border-neutral-800 bg-neutral-900">
          <span className="text-lg text-gray-300 flex-1">{formatUnitDisplay(unit)}</span>
          {isSelected(unit) && (
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