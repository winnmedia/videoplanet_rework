'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux';
import { 
  generateFourActStructureAsync, 
  generateTwelveShotAsync,
  createProject,
  type StoryState 
} from '@/entities/story';
import type { StoryBriefing } from '@/shared/api/gemini';

interface StoryGenerationFormProps {
  className?: string;
}

export function StoryGenerationForm({ className = '' }: StoryGenerationFormProps) {
  const dispatch = useAppDispatch();
  const { isLoading, error, fourActStructures, twelveShots } = useAppSelector(
    (state: { story: StoryState }) => state.story
  );

  const [formData, setFormData] = useState({
    title: '',
    briefing: '',
    genre: '',
    targetDuration: 60,
    targetAudience: '',
  });

  const [selectedActId, setSelectedActId] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'targetDuration' ? parseInt(value) || 60 : value,
    }));
  };

  const handleGenerateFourAct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.briefing.trim()) {
      alert('제목과 기획안을 입력해주세요.');
      return;
    }

    // 프로젝트 생성
    dispatch(createProject({
      title: formData.title,
      description: formData.briefing,
    }));

    // 4막 구조 생성
    const projectId = `project-${Date.now()}`;
    const briefing: StoryBriefing = {
      projectId,
      title: formData.title,
      briefing: formData.briefing,
      genre: formData.genre || undefined,
      targetDuration: formData.targetDuration || undefined,
      targetAudience: formData.targetAudience || undefined,
    };

    await dispatch(generateFourActStructureAsync(briefing));
  };

  const handleGenerateTwelveShot = async (actId: string, actDescription: string) => {
    if (!fourActStructures.length) return;

    const projectId = fourActStructures[fourActStructures.length - 1].projectId;
    
    await dispatch(generateTwelveShotAsync({
      projectId,
      actId,
      actDescription,
    }));
  };

  const latestStructure = fourActStructures[fourActStructures.length - 1];
  const latestTwelveShots = twelveShots[twelveShots.length - 1];

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-8 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          LLM 스토리 개발 시스템
        </h1>

        {/* 에러 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">오류: {error}</p>
          </div>
        )}

        {/* 프로젝트 생성 및 4막 구조 생성 폼 */}
        <form onSubmit={handleGenerateFourAct} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              프로젝트 제목 *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="예: 모험 다큐멘터리"
              required
            />
          </div>

          <div>
            <label htmlFor="briefing" className="block text-sm font-medium text-gray-700">
              기획안 *
            </label>
            <textarea
              id="briefing"
              name="briefing"
              value={formData.briefing}
              onChange={handleInputChange}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="스토리의 핵심 내용과 방향성을 설명해주세요..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700">
                장르
              </label>
              <select
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">선택 안함</option>
                <option value="드라마">드라마</option>
                <option value="액션">액션</option>
                <option value="코미디">코미디</option>
                <option value="다큐멘터리">다큐멘터리</option>
                <option value="SF">SF</option>
              </select>
            </div>

            <div>
              <label htmlFor="targetDuration" className="block text-sm font-medium text-gray-700">
                목표 길이 (분)
              </label>
              <input
                type="number"
                id="targetDuration"
                name="targetDuration"
                value={formData.targetDuration}
                onChange={handleInputChange}
                min="5"
                max="300"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
                타겟 대상
              </label>
              <input
                type="text"
                id="targetAudience"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="예: 20대 직장인"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '4막 구조 생성 중...' : '4막 구조 생성'}
          </button>
        </form>
      </div>

      {/* 4막 구조 결과 */}
      {latestStructure && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4막 구조</h2>
          <p className="text-sm text-gray-600 mb-4">총 길이: {latestStructure.totalDuration}분</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestStructure.acts.map((act, index) => (
              <div key={act.id} data-testid="act" className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {index + 1}막: {act.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{act.description}</p>
                <p className="text-xs text-gray-500 mb-3">길이: {act.duration}분</p>
                
                <button
                  onClick={() => handleGenerateTwelveShot(act.id, act.description)}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-1 px-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  12샷 생성
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12샷 결과 */}
      {latestTwelveShots && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12샷 상세 계획</h2>
          <p className="text-sm text-gray-600 mb-4">총 길이: {latestTwelveShots.totalDuration}초</p>
          
          <div className="space-y-4">
            {latestTwelveShots.shots.map((shot, index) => (
              <div key={shot.id} data-testid="shot" className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Shot {index + 1}: {shot.title}
                  </h3>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {shot.duration}초
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{shot.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500">
                  {shot.cameraAngle && (
                    <div><strong>카메라:</strong> {shot.cameraAngle}</div>
                  )}
                  {shot.dialogue && (
                    <div><strong>대사:</strong> {shot.dialogue}</div>
                  )}
                  {shot.action && (
                    <div><strong>액션:</strong> {shot.action}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}