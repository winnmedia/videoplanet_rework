'use client';

import React from 'react';
import { Provider } from 'react-redux';

import { store } from '@/app/store/store';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Redux Store Provider 컴포넌트
 * 전역 상태 관리를 위한 Redux store 제공
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

export default StoreProvider;