'use client'

import { ReactNode } from 'react'
import { Provider } from 'react-redux'

import { store } from '@/app/store/store'

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  return <Provider store={store}>{children}</Provider>
}