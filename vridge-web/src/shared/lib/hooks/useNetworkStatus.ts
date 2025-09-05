'use client'

/**
 * 네트워크 상태 관리 훅
 * 오프라인/온라인 상태를 실시간으로 감지하고 관리
 * 성능 최적화 및 메모리 누수 방지
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
  onlineAt: Date | null
  offlineAt: Date | null
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  downlink?: number
  rtt?: number
}

export interface UseNetworkStatusOptions {
  onOnline?: () => void
  onOffline?: () => void
  enableConnectionMonitoring?: boolean
  pingUrl?: string
  pingInterval?: number
  debounceDelay?: number
}

/**
 * 네트워크 상태 관리 훅
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const {
    onOnline,
    onOffline,
    enableConnectionMonitoring = true,
    pingUrl = '/api/health',
    pingInterval = 30000, // 30초
    debounceDelay = 1000 // 1초
  } = options

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    wasOffline: false,
    onlineAt: navigator.onLine ? new Date() : null,
    offlineAt: !navigator.onLine ? new Date() : null,
    effectiveType: undefined,
    downlink: undefined,
    rtt: undefined
  }))

  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const pingIntervalRef = useRef<NodeJS.Timeout>()
  const lastStatusRef = useRef<boolean>(navigator.onLine)

  // Network Information API 지원 확인
  const getConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection

    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      }
    }
    return {}
  }, [])

  // 네트워크 상태 업데이트
  const updateNetworkStatus = useCallback((isOnline: boolean, skipDebounce = false) => {
    const updateStatus = () => {
      const now = new Date()
      const connectionInfo = getConnectionInfo()

      setNetworkStatus(prev => ({
        ...prev,
        isOnline,
        isOffline: !isOnline,
        wasOffline: prev.isOffline || !isOnline,
        onlineAt: isOnline && !prev.isOnline ? now : prev.onlineAt,
        offlineAt: !isOnline && prev.isOnline ? now : prev.offlineAt,
        ...connectionInfo
      }))

      // 상태 변화 콜백 호출
      if (isOnline !== lastStatusRef.current) {
        if (isOnline && onOnline) {
          onOnline()
        } else if (!isOnline && onOffline) {
          onOffline()
        }
        lastStatusRef.current = isOnline
      }
    }

    // 디바운스 처리
    if (skipDebounce || debounceDelay <= 0) {
      updateStatus()
    } else {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(updateStatus, debounceDelay)
    }
  }, [getConnectionInfo, onOnline, onOffline, debounceDelay])

  // 실제 연결 상태 확인 (ping)
  const checkConnectionStatus = useCallback(async (): Promise<boolean> => {
    if (!enableConnectionMonitoring) return navigator.onLine

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      // AbortError는 타임아웃으로 간주
      if (error instanceof Error && error.name === 'AbortError') {
        return false
      }
      // 기타 네트워크 오류
      return false
    }
  }, [enableConnectionMonitoring, pingUrl])

  // 주기적 연결 상태 확인
  const startConnectionMonitoring = useCallback(() => {
    if (!enableConnectionMonitoring) return

    const checkConnection = async () => {
      const actualStatus = await checkConnectionStatus()
      const browserStatus = navigator.onLine

      // 브라우저와 실제 상태가 다른 경우 실제 상태를 우선
      if (actualStatus !== browserStatus || actualStatus !== networkStatus.isOnline) {
        updateNetworkStatus(actualStatus, true)
      }
    }

    // 즉시 한 번 확인
    checkConnection()

    // 주기적 확인 시작
    pingIntervalRef.current = setInterval(checkConnection, pingInterval)
  }, [enableConnectionMonitoring, checkConnectionStatus, pingInterval, networkStatus.isOnline, updateNetworkStatus])

  // 이벤트 리스너 설정
  useEffect(() => {
    const handleOnline = () => updateNetworkStatus(true)
    const handleOffline = () => updateNetworkStatus(false)
    
    // 연결 정보 변화 감지
    const handleConnectionChange = () => {
      const connectionInfo = getConnectionInfo()
      setNetworkStatus(prev => ({ ...prev, ...connectionInfo }))
    }

    // 브라우저 네트워크 이벤트 리스너
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Network Information API 이벤트 리스너
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    // 연결 모니터링 시작
    startConnectionMonitoring()

    // 정리 함수
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [updateNetworkStatus, getConnectionInfo, startConnectionMonitoring])

  return networkStatus
}

/**
 * 간단한 온라인 상태 감지 훅
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkStatus({ enableConnectionMonitoring: false })
  return isOnline
}

/**
 * 연결 품질 정보 훅
 */
export function useConnectionQuality() {
  const { effectiveType, downlink, rtt, isOnline } = useNetworkStatus({
    enableConnectionMonitoring: true
  })

  const getQualityLevel = useCallback(() => {
    if (!isOnline) return 'offline'
    if (!effectiveType) return 'unknown'

    switch (effectiveType) {
      case 'slow-2g':
        return 'poor'
      case '2g':
        return 'fair'
      case '3g':
        return 'good'
      case '4g':
        return 'excellent'
      default:
        return 'unknown'
    }
  }, [isOnline, effectiveType])

  const qualityLevel = getQualityLevel()

  return {
    effectiveType,
    downlink,
    rtt,
    qualityLevel,
    isSlowConnection: qualityLevel === 'poor' || qualityLevel === 'fair',
    isFastConnection: qualityLevel === 'excellent' || qualityLevel === 'good'
  }
}

/**
 * 네트워크 상태 변화 감지 훅
 */
export function useNetworkStatusChange(
  onStatusChange: (status: NetworkStatus) => void
) {
  const networkStatus = useNetworkStatus()
  const prevStatusRef = useRef<NetworkStatus>(networkStatus)

  useEffect(() => {
    // 상태 변화가 있을 때만 콜백 호출
    if (
      prevStatusRef.current.isOnline !== networkStatus.isOnline ||
      prevStatusRef.current.effectiveType !== networkStatus.effectiveType
    ) {
      onStatusChange(networkStatus)
      prevStatusRef.current = networkStatus
    }
  }, [networkStatus, onStatusChange])

  return networkStatus
}