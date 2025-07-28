import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../stores/store';
import { useNavigate } from 'react-router-dom';
import { setSearch, triggerFilterClick, triggerBackClick, triggerRightButtonClick } from '../stores/store';
import FontAwesomeIcon from './FontAwesomeIcon';

const Header: React.FC = () => {
  const header = useSelector((state: RootState) => state.header);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchValue = useSelector((state: RootState) => state.search.value);

  // Fallbacks für Standard-Header
  const title = header.title || '';
  const subtitle = header.subtitle || '';
  const showBack = header.showBack ?? false;
  const background = header.background || 'bg-yellow-400';
  const className = header.className || '';
  const showSearchBar = header.showSearchBar ?? false;
  const showFilterIcon = header.showFilterIcon ?? false;
  const showRightButton = header.showRightButton ?? false;
  const isSearchPage = title === '';
  const searchPlaceholder = isSearchPage ? 'z.B. 100 g dunkle Schokolade' : 'Was brauchst du?';

  // Lokale Event-Handler
  const handleBackClick = () => {
    dispatch(triggerBackClick());
  };

  const handleFilterClick = () => {
    dispatch(triggerFilterClick());
  };

  const handleRightButtonClick = () => {
    dispatch(triggerRightButtonClick());
  };

  return (
    <div className={`relative ${background} rounded-b-3xl px-6 pt-8 pb-6 flex flex-col items-center ${className}`}>
      {showBack && (
        <button 
          className="absolute left-4 top-14 bg-yellow-400/60 rounded-full p-2 z-50" 
          onClick={handleBackClick}
          style={{zIndex: 1000}}
        >
          <FontAwesomeIcon icon="fa-chevron-left" size="xl" style="regular"/>
        </button>
      )}
      {/* Title Row: Different layouts for ShoppingListPage vs other pages */}
      {!showBack && showFilterIcon ? (
        // ShoppingListPage: Home icon + Title + Filter icon
        <div className="w-full flex items-center justify-between mt-6 mb-2 drop-shadow-lg">
          <div className="flex items-center">
            <div
              className="mr-3 cursor-pointer"
              onClick={() => navigate('/lists')}
            >
              <FontAwesomeIcon icon="fa-house" size="2xl"/>
            </div>
            <div className="text-3xl font-cursive text-white font-bold text-left">{title}</div>
          </div>
          {showFilterIcon && (
            <div
              className="cursor-pointer"
              onClick={handleFilterClick}
            >
              <FontAwesomeIcon icon="fa-filter" size="2xl"/>
            </div>
          )}
        </div>
      ) : (
        // Other pages: Centered title
        <div className="text-3xl font-cursive text-white font-bold mt-6 mb-2 drop-shadow-lg text-center">{title}</div>
      )}
      {subtitle && <div className="text-lg text-white mb-2">{subtitle}</div>}
      {showRightButton && (
        <div className="absolute right-6 top-14">
          <button 
            className="bg-yellow-300/80 rounded-full p-3 shadow-lg"
            onClick={handleRightButtonClick}
          >
            <FontAwesomeIcon icon="fa-square-plus" size="xl" style="regular"/>
          </button>
        </div>
      )}
      {showSearchBar && (
        <div className="w-full flex justify-center mt-4">
          <div className="flex items-center bg-black rounded-2xl w-full px-4 py-2 relative">
            <FontAwesomeIcon icon="fa-magnifying-glass" size="base" style="regular" className="mr-3"/>
            <input
              className="bg-transparent outline-none text-white placeholder-gray-400 flex-1 cursor-pointer"
              placeholder={searchPlaceholder}
              value={searchValue}
              {...(isSearchPage
                ? { autoFocus: true, readOnly: false, onChange: (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearch(e.target.value)) }
                : { readOnly: true, onClick: () => navigate('/shopping-list/search') }
              )}
            />
            {isSearchPage && (
              <span
                className="ml-3 text-white font-semibold cursor-pointer select-none"
                onClick={() => {
                  dispatch({ type: 'search/clearSearch' });
                  navigate(-1);
                }}
              >
                FERTIG
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Header; 