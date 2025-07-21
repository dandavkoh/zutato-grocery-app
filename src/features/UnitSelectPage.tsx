import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import type { Unit } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const units: (Unit | null)[] = [
  null, // Keine
  { id: 'stk', name: 'Stücke', short: 'Stk' },
  { id: 'ml', name: 'Milliliter', short: 'ml' },
  { id: 'l', name: 'Liter', short: 'l' },
  { id: 'g', name: 'Gramm', short: 'g' },
  { id: 'kg', name: 'Kilogramm', short: 'kg' },
  { id: 'pkg', name: 'Packungen', short: 'Pkg' },
  { id: 'fl', name: 'Flaschen', short: 'Fl' },
  { id: 'kst', name: 'Kästen', short: 'Kst' },
  { id: 'box', name: 'Boxen', short: 'Box' },
  { id: 'gl', name: 'Gläser', short: 'Gl' },
  { id: 'dose', name: 'Dosen', short: 'Dose' },
  { id: 'tube', name: 'Tuben', short: 'Tube' },
];

const UnitSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected: Unit = { id: 'stk', name: 'Stücke', short: 'Stk' };

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Einheit',
      showBack: true,
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(-1);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

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
              <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default UnitSelectPage; 