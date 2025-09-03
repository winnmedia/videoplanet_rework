// DTO→ViewModel 변환 레이어 테스트 - TDD Red Phase
import { describe, it, expect } from '@jest/globals'
import {
  UserDtoMapper,
  ProjectDtoMapper,
  VideoDtoMapper,
  AnalyticsDtoMapper,
  PipelineDtoMapper
} from './data-mappers'

describe('UserDtoMapper', () => {
  it('should map server DTO to domain model safely', () => {
    const serverDto = {
      id: 'usr_123456789',
      email: 'user@example.com',
      username: 'testuser',
      display_name: 'Test User', // snake_case from server
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      role: 'creator',
      profile: {
        bio: 'Test bio',
        location: 'Seoul, Korea',
        website: 'https://example.com',
        skills: ['video editing', 'motion graphics'],
        preferences: {
          theme: 'dark',
          language: 'ko',
          notifications: {
            email: true,
            push: false,
            feedback_received: true, // snake_case
            project_updates: true,
            system_messages: false
          },
          video_settings: { // snake_case
            autoplay: false,
            quality: 'high',
            volume: 0.8,
            playback_speed: 1.0
          }
        }
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
      is_active: true,
      gdpr_consent: { // snake_case
        consent_given: true,
        consent_date: '2025-01-01T00:00:00Z',
        data_processing_purposes: ['service_provision', 'analytics'],
        retention_period: 2592000000
      },
      activity_metrics: { // snake_case
        last_login_at: '2025-01-02T00:00:00Z',
        session_count: 15,
        total_watch_time: 3600000,
        projects_created: 3,
        videos_uploaded: 5,
        comments_posted: 12
      }
    }

    const result = UserDtoMapper.fromDto(serverDto)

    expect(result.success).toBe(true)
    if (result.success) {
      const user = result.data
      expect(user.id).toBe('usr_123456789')
      expect(user.email).toBe('user@example.com')
      expect(user.displayName).toBe('Test User') // camelCase conversion
      expect(user.profile.preferences.videoSettings.playbackSpeed).toBe(1.0)
      expect(user.gdprConsent.consentGiven).toBe(true)
      expect(user.activityMetrics.totalWatchTime).toBe(3600000)
    }
  })

  it('should handle malformed DTO gracefully', () => {
    const malformedDto = {
      id: 'invalid-id', // invalid format
      email: 'not-an-email',
      username: '', // empty username
      role: 'invalid-role'
      // missing required fields
    }

    const result = UserDtoMapper.fromDto(malformedDto)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.violations).toHaveLength(4) // multiple validation errors
      expect(result.error.violations.some(v => v.field === 'id')).toBe(true)
      expect(result.error.violations.some(v => v.field === 'email')).toBe(true)
    }
  })

  it('should convert domain model to ViewModel for UI', () => {
    const domainUser = {
      id: 'usr_123456789',
      email: 'user@example.com',
      username: 'testuser',
      displayName: 'Test User',
      role: 'creator' as const,
      profile: {
        bio: 'Test bio',
        location: 'Seoul, Korea',
        skills: ['video editing'],
        preferences: {
          theme: 'dark' as const,
          language: 'ko',
          notifications: {
            email: true,
            push: false,
            feedbackReceived: true,
            projectUpdates: true,
            systemMessages: false
          },
          videoSettings: {
            autoplay: false,
            quality: 'high' as const,
            volume: 0.8,
            playbackSpeed: 1.0
          }
        }
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
      isActive: true,
      gdprConsent: {
        consentGiven: true,
        consentDate: '2025-01-01T00:00:00Z',
        dataProcessingPurposes: ['service_provision' as const, 'analytics' as const],
        retentionPeriod: 2592000000
      },
      activityMetrics: {
        sessionCount: 15,
        totalWatchTime: 3600000,
        projectsCreated: 3
      }
    }

    const viewModel = UserDtoMapper.toViewModel(domainUser)

    expect(viewModel.displayInfo.name).toBe('Test User')
    expect(viewModel.displayInfo.initials).toBe('TU')
    expect(viewModel.status.isOnline).toBe(false) // default value
    expect(viewModel.preferences.theme).toBe('dark')
    expect(viewModel.activity.totalHoursWatched).toBe(1) // converted from ms to hours
  })

  it('should sanitize data for GDPR compliance', () => {
    const userData = {
      id: 'usr_123456789',
      email: 'user@example.com',
      username: 'testuser',
      role: 'creator' as const,
      // ... other required fields
    }

    const sanitized = UserDtoMapper.sanitizeForGDPR(userData, {
      includePersonalData: false,
      includeAnalytics: true,
      retentionPeriod: 90
    })

    expect(sanitized.email).toBeUndefined() // PII removed
    expect(sanitized.username).toBeUndefined() // PII removed
    expect(sanitized.id).toMatch(/^usr_anonymous_/) // anonymized ID
  })
})

