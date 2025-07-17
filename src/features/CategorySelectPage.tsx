import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const categories = [
  { name: 'Obst', icon: <FontAwesomeIcon icon="fa-apple-whole" size="3xl" style="regular"/> },
  { name: 'Gemüse', icon: <FontAwesomeIcon icon="fa-carrot" size="3xl" style="regular"/> },
  { name: 'Brot & Backwaren', icon: <FontAwesomeIcon icon="fa-croissant" size="3xl" style="regular"/> },
  { name: 'Milchprodukte & Eier', icon: <FontAwesomeIcon icon="fa-egg" size="3xl" style="regular"/> },
  { name: 'Fleisch', icon: <FontAwesomeIcon icon="fa-meat" size="3xl" style="regular"/> },
  { name: 'Fisch & Meeresfrüchte', icon: <FontAwesomeIcon icon="fa-fish" size="3xl" style="regular"/> },
  { name: 'Tiefkühl', icon: <FontAwesomeIcon icon="fa-snowflake" size="3xl" style="regular"/> },
  { name: 'Öl, Essig & Saucen', icon: <FontAwesomeIcon icon="fa-bottle-droplet" size="3xl" style="regular"/> },
  { name: 'Brotaufstriche & Dips', icon: <FontAwesomeIcon icon="fa-bowl-soft-serve" size="3xl" style="regular"/> },
  { name: 'Kräuter & Gewürze', icon: <FontAwesomeIcon icon="fa-pepper-hot" size="3xl" style="regular"/> },
  { name: 'Backzutaten', icon: <FontAwesomeIcon icon="fa-bread-slice" size="3xl" style="regular"/> },
  { name: 'Nudeln & Reis', icon: <FontAwesomeIcon icon="fa-scribble" size="3xl" style="regular"/> },
  { name: 'Trockenfrüchte & Nüsse', icon: <FontAwesomeIcon icon="fa-chestnut" size="3xl" style="regular"/> },
  { name: 'Fertigprodukte', icon: <FontAwesomeIcon icon="fa-box-open" size="3xl" style="regular"/> },
  { name: 'Milchersatz', icon: <FontAwesomeIcon icon="fa-glass" size="3xl" style="regular"/> },
];

const CategorySelectPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected = 'Obst';

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Kategorie wechseln',
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

  return (
    <div className="w-full pb-8 pt-2">
      {categories.map((cat) => (
        <div key={cat.name} className="flex items-center px-5 py-3 border-b border-neutral-800 bg-neutral-900">
          <div className="w-12 flex justify-center mr-4">
            <span className="text-gray-300">{cat.icon}</span>
          </div>
          <span className="text-lg text-gray-300 flex-1">{cat.name}</span>
          {cat.name === selected && (
            <span className="text-yellow-400">
              <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CategorySelectPage; 