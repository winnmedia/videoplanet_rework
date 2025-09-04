import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store/store';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toasts: Toast[];
  modalStack: string[];
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: 'light',
  toasts: [],
  modalStack: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    addToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(
        (toast) => toast.id !== action.payload
      );
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modalStack.push(action.payload);
    },
    closeModal: (state) => {
      state.modalStack.pop();
    },
    closeAllModals: (state) => {
      state.modalStack = [];
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addToast,
  removeToast,
  openModal,
  closeModal,
  closeAllModals,
} = uiSlice.actions;

export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectToasts = (state: RootState) => state.ui.toasts;
export const selectActiveModal = (state: RootState) =>
  state.ui.modalStack[state.ui.modalStack.length - 1];

export default uiSlice.reducer;