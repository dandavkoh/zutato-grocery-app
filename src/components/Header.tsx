import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../stores/store';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { setSearch, triggerFilterClick, triggerBackClick, triggerRightButtonClick } from '../stores/store';
import FontAwesomeIcon from './FontAwesomeIcon';
import { isIOS, primeKeyboard } from '../utils/iosKeyboard';

const Header: React.FC = () => {
  const header = useSelector((state: RootState) => state.header);
  const navigate = useNavigate();
  const location = useLocation();
  const { listId } = useParams<{ listId: string }>();
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
  const showHomeIcon = header.showHomeIcon ?? false;
  const rightIcon = header.rightIcon;
  
  const isSearchPage = title === '';
  const searchPlaceholder = isSearchPage ? 'z.B. 100 g dunkle Schokolade' : 'Was brauchst du?';

  // Lokale Event-Handler
  const handleBackClick = () => {
    dispatch(triggerBackClick());
  };

  const handleFilterClick = () => {
    dispatch(triggerFilterClick());
  };

  

  // Function to navigate to parent route based on current location
  const navigateToParent = () => {
    const pathname = location.pathname;
    
    // Extract listId and productId from current path
    const pathParts = pathname.split('/');
    
    if (pathname.includes('/search')) {
      // From search page: go back to shopping list
      navigate(`/shopping-list/${listId}`);
    } else if (pathname.includes('/product/') && pathname.includes('/unit')) {
      // From unit select page: go back to product detail
      const productId = pathParts[pathParts.length - 2]; // productId is before 'unit'
      navigate(`/shopping-list/${listId}/product/${productId}`);
    } else if (pathname.includes('/product/') && pathname.includes('/category')) {
      // From category select page: go back to product detail
      const productId = pathParts[pathParts.length - 2]; // productId is before 'category'
      navigate(`/shopping-list/${listId}/product/${productId}`);
    } else {
      // Fallback: go back in history
      navigate(-1);
    }
  };

  return (
    <header className={`bg-white shadow-md sticky top-0 z-[100] ios-sticky-fix ${className}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: back/home, title, optional actions */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {showBack && (
              <button 
                className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={handleBackClick}
              >
                <FontAwesomeIcon icon="fa-chevron-left" size="lg" style="regular"/>
              </button>
            )}
            {!showBack && (showHomeIcon || showFilterIcon) && (
              <button 
                className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/lists')}
              >
                <FontAwesomeIcon icon="fa-house" size="lg" />
              </button>
            )}
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{title}</div>
            {subtitle && <div className="text-sm text-gray-500 ml-2">{subtitle}</div>}
          </div>

          <div className="flex items-center gap-3">
            {showFilterIcon && (
              <button
                className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={handleFilterClick}
              >
                <FontAwesomeIcon icon="fa-filter" size="lg" />
              </button>
            )}
            {rightIcon && (
              <button
                className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => dispatch(triggerRightButtonClick())}
                aria-label="Right action"
              >
                <FontAwesomeIcon icon={rightIcon} size="lg" style="regular" />
              </button>
            )}
          </div>
        </div>

        {showSearchBar && (
          <div className="pb-4">
            <div className="flex">
              <div className="flex items-center w-full">
                <div className="flex items-center w-full">
                  <div className="flex items-center w-full">
                    <div className="flex items-center w-full border border-gray-400 rounded-full bg-gray-50 px-4 py-2">
                      <FontAwesomeIcon icon="fa-magnifying-glass" size="base" style="regular" className="mr-3 text-gray-600"/>
                      <input
                        className="bg-transparent outline-none text-gray-900 placeholder-gray-500 flex-1 cursor-pointer"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        {...(isSearchPage
                          ? { 
                              autoFocus: true, 
                              readOnly: false, 
                              onChange: (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearch(e.target.value)),
                              onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter' && searchValue.trim()) {
                                  // Dispatch a custom event to handle Enter key in SearchPage
                                  window.dispatchEvent(new CustomEvent('searchEnterPressed', { 
                                    detail: { searchTerm: searchValue.trim() } 
                                  }));
                                }
                              },
                              onClick: (e: React.MouseEvent<HTMLInputElement>) => {
                                e.currentTarget.select();
                              },
                              onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => {
                                e.preventDefault();
                              }
                            }
                          : { 
                              readOnly: true, 
                              onClick: () => {
                                // Prime iOS keyboard within the same user gesture before navigation
                                if (isIOS()) {
                                  primeKeyboard();
                                }
                                navigate(`/shopping-list/${listId}/search`);
                              }
                            }
                        )}
                      />
                      {isSearchPage && (
                        <span
                          className="ml-3 text-orange-600 font-semibold cursor-pointer select-none"
                          onClick={() => {
                            dispatch({ type: 'search/clearSearch' });
                            navigateToParent();
                          }}
                        >
                          Fertig
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 