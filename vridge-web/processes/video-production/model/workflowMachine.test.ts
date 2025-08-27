/**
 * Video Production Workflow State Machine Tests
 * Phase 3 - TDD Red Stage
 */

import { describe, it, expect, vi } from 'vitest'
import { createActor } from 'xstate'

import { videoProductionMachine } from './workflowMachine'

describe('VideoProductionWorkflow StateMachine', () => {
  describe('초기 상태 및 기본 동작', () => {
    it('should start in PLANNING state', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      expect(actor.getSnapshot().value).toBe('planning')
    })

    it('should have project metadata in context', () => {
      const actor = createActor(videoProductionMachine, {
        input: { projectId: 'test-123', title: 'Test Project' }
      })
      actor.start()
      const context = actor.getSnapshot().context
      expect(context.projectId).toBe('test-123')
      expect(context.title).toBe('Test Project')
    })

    it('should initialize with empty progress tracking', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      const context = actor.getSnapshot().context
      expect(context.completedStages).toEqual([])
      expect(context.currentProgress).toBe(0)
    })
  })

  describe('워크플로우 8단계 전환', () => {
    it('should transition from PLANNING to SCRIPTING', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      expect(actor.getSnapshot().value).toBe('scripting')
      expect(actor.getSnapshot().context.completedStages).toContain('planning')
    })

    it('should transition SCRIPTING → STORYBOARD → SHOOTING', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      // Planning → Scripting
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      expect(actor.getSnapshot().value).toBe('scripting')
      
      // Scripting → Storyboard
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      expect(actor.getSnapshot().value).toBe('storyboard')
      
      // Storyboard → Shooting
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      expect(actor.getSnapshot().value).toBe('shooting')
      
      const context = actor.getSnapshot().context
      expect(context.completedStages).toEqual(['planning', 'scripting', 'storyboard'])
      expect(context.currentProgress).toBe(37.5) // 3/8 = 37.5%
    })

    it('should complete full workflow: SHOOTING → EDITING → POST_PRODUCTION → REVIEW → DELIVERY', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      // Complete first 3 stages
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      
      // Complete remaining stages
      actor.send({ type: 'COMPLETE_SHOOTING', footageHours: 4 })
      expect(actor.getSnapshot().value).toBe('editing')
      
      actor.send({ type: 'COMPLETE_EDITING', cuts: 45, duration: 90 })
      expect(actor.getSnapshot().value).toBe('post_production')
      
      actor.send({ type: 'COMPLETE_POST_PRODUCTION', effects: 12, audioMixed: true })
      expect(actor.getSnapshot().value).toBe('review')
      
      actor.send({ type: 'COMPLETE_REVIEW', approved: true, revisions: [] })
      expect(actor.getSnapshot().value).toBe('delivery')
      
      actor.send({ type: 'COMPLETE_DELIVERY', deliverables: ['mp4', 'mov'] })
      expect(actor.getSnapshot().value).toBe('completed')
      
      const context = actor.getSnapshot().context
      expect(context.currentProgress).toBe(100)
      expect(context.completedStages).toHaveLength(8)
    })
  })

  describe('에러 처리 및 롤백', () => {
    it('should handle planning rejection', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: false, reason: 'Budget issues' })
      expect(actor.getSnapshot().value).toBe('planning_revision')
      expect(actor.getSnapshot().context.rejectionReason).toBe('Budget issues')
    })

    it('should allow rollback to previous stage', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      // Progress to editing
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      actor.send({ type: 'COMPLETE_SHOOTING', footageHours: 4 })
      
      expect(actor.getSnapshot().value).toBe('editing')
      
      // Rollback to shooting
      actor.send({ type: 'ROLLBACK_TO_STAGE', stage: 'shooting' })
      expect(actor.getSnapshot().value).toBe('shooting')
      expect(actor.getSnapshot().context.completedStages).toEqual(['planning', 'scripting', 'storyboard'])
    })

    it('should pause workflow and resume', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      actor.send({ type: 'PAUSE_WORKFLOW', reason: 'Resource unavailable' })
      
      expect(actor.getSnapshot().value).toBe('paused')
      expect(actor.getSnapshot().context.pauseReason).toBe('Resource unavailable')
      
      actor.send({ type: 'RESUME_WORKFLOW' })
      expect(actor.getSnapshot().value).toBe('scripting')
    })
  })

  describe('진행률 계산 및 메타데이터', () => {
    it('should calculate progress percentage correctly', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      expect(actor.getSnapshot().context.currentProgress).toBe(0)
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      expect(actor.getSnapshot().context.currentProgress).toBe(12.5) // 1/8
      
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      expect(actor.getSnapshot().context.currentProgress).toBe(25) // 2/8
      
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      expect(actor.getSnapshot().context.currentProgress).toBe(37.5) // 3/8
    })

    it('should track stage metadata correctly', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      actor.send({ type: 'COMPLETE_SHOOTING', footageHours: 4 })
      
      const context = actor.getSnapshot().context
      expect(context.stageMetadata.scripting.scriptLength).toBe(120)
      expect(context.stageMetadata.storyboard.scenesCount).toBe(8)
      expect(context.stageMetadata.shooting.footageHours).toBe(4)
    })

    it('should estimate completion time based on progress', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      // Complete 4 stages (50%)
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      actor.send({ type: 'COMPLETE_SCRIPTING', scriptLength: 120 })
      actor.send({ type: 'COMPLETE_STORYBOARD', scenesCount: 8 })
      actor.send({ type: 'COMPLETE_SHOOTING', footageHours: 4 })
      
      const context = actor.getSnapshot().context
      expect(context.currentProgress).toBe(50)
      expect(context.estimatedCompletionDays).toBeGreaterThan(0)
    })
  })

  describe('외부 시스템 통합', () => {
    it('should trigger notifications on stage completion', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      const notificationSpy = vi.fn()
      actor.subscribe(state => {
        if (state.context.lastNotification) {
          notificationSpy(state.context.lastNotification)
        }
      })
      
      actor.send({ type: 'COMPLETE_PLANNING', approved: true })
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stage_completed',
          stage: 'planning'
        })
      )
    })

    it('should integrate with VideoPlanning widget', () => {
      const actor = createActor(videoProductionMachine, {
        input: { 
          projectId: 'test-123',
          widgetConnections: { videoPlanning: true }
        }
      })
      actor.start()
      
      // 기획 단계에서는 VideoPlanning 위젯과 연동
      expect(actor.getSnapshot().context.connectedWidgets).toContain('videoPlanning')
      
      actor.send({ type: 'SYNC_WITH_PLANNING_WIDGET', data: { tasks: 5, completed: 3 } })
      expect(actor.getSnapshot().context.widgetData.videoPlanning.completionRate).toBe(0.6)
    })

    it('should integrate with VideoFeedback widget during review', () => {
      const actor = createActor(videoProductionMachine)
      actor.start()
      
      // Progress to review stage
      ['COMPLETE_PLANNING', 'COMPLETE_SCRIPTING', 'COMPLETE_STORYBOARD', 
       'COMPLETE_SHOOTING', 'COMPLETE_EDITING', 'COMPLETE_POST_PRODUCTION'].forEach(event => {
        actor.send({ type: event, approved: true })
      })
      
      expect(actor.getSnapshot().value).toBe('review')
      expect(actor.getSnapshot().context.connectedWidgets).toContain('videoFeedback')
      
      actor.send({ type: 'SYNC_WITH_FEEDBACK_WIDGET', feedbackCount: 3, resolvedCount: 2 })
      expect(actor.getSnapshot().context.widgetData.videoFeedback.pendingFeedback).toBe(1)
    })
  })
})