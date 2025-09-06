'use client';

import Image from 'next/image';
import React, { useState, useCallback } from 'react';

import type { ProjectMember, ProjectPermission } from '../model/project.schema';

interface TeamMemberListProps {
  members: ProjectMember[];
  currentUserId: string;
  isOwner: boolean;
  onUpdatePermission?: (memberId: string, permission: ProjectPermission) => void;
  onRemoveMember?: (memberId: string) => void;
}

export const TeamMemberList = React.memo(function TeamMemberList({
  members,
  currentUserId,
  isOwner,
  onUpdatePermission,
  onRemoveMember
}: TeamMemberListProps) {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const handlePermissionChange = useCallback((memberId: string, permission: ProjectPermission) => {
    if (onUpdatePermission) {
      onUpdatePermission(memberId, permission);
      setEditingMemberId(null);
    }
  }, [onUpdatePermission]);

  const getPermissionBadge = (permission: ProjectPermission) => {
    const styles = {
      owner: 'bg-vridge-100 text-vridge-700',
      editor: 'bg-success-50 text-success-700',
      viewer: 'bg-neutral-100 text-neutral-700'
    };

    const labels = {
      owner: '소유자',
      editor: '편집자',
      viewer: '뷰어'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[permission]}`}>
        {labels[permission]}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {members.map(member => (
        <div 
          key={member.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-300"
        >
          <div className="flex items-center gap-3">
            {/* 아바타 */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-neutral-700">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* 멤버 정보 */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-neutral-950">
                  {member.name}
                </h4>
                {member.userId === currentUserId && (
                  <span className="text-xs text-neutral-500">(나)</span>
                )}
                {!member.isActive && (
                  <span className="text-xs text-error-500">비활성</span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 권한 표시/편집 */}
            {editingMemberId === member.id && isOwner && member.permission !== 'owner' ? (
              <select
                value={member.permission}
                onChange={(e) => handlePermissionChange(member.id, e.target.value as ProjectPermission)}
                onBlur={() => setEditingMemberId(null)}
                className="px-3 py-1 text-xs border border-neutral-300 rounded-full focus:outline-none focus:ring-2 focus:ring-vridge-500"
                autoFocus
              >
                <option value="editor">편집자</option>
                <option value="viewer">뷰어</option>
              </select>
            ) : (
              <button
                onClick={() => isOwner && member.permission !== 'owner' && setEditingMemberId(member.id)}
                disabled={!isOwner || member.permission === 'owner'}
                className={isOwner && member.permission !== 'owner' ? 'cursor-pointer' : 'cursor-default'}
              >
                {getPermissionBadge(member.permission)}
              </button>
            )}

            {/* 제거 버튼 */}
            {isOwner && member.permission !== 'owner' && member.userId !== currentUserId && (
              <button
                onClick={() => onRemoveMember?.(member.id)}
                className="p-1.5 text-neutral-500 hover:text-error-500 transition-colors"
                aria-label="멤버 제거"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-neutral-500">아직 팀 멤버가 없습니다</p>
        </div>
      )}
    </div>
  );
});

// 팀 멤버 리스트 스켈레톤
export const TeamMemberListSkeleton = React.memo(function TeamMemberListSkeleton({ 
  count = 3 
}: { 
  count?: number 
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse" />
            <div>
              <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-32 bg-neutral-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
});