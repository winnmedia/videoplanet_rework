'use client';

/**
 * @fileoverview Reaction Bar Component
 * @module features/video-feedback/ui
 * 
 * 감정 반응 바 컴포넌트
 * - 다양한 감정 반응 타입
 * - 타임스탬프별 반응
 * - 애니메이션 효과
 */

import React, { useState, useCallback, useEffect } from 'react';

import { Reaction, ReactionType } from '../model/feedback.schema';

// ============================================================
// Types
// ============================================================

export interface ReactionBarProps {
  /**
   * 현재 반응 목록
   */
  reactions: Reaction[];
  
  /**
   * 현재 사용자 ID
   */
  currentUserId: string;
  
  /**
   * 현재 비디오 타임스탬프 (선택적)
   */
  currentTimestamp?: number;
  
  /**
   * 반응 추가 핸들러
   */
  onAddReaction: (type: ReactionType, timestamp?: number) => void;
  
  /**
   * 반응 제거 핸들러
   */
  onRemoveReaction: (reactionId: string) => void;
  
  /**
   * 타임스탬프 모드 (true면 현재 시간에 반응 추가)
   */
  timestampMode?: boolean;
  
  /**
   * 컴포넌트 비활성화
   */
  disabled?: boolean;
  
  /**
   * 커스텀 클래스명
   */
  className?: string;
}

// ============================================================
// Reaction Configuration
// ============================================================

// DoD 규격: 3종 리액션 (좋아요/싫어요/질문)
const REACTION_CONFIG: Record<ReactionType, {
  label: string;
  icon: JSX.Element;
  color: string;
  bgColor: string;
  hoverBgColor: string;
}> = {
  like: {
    label: '좋아요',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverBgColor: 'hover:bg-green-100'
  },
  dislike: {
    label: '싫어요',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hoverBgColor: 'hover:bg-red-100'
  },
  question: {
    label: '질문',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverBgColor: 'hover:bg-blue-100'
  }
};

// ============================================================
// Floating Reaction Animation Component
// ============================================================

interface FloatingReactionProps {
  type: ReactionType;
  onAnimationEnd: () => void;
}

const FloatingReaction: React.FC<FloatingReactionProps> = ({ type, onAnimationEnd }) => {
  useEffect(() => {
    const timer = setTimeout(onAnimationEnd, 1000);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);
  
  const config = REACTION_CONFIG[type];
  
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none animate-float-up"
      style={{
        animation: 'floatUp 1s ease-out forwards'
      }}
    >
      <div className={`${config.color} scale-150 opacity-0 animate-fade-in-out`}>
        {config.icon}
      </div>
    </div>
  );
};

// ============================================================
// Reaction Button Component
// ============================================================

interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({
  type,
  count,
  isActive,
  onClick,
  disabled = false
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const config = REACTION_CONFIG[type];
  
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
      if (!isActive) {
        setShowAnimation(true);
      }
    }
  }, [disabled, isActive, onClick]);
  
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
          ${isActive 
            ? `${config.bgColor} ${config.color}` 
            : `bg-neutral-100 text-neutral-600 ${config.hoverBgColor} hover:text-neutral-900`
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isActive ? 'ring-2 ring-offset-1 ring-current' : ''}
          hover:scale-105 active:scale-95
        `}
        aria-label={`${config.label} ${count > 0 ? `(${count})` : ''}`}
        aria-pressed={isActive}
      >
        <span className="flex items-center">
          {config.icon}
        </span>
        {count > 0 && (
          <span className="text-sm font-medium">
            {count}
          </span>
        )}
      </button>
      
      {showAnimation && (
        <FloatingReaction
          type={type}
          onAnimationEnd={() => setShowAnimation(false)}
        />
      )}
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  currentUserId,
  currentTimestamp,
  onAddReaction,
  onRemoveReaction,
  timestampMode = false,
  disabled = false,
  className = ''
}) => {
  // Calculate reaction counts and user reactions (DoD 규격: 3종)
  const reactionData = React.useMemo(() => {
    const data: Record<ReactionType, {
      count: number;
      userReactionId?: string;
      users: string[];
    }> = {
      like: { count: 0, users: [] },
      dislike: { count: 0, users: [] },
      question: { count: 0, users: [] }
    };
    
    reactions.forEach(reaction => {
      if (!timestampMode || 
          (reaction.timestamp !== undefined && 
           currentTimestamp !== undefined &&
           Math.abs(reaction.timestamp - currentTimestamp) < 1)) {
        data[reaction.type].count++;
        data[reaction.type].users.push(reaction.userName);
        
        if (reaction.userId === currentUserId) {
          data[reaction.type].userReactionId = reaction.id;
        }
      }
    });
    
    return data;
  }, [reactions, currentUserId, currentTimestamp, timestampMode]);
  
  const handleReactionClick = useCallback((type: ReactionType) => {
    const userReactionId = reactionData[type].userReactionId;
    
    if (userReactionId) {
      onRemoveReaction(userReactionId);
    } else {
      onAddReaction(type, timestampMode ? currentTimestamp : undefined);
    }
  }, [reactionData, onAddReaction, onRemoveReaction, timestampMode, currentTimestamp]);
  
  // Calculate total reactions
  const totalReactions = Object.values(reactionData).reduce((sum, data) => sum + data.count, 0);
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Reaction Buttons */}
      <div className="flex items-center gap-2">
        {(Object.keys(REACTION_CONFIG) as ReactionType[]).map(type => (
          <ReactionButton
            key={type}
            type={type}
            count={reactionData[type].count}
            isActive={!!reactionData[type].userReactionId}
            onClick={() => handleReactionClick(type)}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Total Count & Timestamp Indicator */}
      <div className="flex items-center gap-3 text-sm text-neutral-600">
        {totalReactions > 0 && (
          <span className="font-medium">
            총 {totalReactions}개의 반응
          </span>
        )}
        
        {timestampMode && currentTimestamp !== undefined && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            {formatTimestamp(currentTimestamp)}
          </span>
        )}
      </div>
      
      {/* Reaction Tooltips */}
      {Object.entries(reactionData).map(([type, data]) => {
        if (data.count === 0) return null;
        
        return (
          <div
            key={type}
            className="hidden group-hover:block absolute bottom-full mb-2 p-2 bg-neutral-900 text-white text-xs rounded-lg shadow-lg z-10"
            role="tooltip"
          >
            <div className="font-medium mb-1">
              {REACTION_CONFIG[type as ReactionType].label}
            </div>
            <div className="space-y-1">
              {data.users.slice(0, 5).map((userName, index) => (
                <div key={index}>{userName}</div>
              ))}
              {data.users.length > 5 && (
                <div>외 {data.users.length - 5}명</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Helper Functions
// ============================================================

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// Custom Animations (add to global CSS or Tailwind config)
// ============================================================

// Add these animations to your global CSS:
/*
@keyframes floatUp {
  0% {
    transform: translateX(-50%) translateY(0) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translateX(-50%) translateY(-30px) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) translateY(-60px) scale(1);
    opacity: 0;
  }
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
*/