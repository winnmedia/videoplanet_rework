import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { 
  StoryProject, 
  FourActStructure, 
  TwelveShotPlan,
  StoryQualityMetrics,
  StoryGenerationRequest,
  StoryGenerationResult 
} from './types';
import type { StoryBriefing } from '@/shared/api/gemini';

export interface StoryState {
  projects: StoryProject[];
  currentProject: StoryProject | null;
  fourActStructures: FourActStructure[];
  twelveShots: TwelveShotPlan[];
  isLoading: boolean;
  error: string | null;
}

const initialState: StoryState = {
  projects: [],
  currentProject: null,
  fourActStructures: [],
  twelveShots: [],
  isLoading: false,
  error: null,
};

// 비동기 액션들
export const generateFourActStructureAsync = createAsyncThunk(
  'story/generateFourActStructure',
  async (briefing: StoryBriefing, { rejectWithValue }) => {
    try {
      // 실제 환경에서는 API를 호출하지만, 여기서는 임시로 모킹 데이터를 반환
      // const result = await storyGenerationApi.generateFourActStructure(briefing);
      
      // 임시 모킹 데이터
      const mockResult = {
        structure: {
          projectId: briefing.projectId,
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
          ] as [any, any, any, any],
          totalDuration: 210,
          createdAt: new Date(),
        } as FourActStructure,
        qualityMetrics: {
          consistency: 85,
          characterDevelopment: 78,
          narrativeFlow: 92,
          overallScore: 85,
        } as StoryQualityMetrics,
        suggestions: ['캐릭터 개발 강화 필요', '액션 시퀀스 추가 고려'],
      };

      return mockResult;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '4막 구조 생성 실패');
    }
  }
);

export const generateTwelveShotAsync = createAsyncThunk(
  'story/generateTwelveShot',
  async (
    { projectId, actId, actDescription }: { projectId: string; actId: string; actDescription: string },
    { rejectWithValue }
  ) => {
    try {
      // 실제 환경에서는 API를 호출하지만, 여기서는 임시로 모킹 데이터를 반환
      const mockResult: TwelveShotPlan = {
        projectId,
        actId,
        shots: [
          {
            id: 'shot-1',
            actId,
            title: '오프닝 샷',
            description: '도시의 전경을 보여주는 와이드 샷',
            duration: 5,
            cameraAngle: '와이드 샷',
            order: 1,
          },
          {
            id: 'shot-2',
            actId,
            title: '주인공 등장',
            description: '주인공이 걸어오는 미디움 샷',
            duration: 8,
            cameraAngle: '미디움 샷',
            action: '주인공이 카메라를 향해 걸어온다',
            order: 2,
          },
        ],
        totalDuration: 13,
        createdAt: new Date(),
      };

      return mockResult;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '12샷 계획 생성 실패');
    }
  }
);

export const storySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    // 프로젝트 관리
    createProject: (
      state,
      action: PayloadAction<{ title: string; description: string }>
    ) => {
      const newProject: StoryProject = {
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: action.payload.title,
        description: action.payload.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.projects.push(newProject);
    },

    setCurrentProject: (state, action: PayloadAction<string>) => {
      const project = state.projects.find(p => p.id === action.payload);
      state.currentProject = project || null;
    },

    // 4막 구조 생성 액션들
    generateFourActStructureStart: (
      state,
      action: PayloadAction<{ projectId: string; briefing: string }>
    ) => {
      state.isLoading = true;
      state.error = null;
    },

    generateFourActStructureSuccess: (
      state,
      action: PayloadAction<{
        fourActStructure: FourActStructure;
        qualityMetrics: StoryQualityMetrics;
        suggestions: string[];
      }>
    ) => {
      state.isLoading = false;
      state.fourActStructures.push(action.payload.fourActStructure);
      state.error = null;
    },

    generateFourActStructureFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // 12샷 세부 계획 생성 액션들
    generateTwelveShotStart: (
      state,
      action: PayloadAction<{ projectId: string; actId: string }>
    ) => {
      state.isLoading = true;
      state.error = null;
    },

    generateTwelveShotSuccess: (
      state,
      action: PayloadAction<TwelveShotPlan>
    ) => {
      state.isLoading = false;
      state.twelveShots.push(action.payload);
      state.error = null;
    },

    generateTwelveShotFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // 에러 클리어
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 4막 구조 생성 관련 액션들
      .addCase(generateFourActStructureAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateFourActStructureAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fourActStructures.push(action.payload.structure);
        state.error = null;
      })
      .addCase(generateFourActStructureAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // 12샷 계획 생성 관련 액션들
      .addCase(generateTwelveShotAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateTwelveShotAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.twelveShots.push(action.payload);
        state.error = null;
      })
      .addCase(generateTwelveShotAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  createProject,
  setCurrentProject,
  generateFourActStructureStart,
  generateFourActStructureSuccess,
  generateFourActStructureFailure,
  generateTwelveShotStart,
  generateTwelveShotSuccess,
  generateTwelveShotFailure,
  clearError,
} = storySlice.actions;

export const storyReducer = storySlice.reducer;