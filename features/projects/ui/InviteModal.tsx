'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { InviteMembersSchema, type InviteMembers, type ProjectPermission } from '../model/project.schema';

interface InviteModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (emails: string[], permission: ProjectPermission, message?: string) => Promise<void>;
}

export const InviteModal = React.memo(function InviteModal({
  projectId,
  isOpen,
  onClose,
  onInvite
}: InviteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm<InviteMembers>({
    resolver: zodResolver(InviteMembersSchema),
    defaultValues: {
      projectId,
      emails: [],
      permission: 'viewer',
      message: ''
    }
  });

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const onSubmit = useCallback(async (data: InviteMembers) => {
    setIsSubmitting(true);
    try {
      await onInvite(data.emails, data.permission, data.message);
      reset();
      onClose();
    } catch (error) {
      setError('emails', {
        type: 'manual',
        message: '초대 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onInvite, reset, onClose, setError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* 모달 콘텐츠 */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-950">팀원 초대</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="invite-emails" className="block text-sm font-medium text-neutral-950 mb-2">
              이메일 주소 *
            </label>
            <textarea
              {...register('emails', {
                setValueAs: (value: string) => 
                  value.split('\n').map(email => email.trim()).filter(Boolean)
              })}
              id="invite-emails"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
              placeholder="초대할 이메일을 한 줄에 하나씩 입력하세요"
            />
            {errors.emails && (
              <p className="mt-1 text-sm text-error-500">
                {errors.emails.message}
              </p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              최대 20명까지 동시에 초대할 수 있습니다
            </p>
          </div>

          <div>
            <label htmlFor="invite-permission" className="block text-sm font-medium text-neutral-950 mb-2">
              권한 설정
            </label>
            <select
              {...register('permission')}
              id="invite-permission"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
            >
              <option value="viewer">뷰어 - 읽기 전용</option>
              <option value="editor">편집자 - 수정 가능</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              나중에 개별적으로 권한을 변경할 수 있습니다
            </p>
          </div>

          <div>
            <label htmlFor="invite-message" className="block text-sm font-medium text-neutral-950 mb-2">
              초대 메시지 (선택사항)
            </label>
            <textarea
              {...register('message')}
              id="invite-message"
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
              placeholder="초대받는 사람에게 보낼 메시지를 입력하세요"
            />
            {errors.message && (
              <p className="mt-1 text-sm text-error-500">
                {errors.message.message}
              </p>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 hover:text-neutral-950 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '초대 중...' : '초대하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// 초대 성공 토스트
export const InviteSuccessToast = React.memo(function InviteSuccessToast({ 
  count 
}: { 
  count: number 
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-success-100 border border-success-200 rounded-lg">
      <svg className="w-5 h-5 text-success-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-success-800">
        {count}명의 팀원을 초대했습니다
      </p>
    </div>
  );
});