'use client';

import React from 'react';

import { useAppSelector, useAppDispatch } from '@/shared/lib/redux/hooks';

import { ProjectCard } from './ProjectCard';
import { ProjectGrid } from './ProjectGrid';
import { fetchProjects, setViewMode } from '../model/projectSlice';

interface ProjectListProps {
  initialViewMode?: 'grid' | 'list';
}

export const ProjectList = React.memo(function ProjectList({ 
  initialViewMode = 'grid' 
}: ProjectListProps) {
  const dispatch = useAppDispatch();
  const { 
    projects, 
    isLoading, 
    error, 
    viewMode, 
    filter, 
    totalCount 
  } = useAppSelector(state => state.projects);

  // 초기 로드 및 필터 변경 시 재로드
  React.useEffect(() => {
    dispatch(fetchProjects(filter));
  }, [dispatch, filter]);

  // 뷰 모드 토글
  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    dispatch(setViewMode(mode));
  }, [dispatch]);

  // 로딩 상태
  if (isLoading && projects.length === 0) {
    return (
      <div className="space-y-4">
        {/* 뷰 모드 토글 스켈레톤 */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-neutral-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-neutral-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 프로젝트 카드 스켈레톤 */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg border border-neutral-300 overflow-hidden">
                <div className="aspect-video bg-neutral-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
                    <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
                  </div>
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="w-6 h-6 bg-neutral-200 rounded-full animate-pulse" />
                        ))}
                      </div>
                      <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg border border-neutral-300 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-neutral-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-neutral-200 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
                      <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 bg-neutral-200 rounded-full animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg 
          className="w-16 h-16 text-error-500 mb-4"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-neutral-950 mb-2">프로젝트를 불러올 수 없습니다</h3>
        <p className="text-sm text-neutral-700 mb-4">{error}</p>
        <button 
          onClick={() => dispatch(fetchProjects(filter))}
          className="px-4 py-2 bg-vridge-500 text-white rounded-lg hover:bg-vridge-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 빈 상태
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg 
          className="w-24 h-24 text-neutral-400 mb-4"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-neutral-950 mb-2">프로젝트가 없습니다</h3>
        <p className="text-sm text-neutral-700 mb-4">새 프로젝트를 생성하여 시작하세요</p>
      </div>
    );
  }

  return (
    <>
      {/* 뷰 모드 토글 및 결과 수 */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-neutral-700">
          총 <span className="font-semibold text-neutral-950">{totalCount}</span>개의 프로젝트
        </p>
        
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg">
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' 
                ? 'bg-white text-vridge-500 shadow-sm' 
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
            aria-label="그리드 뷰"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-white text-vridge-500 shadow-sm' 
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
            aria-label="리스트 뷰"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {viewMode === 'grid' ? (
        <ProjectGrid projects={projects} />
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              viewMode="list" 
            />
          ))}
        </div>
      )}
    </>
  );
});