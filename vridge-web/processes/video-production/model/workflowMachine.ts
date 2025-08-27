/**
 * Video Production Workflow State Machine
 * Phase 3 - processes 레이어 구현
 */

import { setup, createMachine, assign } from 'xstate'

export type WorkflowStage = 
  | 'planning' 
  | 'scripting' 
  | 'storyboard' 
  | 'shooting' 
  | 'editing' 
  | 'post_production' 
  | 'review' 
  | 'delivery'

export interface WorkflowContext {
  projectId: string
  title: string
  completedStages: WorkflowStage[]
  currentProgress: number
  estimatedCompletionDays: number
  rejectionReason?: string
  pauseReason?: string
  lastNotification?: {
    type: string
    stage: WorkflowStage
    timestamp: Date
  }
  stageMetadata: {
    planning?: { approved: boolean }
    scripting?: { scriptLength: number }
    storyboard?: { scenesCount: number }
    shooting?: { footageHours: number }
    editing?: { cuts: number; duration: number }
    post_production?: { effects: number; audioMixed: boolean }
    review?: { approved: boolean; revisions: string[] }
    delivery?: { deliverables: string[] }
  }
  connectedWidgets: string[]
  widgetData: {
    videoPlanning?: { completionRate: number; tasks?: number; completed?: number }
    videoFeedback?: { pendingFeedback?: number; feedbackCount?: number; resolvedCount?: number }
  }
}

export type WorkflowEvent =
  | { type: 'COMPLETE_PLANNING'; approved: boolean; reason?: string }
  | { type: 'COMPLETE_SCRIPTING'; scriptLength: number }
  | { type: 'COMPLETE_STORYBOARD'; scenesCount: number }
  | { type: 'COMPLETE_SHOOTING'; footageHours: number }
  | { type: 'COMPLETE_EDITING'; cuts: number; duration: number }
  | { type: 'COMPLETE_POST_PRODUCTION'; effects: number; audioMixed: boolean }
  | { type: 'COMPLETE_REVIEW'; approved: boolean; revisions: string[] }
  | { type: 'COMPLETE_DELIVERY'; deliverables: string[] }
  | { type: 'ROLLBACK_TO_STAGE'; stage: WorkflowStage }
  | { type: 'PAUSE_WORKFLOW'; reason: string }
  | { type: 'RESUME_WORKFLOW' }
  | { type: 'SYNC_WITH_PLANNING_WIDGET'; data: { tasks: number; completed: number } }
  | { type: 'SYNC_WITH_FEEDBACK_WIDGET'; feedbackCount: number; resolvedCount: number }

// TODO(human): XState setup과 createMachine을 사용해서 videoProductionMachine을 완전히 구현해주세요
// 
// 구현해야 할 내용:
// 1. setup() 함수로 types, actions, guards 정의
// 2. 8개 상태: planning, scripting, storyboard, shooting, editing, post_production, review, delivery
// 3. 완료 상태: completed, 에러 상태: planning_revision, paused
// 4. 각 상태 전환 시 completedStages 업데이트, currentProgress 계산 (completedStages.length / 8 * 100)
// 5. 메타데이터 저장: stageMetadata에 각 단계별 데이터 저장
// 6. 알림 생성: lastNotification 업데이트 
// 7. 위젯 통합: connectedWidgets, widgetData 관리
// 8. 가드 조건: canRollback, isPlanningApproved 등
// 9. 에러 처리: planning rejection → planning_revision 상태
// 10. 일시정지/재개: paused 상태 및 이전 상태로 복구

