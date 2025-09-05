'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { useAppDispatch } from '@/shared/lib/redux/hooks';

import {
  CreateProjectStep1Schema,
  CreateProjectStep2Schema,
  CreateProjectStep3Schema,
  type CreateProjectStep1,
  type CreateProjectStep2,
  type CreateProjectStep3,
  type CreateProjectRequest
} from '../model/project.schema';
import { createProject } from '../model/projectSlice';

interface CreateProjectFormProps {
  onCancel?: () => void;
  onSuccess?: (projectId: string) => void;
}

export const CreateProjectForm = React.memo(function CreateProjectForm({
  onCancel,
  onSuccess
}: CreateProjectFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateProjectRequest>>({});

  // Step 1 Form
  const step1Form = useForm<CreateProjectStep1>({
    resolver: zodResolver(CreateProjectStep1Schema),
    defaultValues: {
      title: formData.title || '',
      description: formData.description || '',
      tags: formData.tags || []
    }
  });

  // Step 2 Form
  const step2Form = useForm<CreateProjectStep2>({
    resolver: zodResolver(CreateProjectStep2Schema),
    defaultValues: {
      inviteEmails: formData.inviteEmails || [],
      defaultPermission: formData.defaultPermission || 'viewer'
    }
  });

  // Step 3 Form
  const step3Form = useForm<CreateProjectStep3>({
    resolver: zodResolver(CreateProjectStep3Schema),
    defaultValues: {
      isPublic: formData.isPublic ?? false,
      allowComments: formData.allowComments ?? true,
      allowDownloads: formData.allowDownloads ?? false,
      maxFileSize: formData.maxFileSize || 104857600,
      allowedFileTypes: formData.allowedFileTypes || ['mp4', 'mov', 'avi', 'mkv']
    }
  });

  // 단계별 진행
  const handleStep1Submit = useCallback((data: CreateProjectStep1) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  }, []);

  const handleStep2Submit = useCallback((data: CreateProjectStep2) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  }, []);

  const handleStep3Submit = useCallback(async (data: CreateProjectStep3) => {
    const finalData = { ...formData, ...data } as CreateProjectRequest;
    
    try {
      const result = await dispatch(createProject(finalData)).unwrap();
      if (onSuccess) {
        onSuccess(result.id);
      } else {
        router.push(`/projects/${result.id}`);
      }
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    }
  }, [formData, dispatch, onSuccess, router]);

  // 이전 단계로
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Progress Indicator
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            {step > 1 && (
              <div 
                className={`w-12 h-0.5 ${
                  step <= currentStep ? 'bg-vridge-500' : 'bg-neutral-300'
                }`}
              />
            )}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                step === currentStep
                  ? 'bg-vridge-500 text-white'
                  : step < currentStep
                  ? 'bg-vridge-100 text-vridge-700'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {step < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // Step Labels
  const stepLabels = ['기본 정보', '팀 초대', '프로젝트 설정'];

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressIndicator />
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-950 mb-2">
          {stepLabels[currentStep - 1]}
        </h2>
        <p className="text-sm text-neutral-700">
          단계 {currentStep} / 3
        </p>
      </div>

      {/* Step 1: 기본 정보 */}
      {currentStep === 1 && (
        <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-neutral-950 mb-2">
              프로젝트 제목 *
            </label>
            <input
              {...step1Form.register('title')}
              type="text"
              id="title"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
              placeholder="프로젝트 제목을 입력하세요"
            />
            {step1Form.formState.errors.title && (
              <p className="mt-1 text-sm text-error-500">
                {step1Form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-950 mb-2">
              프로젝트 설명
            </label>
            <textarea
              {...step1Form.register('description')}
              id="description"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
            />
            {step1Form.formState.errors.description && (
              <p className="mt-1 text-sm text-error-500">
                {step1Form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-neutral-950 mb-2">
              태그
            </label>
            <input
              {...step1Form.register('tags')}
              type="text"
              id="tags"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
              placeholder="태그를 쉼표로 구분하여 입력하세요"
            />
            <p className="mt-1 text-xs text-neutral-500">
              예: 마케팅, 비디오, 캠페인
            </p>
          </div>

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-neutral-700 hover:text-neutral-950 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
            >
              다음
            </button>
          </div>
        </form>
      )}

      {/* Step 2: 팀 초대 */}
      {currentStep === 2 && (
        <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
          <div>
            <label htmlFor="inviteEmails" className="block text-sm font-medium text-neutral-950 mb-2">
              팀원 초대
            </label>
            <textarea
              {...step2Form.register('inviteEmails')}
              id="inviteEmails"
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
              placeholder="초대할 이메일을 한 줄에 하나씩 입력하세요"
            />
            <p className="mt-1 text-xs text-neutral-500">
              나중에 프로젝트 설정에서 추가로 초대할 수 있습니다
            </p>
            {step2Form.formState.errors.inviteEmails && (
              <p className="mt-1 text-sm text-error-500">
                {step2Form.formState.errors.inviteEmails.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="defaultPermission" className="block text-sm font-medium text-neutral-950 mb-2">
              기본 권한
            </label>
            <select
              {...step2Form.register('defaultPermission')}
              id="defaultPermission"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
            >
              <option value="viewer">뷰어 - 읽기 전용</option>
              <option value="editor">편집자 - 수정 가능</option>
              <option value="owner">소유자 - 전체 권한</option>
            </select>
          </div>

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handlePreviousStep}
              className="px-6 py-2 text-neutral-700 hover:text-neutral-950 transition-colors"
            >
              이전
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleStep2Submit(step2Form.getValues())}
                className="px-6 py-2 text-vridge-500 hover:text-vridge-600 transition-colors"
              >
                건너뛰기
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: 프로젝트 설정 */}
      {currentStep === 3 && (
        <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                {...step3Form.register('isPublic')}
                type="checkbox"
                className="w-4 h-4 text-vridge-500 border-neutral-300 rounded focus:ring-vridge-500"
              />
              <div>
                <span className="text-sm font-medium text-neutral-950">공개 프로젝트</span>
                <p className="text-xs text-neutral-500">
                  링크를 아는 모든 사람이 프로젝트를 볼 수 있습니다
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                {...step3Form.register('allowComments')}
                type="checkbox"
                className="w-4 h-4 text-vridge-500 border-neutral-300 rounded focus:ring-vridge-500"
              />
              <div>
                <span className="text-sm font-medium text-neutral-950">댓글 허용</span>
                <p className="text-xs text-neutral-500">
                  팀원들이 프로젝트에 댓글을 남길 수 있습니다
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                {...step3Form.register('allowDownloads')}
                type="checkbox"
                className="w-4 h-4 text-vridge-500 border-neutral-300 rounded focus:ring-vridge-500"
              />
              <div>
                <span className="text-sm font-medium text-neutral-950">다운로드 허용</span>
                <p className="text-xs text-neutral-500">
                  팀원들이 프로젝트 파일을 다운로드할 수 있습니다
                </p>
              </div>
            </label>
          </div>

          <div>
            <label htmlFor="maxFileSize" className="block text-sm font-medium text-neutral-950 mb-2">
              최대 파일 크기
            </label>
            <select
              {...step3Form.register('maxFileSize', { valueAsNumber: true })}
              id="maxFileSize"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
            >
              <option value={52428800}>50MB</option>
              <option value={104857600}>100MB</option>
              <option value={524288000}>500MB</option>
              <option value={1073741824}>1GB</option>
              <option value={5368709120}>5GB</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              허용된 파일 형식
            </label>
            <div className="space-y-2">
              {['mp4', 'mov', 'avi', 'mkv', 'webm'].map(format => (
                <label key={format} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={format}
                    {...step3Form.register('allowedFileTypes')}
                    className="w-4 h-4 text-vridge-500 border-neutral-300 rounded focus:ring-vridge-500"
                  />
                  <span className="text-sm text-neutral-950">.{format}</span>
                </label>
              ))}
            </div>
            {step3Form.formState.errors.allowedFileTypes && (
              <p className="mt-1 text-sm text-error-500">
                {step3Form.formState.errors.allowedFileTypes.message}
              </p>
            )}
          </div>

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handlePreviousStep}
              className="px-6 py-2 text-neutral-700 hover:text-neutral-950 transition-colors"
            >
              이전
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
            >
              프로젝트 생성
            </button>
          </div>
        </form>
      )}
    </div>
  );
});