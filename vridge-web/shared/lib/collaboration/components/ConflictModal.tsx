/**
 * @fileoverview 충돌 해결 모달 컴포넌트  
 * @description 변경사항 충돌 시 해결 방법을 선택할 수 있는 모달
 */

'use client'

import clsx from 'clsx'
import { useState, memo } from 'react'

import type { ConflictModalProps, CollaborationConflict } from '../types'

export const ConflictModal = memo(function ConflictModal({
  conflicts,
  onResolve,
  onClose,
  isOpen
}: ConflictModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<CollaborationConflict | null>(
    conflicts.length > 0 ? conflicts[0] : null
  )
  const [isResolving, setIsResolving] = useState(false)
  
  if (!isOpen || conflicts.length === 0) {
    return null
  }
  
  const handleResolve = async (resolution: 'local' | 'remote' | 'merged') => {
    if (!selectedConflict || isResolving) return
    
    setIsResolving(true)
    
    try {
      await onResolve({
        conflictId: selectedConflict.id,
        resolution,
        mergedData: resolution === 'merged' ? {} : undefined // 실제로는 병합 UI 구현
      })
      
      // 다음 충돌로 이동하거나 모달 닫기
      const remainingConflicts = conflicts.filter(c => c.id !== selectedConflict.id)
      if (remainingConflicts.length > 0) {
        setSelectedConflict(remainingConflicts[0])
      } else {
        onClose()
      }
    } finally {
      setIsResolving(false)
    }
  }
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <>
      {/* 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 모달 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
        data-testid="conflict-modal"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 
                  id="conflict-modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  변경사항 충돌 해결
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {conflicts.length}개의 충돌이 발견되었습니다
                </p>
              </div>
              
              <button
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                onClick={onClose}
                disabled={isResolving}
                aria-label="모달 닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 진행 표시 */}
            {conflicts.length > 1 && (
              <div className="mt-3">
                <div className="flex space-x-1">
                  {conflicts.map((conflict, index) => (
                    <div
                      key={conflict.id}
                      className={clsx(
                        'h-2 flex-1 rounded-full',
                        selectedConflict?.id === conflict.id 
                          ? 'bg-blue-500' 
                          : 'bg-gray-200 dark:bg-gray-600'
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {conflicts.findIndex(c => c.id === selectedConflict?.id) + 1} / {conflicts.length}
                </p>
              </div>
            )}
          </div>
          
          {/* 본문 */}
          {selectedConflict && (
            <div className="px-6 py-4 overflow-y-auto max-h-96">
              <div className="space-y-4">
                {/* 충돌 정보 */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                        동시 수정 충돌
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {selectedConflict.resourceType} "{selectedConflict.resourceId}"에서 동시 수정이 발생했습니다
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 변경사항 비교 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 내 변경사항 */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      내 변경사항
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">작업자:</span>
                        <span className="ml-2 font-medium">{selectedConflict.localChange.userName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">시간:</span>
                        <span className="ml-2">{formatTimestamp(selectedConflict.localChange.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">작업:</span>
                        <span className="ml-2 capitalize">{selectedConflict.localChange.action}</span>
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedConflict.localChange.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  {/* 원격 변경사항 */}
                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                      다른 사용자 변경사항
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">작업자:</span>
                        <span className="ml-2 font-medium">{selectedConflict.remoteChange.userName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">시간:</span>
                        <span className="ml-2">{formatTimestamp(selectedConflict.remoteChange.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">작업:</span>
                        <span className="ml-2 capitalize">{selectedConflict.remoteChange.action}</span>
                      </div>
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedConflict.remoteChange.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 푸터 */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                onClick={onClose}
                disabled={isResolving}
              >
                나중에 처리
              </button>
              
              <div className="flex space-x-3">
                <button
                  className={clsx(
                    'px-4 py-2 border rounded-md transition-colors',
                    'border-blue-300 text-blue-700 hover:bg-blue-50',
                    'dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20',
                    isResolving && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleResolve('local')}
                  disabled={isResolving}
                >
                  내 변경사항 적용
                </button>
                
                <button
                  className={clsx(
                    'px-4 py-2 border rounded-md transition-colors',
                    'border-red-300 text-red-700 hover:bg-red-50',
                    'dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20',
                    isResolving && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleResolve('remote')}
                  disabled={isResolving}
                >
                  상대방 변경사항 적용
                </button>
                
                {/* 병합 옵션 (향후 구현) */}
                <button
                  className={clsx(
                    'px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed',
                    'dark:bg-gray-700 dark:text-gray-400'
                  )}
                  disabled={true}
                  title="병합 기능은 향후 구현 예정"
                >
                  수동 병합
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
})