describe('ProjectDtoMapper', () => {
  it('should calculate pipeline progress accurately', () => {
    const projectDto = {
      id: 'prj_123456789',
      name: 'Test Project',
      status: 'in_progress',
      owner_id: 'usr_123456789',
      pipeline: {
        current_phase: 'production',
        phases: [
          {
            id: 'phase_planning',
            name: 'Planning',
            status: 'completed',
            progress: 100,
            started_at: '2025-01-01T00:00:00Z',
            completed_at: '2025-01-03T00:00:00Z'
          },
          {
            id: 'phase_production',
            name: 'Production',
            status: 'in_progress',
            progress: 60,
            started_at: '2025-01-03T00:00:00Z'
          },
          {
            id: 'phase_review',
            name: 'Review',
            status: 'pending',
            progress: 0
          }
        ]
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    }

    const result = ProjectDtoMapper.fromDto(projectDto)

    expect(result.success).toBe(true)
    if (result.success) {
      const viewModel = ProjectDtoMapper.toViewModel(result.data)
      expect(viewModel.progress.overall).toBe(53.33) // (100 + 60 + 0) / 3
      expect(viewModel.progress.currentPhase.name).toBe('Production')
      expect(viewModel.progress.currentPhase.progress).toBe(60)
      expect(viewModel.timeline.estimatedCompletion).toBeDefined()
    }
  })

  it('should handle project export data transformation', () => {
    const project = {
      id: 'prj_123456789',
      name: 'Export Test Project',
      // ... other fields
    }

    const exportData = ProjectDtoMapper.toExportFormat(project, {
      includeMembers: true,
      includeVideos: false,
      includeComments: false,
      format: 'json'
    })

    expect(exportData.metadata.version).toBe('1.0.0')
    expect(exportData.metadata.schema).toBe('vridge_project_v1')
    expect(exportData.data.project.id).toBe('prj_123456789')
    expect(exportData.data.videos).toBeUndefined() // excluded
  })
})

describe('VideoDtoMapper', () => {
  it('should transform video DTO with AI generation metadata', () => {
    const videoDto = {
      id: 'vid_123456789',
      project_id: 'prj_123456789',
      title: 'AI Generated Video',
      filename: 'ai_video.mp4',
      file_size: 104857600,
      duration_ms: 300000,
      resolution: { width: 1920, height: 1080 },
      format: 'mp4',
      status: 'processed',
      uploaded_by: 'usr_123456789',
      ai_generation: { // snake_case from server
        model: 'gpt-4o-video',
        version: '1.0.0',
        prompt: 'Create a promotional video',
        generated_at: '2025-01-10T00:00:00Z',
        processing_time: 45000,
        quality_score: 0.92,
        revision_history: [
          {
            version: 1,
            changes: 'Initial generation',
            timestamp: '2025-01-10T00:00:00Z'
          }
        ]
      },
      created_at: '2025-01-10T00:00:00Z'
    }

    const result = VideoDtoMapper.fromDto(videoDto)

    expect(result.success).toBe(true)
    if (result.success) {
      const viewModel = VideoDtoMapper.toViewModel(result.data)
      expect(viewModel.displayInfo.title).toBe('AI Generated Video')
      expect(viewModel.displayInfo.durationFormatted).toBe('5:00') // 5 minutes
      expect(viewModel.aiInfo).toBeDefined()
      expect(viewModel.aiInfo!.model).toBe('gpt-4o-video')
      expect(viewModel.aiInfo!.qualityScore).toBe(0.92)
    }
  })

  it('should generate video thumbnail and preview URLs', () => {
    const video = {
      id: 'vid_123456789',
      // ... other fields
    }

    const urls = VideoDtoMapper.generateUrls(video, {
      cdnBase: 'https://cdn.example.com',
      thumbnailSize: 'medium',
      previewDuration: 30
    })

    expect(urls.thumbnail).toBe('https://cdn.example.com/vid_123456789/thumb-medium.jpg')
    expect(urls.preview).toBe('https://cdn.example.com/vid_123456789/preview-30s.mp4')
    expect(urls.hls).toBe('https://cdn.example.com/vid_123456789/playlist.m3u8')
  })
})

describe('AnalyticsDtoMapper', () => {
  it('should anonymize analytics data for GDPR compliance', () => {
    const analyticsDto = {
      session_id: 'session_123456789',
      user_id: 'usr_123456789',
      events: [
        {
          type: 'video_play',
          timestamp: '2025-01-10T00:00:00Z',
          properties: {
            video_id: 'vid_123456789',
            duration: 30000,
            user_agent: 'Mozilla/5.0...'
          }
        }
      ],
      metrics: {
        session_duration: 1800000,
        page_views: 5,
        video_watch_time: 900000,
        interaction_count: 12
      }
    }

    const result = AnalyticsDtoMapper.fromDto(analyticsDto)

    expect(result.success).toBe(true)
    if (result.success) {
      const anonymized = AnalyticsDtoMapper.anonymize(result.data)
      expect(anonymized.userId).toBeNull()
      expect(anonymized.sessionId).toMatch(/^session_anonymous_/)
      expect(anonymized.gdprCompliant).toBe(true)
      expect(anonymized.events[0].properties.user_agent).toBeUndefined() // PII removed
    }
  })

  it('should aggregate analytics data by time periods', () => {
    const dailyData = [
      { date: '2025-01-01', pageViews: 100, watchTime: 3600000 },
      { date: '2025-01-02', pageViews: 120, watchTime: 4200000 },
      { date: '2025-01-03', pageViews: 80, watchTime: 2800000 }
    ]

    const aggregated = AnalyticsDtoMapper.aggregateMetrics(dailyData, {
      period: 'daily',
      metrics: ['pageViews', 'watchTime'],
      fillGaps: true
    })

    expect(aggregated.totalPageViews).toBe(300)
    expect(aggregated.averageWatchTime).toBe(3533333.33) // average across days
    expect(aggregated.dataPoints).toHaveLength(3)
  })
})

describe('PipelineDtoMapper', () => {
  it('should calculate realistic completion estimates', () => {
    const pipelineDto = {
      pipeline_id: 'pip_123456789',
      stages: [
        {
          id: 'stage_1',
          name: 'Planning',
          status: 'completed',
          started_at: '2025-01-01T00:00:00Z',
          completed_at: '2025-01-03T00:00:00Z' // 2 days
        },
        {
          id: 'stage_2',
          name: 'Production',
          status: 'in_progress',
          started_at: '2025-01-03T00:00:00Z',
          progress: 40 // 40% complete
        },
        {
          id: 'stage_3',
          name: 'Review',
          status: 'pending'
        }
      ]
    }

    const result = PipelineDtoMapper.fromDto(pipelineDto)

    expect(result.success).toBe(true)
    if (result.success) {
      const estimates = PipelineDtoMapper.calculateEstimates(result.data)
      
      // Based on Planning taking 2 days, estimate Production will take ~3.33 days total
      // With 40% complete, ~2 days remaining for Production + estimated Review time
      expect(estimates.estimatedCompletion).toBeDefined()
      expect(estimates.remainingStages).toBe(2)
      expect(estimates.confidence).toBeGreaterThan(0.5) // reasonable confidence
    }
  })

  it('should identify pipeline bottlenecks and blockers', () => {
    const pipeline = {
      stages: [
        {
          id: 'stage_1',
          status: 'completed',
          executionTime: 86400000 // 1 day
        },
        {
          id: 'stage_2',
          status: 'running',
          executionTime: 259200000, // 3 days (much longer than expected)
          errorCount: 5
        }
      ]
    }

    const analysis = PipelineDtoMapper.analyzePerformance(pipeline)

    expect(analysis.bottlenecks).toHaveLength(1)
    expect(analysis.bottlenecks[0].stageId).toBe('stage_2')
    expect(analysis.bottlenecks[0].severity).toBe('high')
    expect(analysis.recommendations).toContain('Review stage_2 configuration')
  })
})