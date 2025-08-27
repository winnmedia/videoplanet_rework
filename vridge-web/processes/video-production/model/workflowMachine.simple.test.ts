/**
 * Video Production Workflow - Simple Test
 * Phase 3 - TDD Green 단계 (단순 테스트부터 시작)
 */

import { describe, it, expect } from 'vitest'
import { createActor } from 'xstate'

import { videoProductionMachine } from './workflowMachine'

describe('VideoProductionWorkflow StateMachine - Simple Tests', () => {
  it('should create and start successfully', () => {
    const actor = createActor(videoProductionMachine, {
      input: { projectId: 'test-123', title: 'Test Project' }
    })
    
    expect(() => actor.start()).not.toThrow()
    expect(actor.getSnapshot().value).toBe('planning')
  })

  it('should have correct initial context', () => {
    const actor = createActor(videoProductionMachine, {
      input: { projectId: 'test-123', title: 'Test Project' }
    })
    actor.start()
    
    const context = actor.getSnapshot().context
    expect(context.projectId).toBe('test-123')
    expect(context.title).toBe('Test Project')
    expect(context.completedStages).toEqual([])
    expect(context.currentProgress).toBe(0)
  })

  it('should transition from planning to scripting when approved', () => {
    const actor = createActor(videoProductionMachine, {
      input: { projectId: 'test-123', title: 'Test Project' }
    })
    actor.start()
    
    // Send planning completion event
    actor.send({ type: 'COMPLETE_PLANNING', approved: true })
    
    // Should transition to scripting
    expect(actor.getSnapshot().value).toBe('scripting')
  })
})