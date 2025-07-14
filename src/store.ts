import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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

// Header-Slice für globale Header-Konfiguration
export interface HeaderState {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: (() => void) | null;
  rightButton?: React.ReactNode;
  background?: string;
  className?: string;
  showSearchBar?: boolean; // NEU
  onFilterClick?: (() => void) | null; // NEU: Filter click handler
}
const initialHeaderState: HeaderState = {
  title: '',
  subtitle: '',
  showBack: false,
  onBack: null,
  rightButton: null,
  background: 'bg-yellow-400',
  className: '',
  showSearchBar: false, // NEU
  onFilterClick: null, // NEU
};
const headerSlice = createSlice({
  name: 'header',
  initialState: initialHeaderState,
  reducers: {
    setHeader: (state, action: PayloadAction<Partial<HeaderState>>) => {
      return { ...state, ...action.payload, showSearchBar: action.payload.showSearchBar ?? false };
    },
    resetHeader: () => initialHeaderState,
  },
});

export const { setSearch, clearSearch } = searchSlice.actions;
export const { setHeader, resetHeader } = headerSlice.actions;

export const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    header: headerSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 