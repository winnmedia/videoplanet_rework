/**
 * @fileoverview Video Feedback Redux Slice
 * @module features/video-feedback/model
 * 
 * 비디오 피드백 시스템의 Redux 상태 관리
 * - 세션 관리
 * - 코멘트/반응/마커 CRUD
 * - 실시간 업데이트 처리
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

import {
  VideoFeedbackSession,
  Comment,
  Reaction,
  TimeMarker,
  ReactionType,
  RealtimeEvent,
  PlayerState,
  CommentStatus
} from './feedback.schema';

// ============================================================
// State Types
// ============================================================

export interface VideoFeedbackState {
  // Current Session
  currentSession: VideoFeedbackSession | null;
  
  // Player State
  playerState: Partial<PlayerState>;
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Realtime Connection
  isConnected: boolean;
  connectionError: string | null;
  
  // Optimistic Updates Queue
  pendingUpdates: string[]; // IDs of items pending server confirmation
  
  // Filter & Sort Options
  commentFilter: {
    status: CommentStatus | 'all';
    hasTimestamp: boolean | null;
    searchQuery: string;
  };
  
  // Selected Items
  selectedMarkerId: string | null;
  selectedCommentId: string | null;
  
  // Upload Progress
  uploadProgress: {
    videoId: string | null;
    progress: number;
    status: string;
  };
}

// ============================================================
// Initial State
// ============================================================

const initialState: VideoFeedbackState = {
  currentSession: null,
  playerState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackSpeed: '1',
    isFullscreen: false,
    isBuffering: false,
    captionsEnabled: false
  },
  isLoading: false,
  isSaving: false,
  error: null,
  isConnected: false,
  connectionError: null,
  pendingUpdates: [],
  commentFilter: {
    status: 'all',
    hasTimestamp: null,
    searchQuery: ''
  },
  selectedMarkerId: null,
  selectedCommentId: null,
  uploadProgress: {
    videoId: null,
    progress: 0,
    status: 'idle'
  }
};

// ============================================================
// Async Thunks
// ============================================================

/**
 * 세션 로드
 */
export const loadSession = createAsyncThunk(
  'videoFeedback/loadSession',
  async (sessionId: string) => {
    const response = await fetch(`/api/video-feedback/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error('세션을 불러올 수 없습니다');
    }
    return await response.json() as VideoFeedbackSession;
  }
);

/**
 * 코멘트 추가
 */
export const addComment = createAsyncThunk(
  'videoFeedback/addComment',
  async (params: {
    sessionId: string;
    content: string;
    timestamp?: number;
    parentId?: string;
  }) => {
    const response = await fetch(`/api/video-feedback/sessions/${params.sessionId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: params.content,
        timestamp: params.timestamp,
        parentId: params.parentId
      })
    });
    
    if (!response.ok) {
      throw new Error('댓글 추가 실패');
    }
    return await response.json() as Comment;
  }
);

/**
 * 반응 추가
 */
export const addReaction = createAsyncThunk(
  'videoFeedback/addReaction',
  async (params: {
    sessionId: string;
    type: ReactionType;
    timestamp?: number;
  }) => {
    const response = await fetch(`/api/video-feedback/sessions/${params.sessionId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: params.type,
        timestamp: params.timestamp
      })
    });
    
    if (!response.ok) {
      throw new Error('반응 추가 실패');
    }
    return await response.json() as Reaction;
  }
);

/**
 * 마커 추가
 */
export const addMarker = createAsyncThunk(
  'videoFeedback/addMarker',
  async (params: {
    sessionId: string;
    timestamp: number;
    label: string;
    color?: string;
  }) => {
    const response = await fetch(`/api/video-feedback/sessions/${params.sessionId}/markers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: params.timestamp,
        label: params.label,
        color: params.color
      })
    });
    
    if (!response.ok) {
      throw new Error('마커 추가 실패');
    }
    return await response.json() as TimeMarker;
  }
);

// ============================================================
// Redux Slice
// ============================================================

