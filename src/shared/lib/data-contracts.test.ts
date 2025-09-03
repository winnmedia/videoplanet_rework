// 데이터 계약 검증 테스트 - TDD Red Phase
import { describe, it, expect } from '@jest/globals'
import { 
  userDataContract,
  projectDataContract,
  planningDataContract,
  videoDataContract,
  commentDataContract,
  analyticsDataContract,
  pipelineProgressContract,
  dataExportContract,
  dataQualityContract,
  gdprDataContract
} from './data-contracts'

describe('Data Contracts - User Entity', () => {
  it('should validate correct user data', () => {
    const validUser = {
      id: 'usr_123456789',
      email: 'user@example.com',
      username: 'testuser',
      displayName: 'Test User',
      role: 'creator',
      profile: {
        bio: 'Test bio',
        location: 'Seoul, Korea',
        skills: ['video editing', 'motion graphics'],
        preferences: {
          theme: 'dark',
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
            quality: 'high',
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
        dataProcessingPurposes: ['service_provision', 'analytics'],
        retentionPeriod: 2592000000 // 30 days in ms
      },
      activityMetrics: {
        lastLoginAt: '2025-01-02T00:00:00Z',
        sessionCount: 15,
        totalWatchTime: 3600000, // 1 hour in ms
        projectsCreated: 3
      }
    }

    expect(() => userDataContract.parse(validUser)).not.toThrow()
    expect(userDataContract.safeParse(validUser).success).toBe(true)
  })

  it('should reject invalid user data - missing required fields', () => {
    const invalidUser = {
      id: 'usr_123',
      email: 'invalid-email',
      // missing username and role
    }

    const result = userDataContract.safeParse(invalidUser)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(3) // email format, username, role missing
    }
  })

  it('should enforce GDPR compliance fields', () => {
    const userWithoutGDPR = {
      id: 'usr_123456789',
      email: 'user@example.com',
      username: 'testuser',
      role: 'creator',
      // missing gdprConsent
    }

    const result = userDataContract.safeParse(userWithoutGDPR)
    expect(result.success).toBe(false)
  })
})

