import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../stores/store';
import { useNavigate } from 'react-router-dom';
import { setSearch, triggerFilterClick, triggerBackClick, triggerRightButtonClick } from '../stores/store';

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
        <button className="absolute left-4 top-14 bg-yellow-400/60 rounded-full p-2" onClick={handleBackClick}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {/* Title Row: Different layouts for ShoppingListPage vs other pages */}
      {title === 'Wocheneinkauf' && !showBack ? (
        // ShoppingListPage: Home icon + Title + Filter icon
        <div className="w-full flex items-center justify-between mt-6 mb-2 drop-shadow-lg">
          <div className="flex items-center">
            <div
              className="mr-3 cursor-pointer"
              onClick={() => navigate('/households')}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-7 9 7v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V9h6v12" />
              </svg>
            </div>
            <div className="text-3xl font-cursive text-white font-bold text-left">{title}</div>
          </div>
          {showFilterIcon && (
            <div
              className="cursor-pointer"
              onClick={handleFilterClick}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
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
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8" /></svg>
          </button>
        </div>
      )}
      {showSearchBar && (
        <div className="w-full flex justify-center mt-4">
          <div className="flex items-center bg-black rounded-2xl w-full px-4 py-2 relative">
            <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-2-2" /></svg>
            <input
              className="bg-transparent outline-none text-white placeholder-gray-400 flex-1 cursor-pointer"
              placeholder={searchPlaceholder}
              value={searchValue}
              {...(isSearchPage
                ? { autoFocus: true, readOnly: false, onChange: (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearch(e.target.value)) }
                : { readOnly: true, onFocus: () => navigate('/shopping-list/search'), onClick: () => navigate('/shopping-list/search') }
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