export const videoProductionMachine = setup({
  types: {} as {
    context: WorkflowContext
    events: WorkflowEvent
    input: {
      projectId: string
      title: string
      widgetConnections?: { videoPlanning?: boolean; videoFeedback?: boolean }
    }
  },
  actions: {
    completeStage: assign(({ context }, params: { stage: WorkflowStage; metadata?: any }) => ({
      completedStages: [...context.completedStages, params.stage],
      currentProgress: ((context.completedStages.length + 1) / 8) * 100,
      stageMetadata: {
        ...context.stageMetadata,
        [params.stage]: params.metadata
      },
      lastNotification: {
        type: 'stage_completed',
        stage: params.stage,
        timestamp: new Date()
      }
    })),
    setRejection: assign((_, params: { reason?: string }) => ({
      rejectionReason: params.reason
    })),
    setPause: assign((_, params: { reason: string }) => ({
      pauseReason: params.reason
    })),
    rollbackToStage: assign(({ context }, params: { stage: WorkflowStage }) => {
      const stageOrder: WorkflowStage[] = ['planning', 'scripting', 'storyboard', 'shooting', 'editing', 'post_production', 'review', 'delivery']
      const targetIndex = stageOrder.indexOf(params.stage)
      const newCompletedStages = context.completedStages.filter(stage => 
        stageOrder.indexOf(stage) < targetIndex
      )
      return {
        completedStages: newCompletedStages,
        currentProgress: (newCompletedStages.length / 8) * 100
      }
    }),
    syncWithPlanning: assign(({ context }, params: { tasks: number; completed: number }) => ({
      widgetData: {
        ...context.widgetData,
        videoPlanning: {
          ...context.widgetData.videoPlanning,
          tasks: params.tasks,
          completed: params.completed,
          completionRate: params.completed / params.tasks
        }
      }
    })),
    syncWithFeedback: assign(({ context }, params: { feedbackCount: number; resolvedCount: number }) => ({
      widgetData: {
        ...context.widgetData,
        videoFeedback: {
          ...context.widgetData.videoFeedback,
          feedbackCount: params.feedbackCount,
          resolvedCount: params.resolvedCount,
          pendingFeedback: params.feedbackCount - params.resolvedCount
        }
      }
    })),
    connectReviewWidget: assign(({ context }) => ({
      connectedWidgets: [...context.connectedWidgets, 'videoFeedback']
    }))
  },
  guards: {
    isPlanningApproved: (_, params: { approved: boolean }) => params.approved,
    canRollback: ({ context }, params: { stage: WorkflowStage }) => {
      return context.completedStages.includes(params.stage)
    }
  }
}).createMachine({
  id: 'videoProduction',
  initial: 'planning',
  context: ({ input }) => ({
    projectId: input.projectId,
    title: input.title,
    completedStages: [],
    currentProgress: 0,
    estimatedCompletionDays: 30,
    stageMetadata: {},
    connectedWidgets: [
      ...(input.widgetConnections?.videoPlanning ? ['videoPlanning'] : []),
      ...(input.widgetConnections?.videoFeedback ? ['videoFeedback'] : [])
    ],
    widgetData: {}
  }),
  states: {
    planning: {
      on: {
        COMPLETE_PLANNING: [
          {
            guard: { type: 'isPlanningApproved', params: ({ event }) => ({ approved: event.approved }) },
            target: 'scripting',
            actions: { 
              type: 'completeStage', 
              params: ({ event }) => ({ stage: 'planning' as WorkflowStage, metadata: { approved: event.approved } })
            }
          },
          {
            target: 'planning_revision',
            actions: { type: 'setRejection', params: ({ event }) => ({ reason: event.reason }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        },
        SYNC_WITH_PLANNING_WIDGET: {
          actions: { type: 'syncWithPlanning', params: ({ event }) => event.data }
        }
      }
    },
    
    planning_revision: {
      on: {
        COMPLETE_PLANNING: [
          {
            guard: { type: 'isPlanningApproved', params: ({ event }) => ({ approved: event.approved }) },
            target: 'scripting',
            actions: { 
              type: 'completeStage', 
              params: ({ event }) => ({ stage: 'planning' as WorkflowStage, metadata: { approved: event.approved } })
            }
          }
        ]
      }
    },

    scripting: {
      on: {
        COMPLETE_SCRIPTING: {
          target: 'storyboard',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'scripting' as WorkflowStage, metadata: { scriptLength: event.scriptLength } })
          }
        },
        ROLLBACK_TO_STAGE: {
          target: 'planning',
          actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
        },
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    storyboard: {
      on: {
        COMPLETE_STORYBOARD: {
          target: 'shooting',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'storyboard' as WorkflowStage, metadata: { scenesCount: event.scenesCount } })
          }
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: 'planning' as WorkflowStage }) },
            target: 'planning',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          },
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: 'scripting' as WorkflowStage }) },
            target: 'scripting',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    shooting: {
      on: {
        COMPLETE_SHOOTING: {
          target: 'editing',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'shooting' as WorkflowStage, metadata: { footageHours: event.footageHours } })
          }
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: event.stage }) },
            target: 'planning',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    editing: {
      on: {
        COMPLETE_EDITING: {
          target: 'post_production',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'editing' as WorkflowStage, metadata: { cuts: event.cuts, duration: event.duration } })
          }
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: event.stage }) },
            target: 'shooting',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    post_production: {
      on: {
        COMPLETE_POST_PRODUCTION: {
          target: 'review',
          actions: [
            {
              type: 'completeStage',
              params: ({ event }) => ({ stage: 'post_production' as WorkflowStage, metadata: { effects: event.effects, audioMixed: event.audioMixed } })
            },
            'connectReviewWidget'
          ]
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: event.stage }) },
            target: 'editing',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    review: {
      on: {
        COMPLETE_REVIEW: {
          target: 'delivery',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'review' as WorkflowStage, metadata: { approved: event.approved, revisions: event.revisions } })
          }
        },
        SYNC_WITH_FEEDBACK_WIDGET: {
          actions: { 
            type: 'syncWithFeedback', 
            params: ({ event }) => ({ feedbackCount: event.feedbackCount, resolvedCount: event.resolvedCount })
          }
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: event.stage }) },
            target: 'post_production',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ],
        PAUSE_WORKFLOW: {
          target: 'paused',
          actions: { type: 'setPause', params: ({ event }) => ({ reason: event.reason }) }
        }
      }
    },

    delivery: {
      on: {
        COMPLETE_DELIVERY: {
          target: 'completed',
          actions: {
            type: 'completeStage',
            params: ({ event }) => ({ stage: 'delivery' as WorkflowStage, metadata: { deliverables: event.deliverables } })
          }
        },
        ROLLBACK_TO_STAGE: [
          {
            guard: { type: 'canRollback', params: ({ event }) => ({ stage: event.stage }) },
            target: 'review',
            actions: { type: 'rollbackToStage', params: ({ event }) => ({ stage: event.stage }) }
          }
        ]
      }
    },

    completed: {
      type: 'final'
    },

    paused: {
      on: {
        RESUME_WORKFLOW: [
          {
            target: 'planning',
            guard: ({ context }) => context.completedStages.length === 0
          },
          {
            target: 'scripting', 
            guard: ({ context }) => context.completedStages.includes('planning') && !context.completedStages.includes('scripting')
          },
          {
            target: 'storyboard',
            guard: ({ context }) => context.completedStages.includes('scripting') && !context.completedStages.includes('storyboard')
          },
          {
            target: 'shooting',
            guard: ({ context }) => context.completedStages.includes('storyboard') && !context.completedStages.includes('shooting')
          },
          {
            target: 'editing',
            guard: ({ context }) => context.completedStages.includes('shooting') && !context.completedStages.includes('editing')
          },
          {
            target: 'post_production',
            guard: ({ context }) => context.completedStages.includes('editing') && !context.completedStages.includes('post_production')
          },
          {
            target: 'review',
            guard: ({ context }) => context.completedStages.includes('post_production') && !context.completedStages.includes('review')
          },
          {
            target: 'delivery',
            guard: ({ context }) => context.completedStages.includes('review') && !context.completedStages.includes('delivery')
          }
        ]
      }
    }
  }
})