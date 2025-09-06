'use client';

/**
 * @fileoverview Timeline Markers Component
 * @module features/video-feedback/ui
 * 
 * 타임라인 마커 관리 컴포넌트
 * - 마커 목록 표시
 * - 마커 추가/편집/삭제
 * - 색상 커스터마이징
 * - 타임스탬프 네비게이션
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import { TimeMarker } from '../model/feedback.schema';

// ============================================================
// Types
// ============================================================

export interface TimelineMarkersProps {
  /**
   * 마커 목록
   */
  markers: TimeMarker[];
  
  /**
   * 현재 비디오 시간
   */
  currentTime: number;
  
  /**
   * 비디오 총 길이
   */
  duration: number;
  
  /**
   * 마커 추가 핸들러
   */
  onAddMarker: (timestamp: number, label: string, color?: string) => void;
  
  /**
   * 마커 수정 핸들러
   */
  onUpdateMarker: (markerId: string, label: string, color?: string) => void;
  
  /**
   * 마커 삭제 핸들러
   */
  onDeleteMarker: (markerId: string) => void;
  
  /**
   * 마커 클릭 핸들러 (타임스탬프로 이동)
   */
  onMarkerClick: (timestamp: number) => void;
  
  /**
   * 마커 추가 가능 여부
   */
  canAddMarker?: boolean;
  
  /**
   * 마커 수정/삭제 가능 여부
   */
  canEditMarkers?: boolean;
  
  /**
   * 커스텀 클래스명
   */
  className?: string;
}

// ============================================================
// Color Palette
// ============================================================

