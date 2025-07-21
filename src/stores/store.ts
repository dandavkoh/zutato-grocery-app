import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { shoppingItemsApi } from '../api/shoppingItemsApi';
import { listsApi } from '../api/listsApi';

// Beispiel: Suchtext global speichern
const searchSlice = createSlice({
  name: 'search',
  initialState: { value: '' },
  reducers: {
    setSearch: (state, action: PayloadAction<string>) => {
      state.value = action.payload;
    },
    clearSearch: (state) => {
      state.value = '';
    },
  },
});

// Event-Slice für globale Events
const eventSlice = createSlice({
  name: 'events',
  initialState: { 
    filterClicked: false,
    backClicked: false,
    rightButtonClicked: false,
  },
  reducers: {
    triggerFilterClick: (state) => {
      state.filterClicked = true;
    },
    resetFilterClick: (state) => {
      state.filterClicked = false;
    },
    triggerBackClick: (state) => {
      state.backClicked = true;
    },
    resetBackClick: (state) => {
      state.backClicked = false;
    },
    triggerRightButtonClick: (state) => {
      state.rightButtonClicked = true;
    },
    resetRightButtonClick: (state) => {
      state.rightButtonClicked = false;
    },
  },
});

// Header-Slice für globale Header-Konfiguration
export interface HeaderState {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  background?: string;
  className?: string;
  showSearchBar?: boolean;
  showFilterIcon?: boolean;
  showRightButton?: boolean;
}
const initialHeaderState: HeaderState = {
  title: '',
  subtitle: '',
  showBack: false,
  background: 'bg-yellow-400',
  className: '',
  showSearchBar: false,
  showFilterIcon: false,
  showRightButton: false,
};
const headerSlice = createSlice({
  name: 'header',
  initialState: initialHeaderState,
  reducers: {
    setHeader: (state, action: PayloadAction<Partial<HeaderState>>) => {
      return { ...state, ...action.payload };
    },
    resetHeader: () => initialHeaderState,
  },
});

export const { setSearch, clearSearch } = searchSlice.actions;
export const { 
  triggerFilterClick, 
  resetFilterClick,
  triggerBackClick,
  resetBackClick,
  triggerRightButtonClick,
  resetRightButtonClick,
} = eventSlice.actions;
export const { setHeader, resetHeader } = headerSlice.actions;

export const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    events: eventSlice.reducer,
    header: headerSlice.reducer,
    // RTK Query API Reducer hinzufügen
    [shoppingItemsApi.reducerPath]: shoppingItemsApi.reducer,
    [listsApi.reducerPath]: listsApi.reducer,
  },
  // RTK Query Middleware hinzufügen
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      shoppingItemsApi.middleware,
      listsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 