const videoFeedbackSlice = createSlice({
  name: 'videoFeedback',
  initialState,
  reducers: {
    // Session Actions
    setCurrentSession: (state, action: PayloadAction<VideoFeedbackSession>) => {
      state.currentSession = action.payload;
      state.error = null;
    },
    
    clearSession: (state) => {
      state.currentSession = null;
      state.playerState = initialState.playerState;
      state.selectedMarkerId = null;
      state.selectedCommentId = null;
    },
    
    // Player State Updates
    updatePlayerState: (state, action: PayloadAction<Partial<PlayerState>>) => {
      state.playerState = {
        ...state.playerState,
        ...action.payload
      };
    },
    
    // Optimistic Comment Update
    optimisticAddComment: (state, action: PayloadAction<Comment>) => {
      if (state.currentSession) {
        state.currentSession.comments.push(action.payload);
        state.pendingUpdates.push(action.payload.id);
      }
    },
    
    optimisticUpdateComment: (state, action: PayloadAction<{ id: string; content: string }>) => {
      if (state.currentSession) {
        const comment = findCommentById(state.currentSession.comments, action.payload.id);
        if (comment) {
          comment.content = action.payload.content;
          comment.status = 'edited';
          state.pendingUpdates.push(action.payload.id);
        }
      }
    },
    
    optimisticDeleteComment: (state, action: PayloadAction<string>) => {
      if (state.currentSession) {
        const comment = findCommentById(state.currentSession.comments, action.payload);
        if (comment) {
          comment.status = 'deleted';
          state.pendingUpdates.push(action.payload);
        }
      }
    },
    
    // Optimistic Reaction Update
    optimisticAddReaction: (state, action: PayloadAction<Reaction>) => {
      if (state.currentSession) {
        state.currentSession.reactions.push(action.payload);
        state.pendingUpdates.push(action.payload.id);
      }
    },
    
    optimisticRemoveReaction: (state, action: PayloadAction<string>) => {
      if (state.currentSession) {
        const index = state.currentSession.reactions.findIndex(r => r.id === action.payload);
        if (index !== -1) {
          state.currentSession.reactions.splice(index, 1);
          state.pendingUpdates.push(action.payload);
        }
      }
    },
    
    // Optimistic Marker Update
    optimisticAddMarker: (state, action: PayloadAction<TimeMarker>) => {
      if (state.currentSession) {
        state.currentSession.markers.push(action.payload);
        state.pendingUpdates.push(action.payload.id);
      }
    },
    
    optimisticUpdateMarker: (state, action: PayloadAction<{ 
      id: string; 
      label: string; 
      color?: string 
    }>) => {
      if (state.currentSession) {
        const marker = state.currentSession.markers.find(m => m.id === action.payload.id);
        if (marker) {
          marker.label = action.payload.label;
          if (action.payload.color) {
            marker.color = action.payload.color;
          }
          state.pendingUpdates.push(action.payload.id);
        }
      }
    },
    
    optimisticDeleteMarker: (state, action: PayloadAction<string>) => {
      if (state.currentSession) {
        const index = state.currentSession.markers.findIndex(m => m.id === action.payload);
        if (index !== -1) {
          state.currentSession.markers.splice(index, 1);
          state.pendingUpdates.push(action.payload);
        }
      }
    },
    
    // Realtime Event Handling
    handleRealtimeEvent: (state, action: PayloadAction<RealtimeEvent>) => {
      if (!state.currentSession) return;
      
      const event = action.payload;
      
      switch (event.type) {
        case 'comment_added':
          if (!state.currentSession.comments.find(c => c.id === event.payload.id)) {
            state.currentSession.comments.push(event.payload);
          }
          break;
          
        case 'comment_updated':
          const commentToUpdate = findCommentById(state.currentSession.comments, event.payload.id);
          if (commentToUpdate) {
            Object.assign(commentToUpdate, event.payload);
          }
          break;
          
        case 'comment_deleted':
          const commentToDelete = findCommentById(state.currentSession.comments, event.payload.id);
          if (commentToDelete) {
            commentToDelete.status = 'deleted';
          }
          break;
          
        case 'reaction_added':
          if (!state.currentSession.reactions.find(r => r.id === event.payload.id)) {
            state.currentSession.reactions.push(event.payload);
          }
          break;
          
        case 'reaction_removed':
          const reactionIndex = state.currentSession.reactions.findIndex(
            r => r.id === event.payload.id
          );
          if (reactionIndex !== -1) {
            state.currentSession.reactions.splice(reactionIndex, 1);
          }
          break;
          
        case 'marker_added':
          if (!state.currentSession.markers.find(m => m.id === event.payload.id)) {
            state.currentSession.markers.push(event.payload);
          }
          break;
          
        case 'marker_updated':
          const markerToUpdate = state.currentSession.markers.find(
            m => m.id === event.payload.id
          );
          if (markerToUpdate) {
            Object.assign(markerToUpdate, event.payload);
          }
          break;
          
        case 'marker_deleted':
          const markerIndex = state.currentSession.markers.findIndex(
            m => m.id === event.payload.id
          );
          if (markerIndex !== -1) {
            state.currentSession.markers.splice(markerIndex, 1);
          }
          break;
          
        case 'participant_joined':
          if (!state.currentSession.participants.find(p => p.id === event.payload.id)) {
            state.currentSession.participants.push({
              ...event.payload,
              role: 'viewer',
              lastSeenAt: new Date().toISOString()
            });
          }
          break;
          
        case 'participant_left':
          const participantIndex = state.currentSession.participants.findIndex(
            p => p.id === event.payload.id
          );
          if (participantIndex !== -1) {
            state.currentSession.participants.splice(participantIndex, 1);
          }
          break;
      }
    },
    
    // Connection State
    setConnectionStatus: (state, action: PayloadAction<{ 
      isConnected: boolean; 
      error?: string 
    }>) => {
      state.isConnected = action.payload.isConnected;
      state.connectionError = action.payload.error || null;
    },
    
    // Confirm Pending Update
    confirmPendingUpdate: (state, action: PayloadAction<string>) => {
      const index = state.pendingUpdates.indexOf(action.payload);
      if (index !== -1) {
        state.pendingUpdates.splice(index, 1);
      }
    },
    
    // Filter Updates
    setCommentFilter: (state, action: PayloadAction<Partial<typeof initialState.commentFilter>>) => {
      state.commentFilter = {
        ...state.commentFilter,
        ...action.payload
      };
    },
    
    // Selection Updates
    selectMarker: (state, action: PayloadAction<string | null>) => {
      state.selectedMarkerId = action.payload;
    },
    
    selectComment: (state, action: PayloadAction<string | null>) => {
      state.selectedCommentId = action.payload;
    },
    
    // Upload Progress
    setUploadProgress: (state, action: PayloadAction<typeof initialState.uploadProgress>) => {
      state.uploadProgress = action.payload;
    },
    
    // Error Handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
  
  extraReducers: (builder) => {
    // Load Session
    builder
      .addCase(loadSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        state.isLoading = false;
      })
      .addCase(loadSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '세션 로드 실패';
      });
    
    // Add Comment
    builder
      .addCase(addComment.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        if (state.currentSession) {
          // Replace optimistic update with server response
          const optimisticIndex = state.currentSession.comments.findIndex(
            c => state.pendingUpdates.includes(c.id)
          );
          if (optimisticIndex !== -1) {
            state.currentSession.comments[optimisticIndex] = action.payload;
          } else {
            state.currentSession.comments.push(action.payload);
          }
        }
        state.isSaving = false;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || '댓글 추가 실패';
      });
    
    // Add Reaction
    builder
      .addCase(addReaction.fulfilled, (state, action) => {
        if (state.currentSession) {
          const optimisticIndex = state.currentSession.reactions.findIndex(
            r => state.pendingUpdates.includes(r.id)
          );
          if (optimisticIndex !== -1) {
            state.currentSession.reactions[optimisticIndex] = action.payload;
          } else {
            state.currentSession.reactions.push(action.payload);
          }
        }
      });
    
    // Add Marker
    builder
      .addCase(addMarker.fulfilled, (state, action) => {
        if (state.currentSession) {
          const optimisticIndex = state.currentSession.markers.findIndex(
            m => state.pendingUpdates.includes(m.id)
          );
          if (optimisticIndex !== -1) {
            state.currentSession.markers[optimisticIndex] = action.payload;
          } else {
            state.currentSession.markers.push(action.payload);
          }
        }
      });
  }
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * 중첩된 댓글에서 ID로 댓글 찾기
 */
function findCommentById(comments: Comment[], id: string): Comment | undefined {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    if (comment.replies) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ============================================================
// Exports
// ============================================================

export const {
  setCurrentSession,
  clearSession,
  updatePlayerState,
  optimisticAddComment,
  optimisticUpdateComment,
  optimisticDeleteComment,
  optimisticAddReaction,
  optimisticRemoveReaction,
  optimisticAddMarker,
  optimisticUpdateMarker,
  optimisticDeleteMarker,
  handleRealtimeEvent,
  setConnectionStatus,
  confirmPendingUpdate,
  setCommentFilter,
  selectMarker,
  selectComment,
  setUploadProgress,
  setError
} = videoFeedbackSlice.actions;

export default videoFeedbackSlice.reducer;