import { describe, expect, it } from '@jest/globals';
import { storyReducer, storySlice, StoryState } from './storySlice';
import { StoryProject, FourActStructure, StoryQualityMetrics } from './types';

describe('storySlice', () => {
  const initialState: StoryState = {
    projects: [],
    currentProject: null,
    fourActStructures: [],
    twelveShots: [],
    isLoading: false,
    error: null,
  };

  const mockProject: StoryProject = {
    id: 'test-project-1',
    title: '테스트 영상 프로젝트',
    description: '테스트용 영상 스토리보드',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFourActStructure: FourActStructure = {
    projectId: 'test-project-1',
    acts: [
      {
        id: 'act-1',
        title: '도입부',
        description: '주인공과 상황 소개',
        duration: 30,
        order: 1,
      },
      {
        id: 'act-2',
        title: '갈등 발생',
        description: '문제 상황의 등장',
        duration: 60,
        order: 2,
      },
      {
        id: 'act-3',
        title: '클라이맥스',
        description: '갈등의 절정',
        duration: 90,
        order: 3,
      },
      {
        id: 'act-4',
        title: '해결',
        description: '갈등 해결 및 마무리',
        duration: 30,
        order: 4,
      },
    ],
    totalDuration: 210,
    createdAt: new Date('2024-01-01'),
  };

  describe('초기 상태', () => {
    it('올바른 초기값을 가져야 한다', () => {
      expect(storySlice.getInitialState()).toEqual(initialState);
    });
  });

  describe('프로젝트 생성', () => {
    it('새 프로젝트를 생성해야 한다', () => {
      const action = storySlice.actions.createProject({
        title: '새 프로젝트',
        description: '프로젝트 설명',
      });

      const newState = storyReducer(initialState, action);

      expect(newState.projects).toHaveLength(1);
      expect(newState.projects[0].title).toBe('새 프로젝트');
      expect(newState.projects[0].description).toBe('프로젝트 설명');
      expect(newState.projects[0].id).toBeTruthy();
    });
  });

  describe('4막 구조 생성', () => {
    it('4막 구조 생성을 시작할 때 로딩 상태가 되어야 한다', () => {
      const action = storySlice.actions.generateFourActStructureStart({
        projectId: 'test-project-1',
        briefing: '액션 영화 스토리보드',
      });

      const newState = storyReducer(initialState, action);

      expect(newState.isLoading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('4막 구조 생성 성공 시 데이터를 저장해야 한다', () => {
      const loadingState = {
        ...initialState,
        isLoading: true,
      };

      const mockQualityMetrics: StoryQualityMetrics = {
        consistency: 85,
        characterDevelopment: 78,
        narrativeFlow: 92,
        overallScore: 85,
      };

      const action = storySlice.actions.generateFourActStructureSuccess({
        fourActStructure: mockFourActStructure,
        qualityMetrics: mockQualityMetrics,
        suggestions: ['캐릭터 개발 강화 필요', '액션 시퀀스 추가 고려'],
      });

      const newState = storyReducer(loadingState, action);

      expect(newState.isLoading).toBe(false);
      expect(newState.fourActStructures).toHaveLength(1);
      expect(newState.fourActStructures[0]).toEqual(mockFourActStructure);
      expect(newState.error).toBeNull();
    });

    it('4막 구조 생성 실패 시 에러를 저장해야 한다', () => {
      const loadingState = {
        ...initialState,
        isLoading: true,
      };

      const action = storySlice.actions.generateFourActStructureFailure(
        'API 호출 실패'
      );

      const newState = storyReducer(loadingState, action);

      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBe('API 호출 실패');
    });
  });

  describe('현재 프로젝트 설정', () => {
    it('현재 프로젝트를 설정해야 한다', () => {
      const stateWithProjects = {
        ...initialState,
        projects: [mockProject],
      };

      const action = storySlice.actions.setCurrentProject('test-project-1');
      const newState = storyReducer(stateWithProjects, action);

      expect(newState.currentProject).toEqual(mockProject);
    });
  });
});