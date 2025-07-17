import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, resetRightButtonClick } from '../stores/store';
import type { RootState } from '../stores/store';
import type { ShoppingItem } from '../api/mockApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get item data from navigation state
  const item = location.state?.item as ShoppingItem | undefined;

  // Watch for events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);
  const rightButtonClicked = useSelector((state: RootState) => state.events.rightButtonClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: item?.name || 'Produkt',
      showBack: true,
      showRightButton: true,
      background: 'bg-gradient-to-b from-yellow-400 to-yellow-500',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, item]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(-1);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

  // Handle right button events
  useEffect(() => {
    if (rightButtonClicked) {
      // Handle right button click - for now just log it
      console.log('Right button clicked');
      dispatch(resetRightButtonClick());
    }
  }, [rightButtonClicked, dispatch]);

  // If no item data is available, show a fallback
  if (!item) {
    return (
      <div className="w-full pb-8 pt-2">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Produktdaten nicht verfügbar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-8 pt-2">
      <div className="flex flex-col gap-3">
        {/* Läden */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">LÄDEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">
              {item.stores && item.stores.length > 0 
                ? item.stores.join(', ') 
                : 'Wähle Läden aus, die diesem Produkt zugeordnet werden sollen.'
              }
            </span>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </div>
        </div>
        {/* Personen */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">PERSONEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">
              {item.assignedTo && item.assignedTo.length > 0 
                ? item.assignedTo.join(', ') 
                : 'Wähle Personen aus, die diesem Produkt zugeordnet werden sollen.'
              }
            </span>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </div>
        </div>
        {/* Notiz */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">NOTIZ</div>
          <div className="text-gray-400">{item.notes || 'Notiz hinzufügen'}</div>
        </div>
        {/* Menge & Einheit */}
        <div className="flex gap-2">
          <div className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-5 rounded-r-lg">
            <div className="text-xs text-gray-400 mb-1">MENGE</div>
            <div className="text-gray-300">{item.amount || 'Menge'}</div>
          </div>
          <button
            className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-5 flex items-center justify-between text-left rounded-l-lg"
            onClick={() => navigate('/product/unit', { state: { item } })}
          >
            <div>
              <div className="text-xs text-gray-400 mb-1">EINHEIT</div>
              <div className="text-gray-300">
                {item.unit ? `${item.unit.name} (${item.unit.short})` : 'Stücke (Stk)'}
              </div>
            </div>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </button>
        </div>
        {/* Kategorie wechseln */}
        <button
          className="bg-neutral-900 border-b border-neutral-800 px-5 py-4 w-full text-left"
          onClick={() => navigate('/product/category', { state: { item } })}
        >
          <div className="text-xs text-gray-400 mb-1">KATEGORIE WECHSELN</div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon="fa-apple-whole" size="2xl" style="regular"/>
            <span className="text-gray-300">{item.category}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage; 