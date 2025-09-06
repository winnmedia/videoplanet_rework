'use client';

import type { Store } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';

interface StoreProviderProps {
  children: React.ReactNode;
  store: Store; // Dependency injection - 의존성 주입
}

/**
 * Redux Store Provider 컴포넌트
 * 전역 상태 관리를 위한 Redux store 제공
 * 
 * @note FSD 준수: shared 레이어는 store를 외부에서 주입받음
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children, store }) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

export default StoreProvider;