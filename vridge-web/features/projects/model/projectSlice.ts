import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import type { Project, ProjectFilter, ProjectListResponse, CreateProjectRequest, UpdateProject } from './project.schema';

// 상태 타입 정의
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  filter: ProjectFilter;
  totalCount: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';
}

// 초기 상태
const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  filter: {
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 12,
  },
  totalCount: 0,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  viewMode: 'grid',
};

// 비동기 액션들 (API 호출 시뮬레이션)
export const fetchProjects = createAsyncThunk<ProjectListResponse, ProjectFilter>(
  'projects/fetchProjects',
  async (filter) => {
    // TODO: 실제 API 호출로 대체
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 목업 데이터 반환
    const mockProjects: Project[] = Array.from({ length: filter.pageSize }, (_, i) => ({
      id: `project-${filter.page}-${i}`,
      title: `프로젝트 ${(filter.page - 1) * filter.pageSize + i + 1}`,
      description: '프로젝트 설명입니다. 이 프로젝트는 비디오 제작을 위한 협업 공간입니다.',
      thumbnailUrl: null,
      status: 'active' as const,
      members: [
        {
          id: 'member-1',
          userId: 'user-1',
          email: 'user1@example.com',
          name: '김철수',
          avatarUrl: null,
          permission: 'owner' as const,
          joinedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'member-2',
          userId: 'user-2',
          email: 'user2@example.com',
          name: '이영희',
          avatarUrl: null,
          permission: 'editor' as const,
          joinedAt: new Date().toISOString(),
          isActive: true,
        },
      ],
      memberCount: 5,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: 'user-1',
      tags: ['비디오', '마케팅'],
      settings: {
        isPublic: false,
        allowComments: true,
        allowDownloads: false,
        maxFileSize: 104857600,
        allowedFileTypes: ['mp4', 'mov', 'avi', 'mkv'],
      },
    }));

    return {
      data: mockProjects,
      total: 50,
      page: filter.page,
      pageSize: filter.pageSize,
      hasNext: filter.page * filter.pageSize < 50,
      hasPrev: filter.page > 1,
    };
  }
);

export const fetchProjectById = createAsyncThunk<Project, string>(
  'projects/fetchProjectById',
  async (projectId) => {
    // TODO: 실제 API 호출로 대체
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: projectId,
      title: '프로젝트 상세',
      description: '프로젝트 상세 설명입니다.',
      thumbnailUrl: null,
      status: 'active' as const,
      members: [],
      memberCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      ownerId: 'user-1',
      tags: [],
      settings: {
        isPublic: false,
        allowComments: true,
        allowDownloads: false,
        maxFileSize: 104857600,
        allowedFileTypes: ['mp4', 'mov', 'avi', 'mkv'],
      },
    };
  }
);

export const createProject = createAsyncThunk<Project, CreateProjectRequest>(
  'projects/createProject',
  async (projectData) => {
    // TODO: 실제 API 호출로 대체
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `project-${Date.now()}`,
      title: projectData.title,
      description: projectData.description || null,
      thumbnailUrl: null,
      status: 'active' as const,
      members: [],
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      ownerId: 'current-user',
      tags: projectData.tags || [],
      settings: {
        isPublic: projectData.isPublic,
        allowComments: projectData.allowComments,
        allowDownloads: projectData.allowDownloads,
        maxFileSize: projectData.maxFileSize,
        allowedFileTypes: projectData.allowedFileTypes,
      },
    };
  }
);

export const updateProject = createAsyncThunk<Project, { id: string; data: UpdateProject }>(
  'projects/updateProject',
  async ({ id, data }) => {
    // TODO: 실제 API 호출로 대체
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id,
      title: data.title || '업데이트된 프로젝트',
      description: data.description || null,
      thumbnailUrl: data.thumbnailUrl || null,
      status: data.status || 'active',
      members: data.members || [],
      memberCount: data.memberCount || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      ownerId: 'current-user',
      tags: data.tags || [],
      settings: data.settings || {
        isPublic: false,
        allowComments: true,
        allowDownloads: false,
        maxFileSize: 104857600,
        allowedFileTypes: ['mp4', 'mov', 'avi', 'mkv'],
      },
    };
  }
);

// Slice 정의
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    setFilter: (state, action: PayloadAction<Partial<ProjectFilter>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    resetFilter: (state) => {
      state.filter = initialState.filter;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchProjects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload.data;
        state.totalCount = action.payload.total;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '프로젝트 목록을 불러오는데 실패했습니다.';
      });

    // fetchProjectById
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '프로젝트를 불러오는데 실패했습니다.';
      });

    // createProject
    builder
      .addCase(createProject.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isCreating = false;
        state.projects.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message || '프로젝트 생성에 실패했습니다.';
      });

    // updateProject
    builder
      .addCase(updateProject.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message || '프로젝트 수정에 실패했습니다.';
      });
  },
});

export const { 
  setViewMode, 
  setFilter, 
  resetFilter, 
  clearError,
  setCurrentProject 
} = projectSlice.actions;

export default projectSlice.reducer;