describe('Data Contracts - Project Entity', () => {
  it('should validate complete project data with all phases', () => {
    const validProject = {
      id: 'prj_123456789',
      name: 'Test Project',
      description: 'A comprehensive test project',
      status: 'in_progress',
      owner: {
        userId: 'usr_123456789',
        role: 'owner',
        joinedAt: '2025-01-01T00:00:00Z',
        permissions: {
          canEdit: true,
          canDelete: true,
          canInviteMembers: true,
          canManageSettings: true,
          canUploadVideos: true,
          canViewAnalytics: true
        }
      },
      members: [],
      settings: {
        visibility: 'private',
        allowComments: true,
        allowDownloads: false,
        videoQuality: 'high',
        collaboration: {
          allowGuestComments: false,
          requireApproval: true,
          notificationSettings: {
            newComments: true,
            statusChanges: true,
            memberChanges: true
          }
        }
      },
      pipeline: {
        currentPhase: 'planning',
        phases: [
          {
            id: 'phase_planning',
            name: 'Planning',
            status: 'completed',
            progress: 100,
            startedAt: '2025-01-01T00:00:00Z',
            completedAt: '2025-01-03T00:00:00Z',
            deliverables: ['project_brief.pdf', 'storyboard.pdf']
          },
          {
            id: 'phase_production',
            name: 'Production',
            status: 'in_progress',
            progress: 45,
            startedAt: '2025-01-03T00:00:00Z',
            deliverables: []
          }
        ],
        totalProgress: 72.5,
        estimatedCompletion: '2025-02-15T00:00:00Z'
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-10T00:00:00Z',
      isArchived: false
    }

    expect(() => projectDataContract.parse(validProject)).not.toThrow()
  })

  it('should validate pipeline progress calculations', () => {
    const progressData = {
      currentPhase: 'production',
      phases: [
        { id: '1', name: 'Planning', status: 'completed', progress: 100 },
        { id: '2', name: 'Production', status: 'in_progress', progress: 60 },
        { id: '3', name: 'Review', status: 'pending', progress: 0 }
      ],
      totalProgress: 53.33 // (100 + 60 + 0) / 3
    }

    expect(() => pipelineProgressContract.parse(progressData)).not.toThrow()
  })
})

describe('Data Contracts - Video Entity', () => {
  it('should validate video data with AI generation metadata', () => {
    const validVideo = {
      id: 'vid_123456789',
      projectId: 'prj_123456789',
      title: 'Test Video',
      description: 'AI Generated test video',
      filename: 'test_video.mp4',
      fileSize: 104857600, // 100MB
      duration: 300000, // 5 minutes in ms
      resolution: {
        width: 1920,
        height: 1080
      },
      format: 'mp4',
      quality: 'high',
      status: 'processed',
      uploadedBy: 'usr_123456789',
      aiGeneration: {
        model: 'gpt-4o-video',
        version: '1.0.0',
        prompt: 'Create a promotional video for a tech startup',
        generatedAt: '2025-01-10T00:00:00Z',
        processingTime: 45000, // 45 seconds
        qualityScore: 0.92,
        revisionHistory: [
          {
            version: 1,
            changes: 'Initial generation',
            timestamp: '2025-01-10T00:00:00Z'
          }
        ]
      },
      metadata: {
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        previewUrl: 'https://cdn.example.com/preview.mp4',
        transcription: 'Welcome to our innovative platform...',
        tags: ['promotional', 'startup', 'ai-generated'],
        language: 'en'
      },
      createdAt: '2025-01-10T00:00:00Z',
      updatedAt: '2025-01-10T00:00:00Z'
    }

    expect(() => videoDataContract.parse(validVideo)).not.toThrow()
  })
})

describe('Data Contracts - Analytics & Metrics', () => {
  it('should validate anonymized analytics data', () => {
    const analyticsData = {
      sessionId: 'session_anonymous_123',
      userId: null, // anonymized
      events: [
        {
          type: 'page_view',
          timestamp: '2025-01-10T00:00:00Z',
          properties: {
            page: '/dashboard',
            referrer: 'direct',
            userAgent: 'Mozilla/5.0...'
          },
          anonymized: true
        },
        {
          type: 'video_play',
          timestamp: '2025-01-10T00:01:00Z',
          properties: {
            videoId: 'vid_anonymous_456',
            duration: 30000,
            quality: 'high'
          },
          anonymized: true
        }
      ],
      metrics: {
        sessionDuration: 1800000, // 30 minutes
        pageViews: 5,
        videoWatchTime: 900000, // 15 minutes
        interactionCount: 12
      },
      gdprCompliant: true,
      retentionExpiry: '2025-02-09T00:00:00Z' // 30 days from collection
    }

    expect(() => analyticsDataContract.parse(analyticsData)).not.toThrow()
  })

  it('should validate data quality metrics', () => {
    const qualityMetrics = {
      timestamp: '2025-01-10T00:00:00Z',
      dataSource: 'user_uploads',
      metrics: {
        completeness: 0.95, // 95% of required fields present
        accuracy: 0.98, // 98% data accuracy
        consistency: 0.92, // 92% consistency across systems
        timeliness: 0.88, // 88% data freshness
        validity: 0.94 // 94% format compliance
      },
      violations: [
        {
          rule: 'email_format_validation',
          count: 3,
          severity: 'medium',
          examples: ['invalid-email-1', 'invalid-email-2']
        }
      ],
      recommendations: [
        'Implement stricter email validation at input',
        'Add data normalization for user names'
      ]
    }

    expect(() => dataQualityContract.parse(qualityMetrics)).not.toThrow()
  })
})

describe('Data Contracts - Export/Import System', () => {
  it('should validate data export package', () => {
    const exportPackage = {
      exportId: 'exp_123456789',
      userId: 'usr_123456789',
      requestedAt: '2025-01-10T00:00:00Z',
      completedAt: '2025-01-10T00:30:00Z',
      format: 'json',
      includePersonalData: false, // GDPR compliance
      data: {
        projects: [
          {
            id: 'prj_123456789',
            name: 'My Project',
            createdAt: '2025-01-01T00:00:00Z'
          }
        ],
        videos: [],
        comments: []
      },
      metadata: {
        version: '1.0.0',
        schema: 'vridge_export_v1',
        fileSize: 2048,
        checksum: 'sha256:abcd1234...',
        encryption: 'AES-256',
        expiresAt: '2025-01-17T00:00:00Z' // 7 days
      },
      gdprCompliant: true
    }

    expect(() => dataExportContract.parse(exportPackage)).not.toThrow()
  })
})