const MARKER_COLORS = [
  { value: '#ef4444', label: '빨강' },
  { value: '#f97316', label: '주황' },
  { value: '#f59e0b', label: '노랑' },
  { value: '#10b981', label: '초록' },
  { value: '#3b82f6', label: '파랑' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#ec4899', label: '분홍' },
  { value: '#6b7280', label: '회색' }
];

// ============================================================
// Helper Functions
// ============================================================

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// ============================================================
// Marker Item Component
// ============================================================

interface MarkerItemProps {
  marker: TimeMarker;
  isActive: boolean;
  canEdit: boolean;
  onUpdate: (label: string, color?: string) => void;
  onDelete: () => void;
  onClick: () => void;
}

const MarkerItem: React.FC<MarkerItemProps> = ({
  marker,
  isActive,
  canEdit,
  onUpdate,
  onDelete,
  onClick
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(marker.label);
  const [editColor, setEditColor] = useState(marker.color || MARKER_COLORS[0].value);
  
  const handleSave = useCallback(() => {
    if (editLabel.trim()) {
      onUpdate(editLabel.trim(), editColor);
      setIsEditing(false);
    }
  }, [editLabel, editColor, onUpdate]);
  
  const handleCancel = useCallback(() => {
    setEditLabel(marker.label);
    setEditColor(marker.color || MARKER_COLORS[0].value);
    setIsEditing(false);
  }, [marker]);
  
  if (isEditing) {
    return (
      <div className="p-3 bg-neutral-50 rounded-lg">
        <div className="space-y-3">
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500"
            placeholder="마커 레이블"
            autoFocus
            aria-label="마커 레이블"
          />
          
          <div className="flex gap-2">
            {MARKER_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setEditColor(color.value)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  editColor === color.value
                    ? 'border-neutral-800 scale-110'
                    : 'border-transparent hover:border-neutral-400'
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={color.label}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!editLabel.trim()}
              className="px-3 py-1 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 disabled:opacity-50"
              aria-label="저장"
            >
              저장
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 border border-neutral-300 text-neutral-700 text-sm rounded-lg hover:bg-neutral-50"
              aria-label="취소"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={`
        group flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-200
        ${isActive 
          ? 'bg-vridge-50 ring-2 ring-vridge-500' 
          : 'hover:bg-neutral-50'
        }
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Color Indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: marker.color || MARKER_COLORS[0].value }}
        aria-hidden="true"
      />
      
      {/* Timestamp */}
      <span className="text-sm font-mono text-neutral-600 flex-shrink-0">
        {formatTimestamp(marker.timestamp)}
      </span>
      
      {/* Label */}
      <span className="text-sm text-neutral-900 flex-1 truncate">
        {marker.label}
      </span>
      
      {/* Actions */}
      {canEdit && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 text-neutral-500 hover:text-vridge-600"
            aria-label="마커 수정"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-neutral-500 hover:text-error-600"
            aria-label="마커 삭제"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Add Marker Form Component
// ============================================================

interface AddMarkerFormProps {
  timestamp: number;
  onAdd: (label: string, color: string) => void;
  onCancel: () => void;
}

const AddMarkerForm: React.FC<AddMarkerFormProps> = ({
  timestamp,
  onAdd,
  onCancel
}) => {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(MARKER_COLORS[0].value);
  
  const handleSubmit = useCallback(() => {
    if (label.trim()) {
      onAdd(label.trim(), color);
    }
  }, [label, color, onAdd]);
  
  return (
    <div className="p-4 bg-vridge-50 rounded-lg border border-vridge-200">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-vridge-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="font-medium text-sm text-neutral-900">
            새 마커 추가 ({formatTimestamp(timestamp)})
          </span>
        </div>
        
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500"
          placeholder="마커 레이블을 입력하세요"
          autoFocus
          aria-label="마커 레이블"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        
        <div className="flex gap-2">
          {MARKER_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c.value
                  ? 'border-neutral-800 scale-110'
                  : 'border-transparent hover:border-neutral-400'
              }`}
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
            />
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!label.trim()}
            className="px-3 py-1 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 disabled:opacity-50"
            aria-label="추가"
          >
            추가
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 border border-neutral-300 text-neutral-700 text-sm rounded-lg hover:bg-neutral-50"
            aria-label="취소"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  markers,
  currentTime,
  duration,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onMarkerClick,
  canAddMarker = true,
  canEditMarkers = true,
  className = ''
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Sort markers by timestamp
  const sortedMarkers = React.useMemo(
    () => [...markers].sort((a, b) => a.timestamp - b.timestamp),
    [markers]
  );
  
  // Find active marker based on current time
  useEffect(() => {
    const activeMarker = sortedMarkers.find(
      marker => Math.abs(marker.timestamp - currentTime) < 0.5
    );
    setActiveMarkerId(activeMarker?.id || null);
  }, [currentTime, sortedMarkers]);
  
  const handleAddMarker = useCallback((label: string, color: string) => {
    onAddMarker(currentTime, label, color);
    setShowAddForm(false);
  }, [currentTime, onAddMarker]);
  
  const handleMarkerClick = useCallback((marker: TimeMarker) => {
    onMarkerClick(marker.timestamp);
    setActiveMarkerId(marker.id);
  }, [onMarkerClick]);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">
          타임라인 마커
        </h3>
        
        {canAddMarker && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 transition-colors"
            aria-label="현재 시간에 마커 추가"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            마커 추가
          </button>
        )}
      </div>
      
      {/* Add Marker Form */}
      {showAddForm && (
        <AddMarkerForm
          timestamp={currentTime}
          onAdd={handleAddMarker}
          onCancel={() => setShowAddForm(false)}
        />
      )}
      
      {/* Markers List */}
      <div 
        ref={listRef}
        className="space-y-2 max-h-96 overflow-y-auto pr-2"
        role="list"
        aria-label="마커 목록"
      >
        {sortedMarkers.length > 0 ? (
          sortedMarkers.map(marker => (
            <MarkerItem
              key={marker.id}
              marker={marker}
              isActive={marker.id === activeMarkerId}
              canEdit={canEditMarkers}
              onUpdate={(label, color) => onUpdateMarker(marker.id, label, color)}
              onDelete={() => onDeleteMarker(marker.id)}
              onClick={() => handleMarkerClick(marker)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-neutral-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"
              />
            </svg>
            <p className="text-sm text-neutral-500">
              아직 마커가 없습니다
            </p>
            {canAddMarker && (
              <p className="text-xs text-neutral-400 mt-1">
                비디오를 재생하고 중요한 순간에 마커를 추가하세요
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Timeline Visualization */}
      {markers.length > 0 && (
        <div className="relative h-2 bg-neutral-200 rounded-full overflow-hidden">
          {/* Progress Bar */}
          <div
            className="absolute left-0 top-0 h-full bg-vridge-300 transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Marker Points */}
          {sortedMarkers.map(marker => (
            <button
              key={marker.id}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transform -translate-x-1/2 hover:scale-125 transition-transform"
              style={{
                left: `${(marker.timestamp / duration) * 100}%`,
                backgroundColor: marker.color || MARKER_COLORS[0].value
              }}
              onClick={() => handleMarkerClick(marker)}
              aria-label={`${marker.label} (${formatTimestamp(marker.timestamp)})`}
            />
          ))}
          
          {/* Current Position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-vridge-600 rounded-full shadow-lg transform -translate-x-1/2"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};