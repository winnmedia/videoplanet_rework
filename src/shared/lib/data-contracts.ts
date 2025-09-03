/**
 * VLANET 데이터 계약 정의 - Zod 스키마 기반
 * 
 * 모든 데이터 엔티티의 런타임 검증, GDPR 준수, 데이터 품질 관리를 위한
 * 계약 정의입니다. 이 스키마들은 CI에서 자동 검증되며, 
 * 계약 위반 시 빌드가 실패합니다.
 */

import { z } from 'zod'

// =============================================================================
// 기본 공통 스키마
// =============================================================================

const timestampSchema = z.string().datetime()
const idSchema = z.string().min(3).regex(/^[a-z]+_[a-zA-Z0-9]+$/)
const emailSchema = z.string().email()
const urlSchema = z.string().url()

// =============================================================================
// GDPR 및 개인정보 보호 스키마
// =============================================================================

const gdprConsentSchema = z.object({
  consentGiven: z.boolean(),
  consentDate: timestampSchema,
  dataProcessingPurposes: z.array(z.enum([
    'service_provision',
    'analytics',
    'marketing',
    'support',
    'legal_compliance'
  ])),
  retentionPeriod: z.number().positive(), // milliseconds
  withdrawalDate: timestampSchema.optional()
})

// =============================================================================
// User Entity 데이터 계약
// =============================================================================

const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().length(2), // ISO 639-1
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    feedbackReceived: z.boolean(),
    projectUpdates: z.boolean(),
    systemMessages: z.boolean()
  }),
  videoSettings: z.object({
    autoplay: z.boolean(),
    quality: z.enum(['auto', 'high', 'medium', 'low']),
    volume: z.number().min(0).max(1),
    playbackSpeed: z.number().positive()
  })
})

const userProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: urlSchema.optional(),
  skills: z.array(z.string().max(50)),
  preferences: userPreferencesSchema
})

const activityMetricsSchema = z.object({
  lastLoginAt: timestampSchema.optional(),
  sessionCount: z.number().nonnegative(),
  totalWatchTime: z.number().nonnegative(), // milliseconds
  projectsCreated: z.number().nonnegative(),
  videosUploaded: z.number().nonnegative().optional(),
  commentsPosted: z.number().nonnegative().optional()
})

export const userDataContract = z.object({
  id: idSchema,
  email: emailSchema,
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().max(100).optional(),
  avatar: urlSchema.optional(),
  role: z.enum(['admin', 'manager', 'creator', 'reviewer', 'viewer']),
  profile: userProfileSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isActive: z.boolean(),
  gdprConsent: gdprConsentSchema,
  activityMetrics: activityMetricsSchema
})

// =============================================================================
// Project Entity 데이터 계약
// =============================================================================

const projectMemberSchema = z.object({
  userId: idSchema,
  role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
  joinedAt: timestampSchema,
  permissions: z.object({
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canInviteMembers: z.boolean(),
    canManageSettings: z.boolean(),
    canUploadVideos: z.boolean(),
    canViewAnalytics: z.boolean()
  })
})

const projectPhaseSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  progress: z.number().min(0).max(100),
  startedAt: timestampSchema.optional(),
  completedAt: timestampSchema.optional(),
  deliverables: z.array(z.string()),
  dependencies: z.array(idSchema).optional()
})

const pipelineSchema = z.object({
  currentPhase: z.string(),
  phases: z.array(projectPhaseSchema).min(1),
  totalProgress: z.number().min(0).max(100),
  estimatedCompletion: timestampSchema.optional(),
  blockers: z.array(z.object({
    id: idSchema,
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    reportedAt: timestampSchema,
    resolvedAt: timestampSchema.optional()
  })).optional()
})

export const projectDataContract = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'planning', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold']),
  owner: projectMemberSchema,
  members: z.array(projectMemberSchema),
  settings: z.object({
    visibility: z.enum(['public', 'private', 'team']),
    allowComments: z.boolean(),
    allowDownloads: z.boolean(),
    videoQuality: z.enum(['low', 'medium', 'high', 'ultra']),
    collaboration: z.object({
      allowGuestComments: z.boolean(),
      requireApproval: z.boolean(),
      notificationSettings: z.object({
        newComments: z.boolean(),
        statusChanges: z.boolean(),
        memberChanges: z.boolean()
      })
    })
  }),
  pipeline: pipelineSchema,
  metadata: z.object({
    tags: z.array(z.string().max(50)),
    category: z.enum(['marketing', 'education', 'entertainment', 'corporate', 'documentary', 'other']),
    estimatedDuration: z.number().positive().optional(),
    actualDuration: z.number().positive().optional(),
    budget: z.object({
      amount: z.number().positive(),
      currency: z.string().length(3), // ISO 4217
      allocated: z.number().nonnegative(),
      spent: z.number().nonnegative()
    }).optional(),
    deliverables: z.array(z.string())
  }),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isArchived: z.boolean()
})

// =============================================================================
// Planning Entity 데이터 계약
// =============================================================================

export const planningDataContract = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
  type: z.enum(['brief', 'storyboard', 'script', 'schedule', 'budget']),
  version: z.number().positive(),
  status: z.enum(['draft', 'review', 'approved', 'rejected']),
  author: idSchema,
  reviewers: z.array(idSchema),
  attachments: z.array(z.object({
    id: idSchema,
    filename: z.string(),
    fileSize: z.number().positive(),
    mimeType: z.string(),
    url: urlSchema
  })),
  revisionHistory: z.array(z.object({
    version: z.number().positive(),
    changes: z.string(),
    author: idSchema,
    timestamp: timestampSchema
  })),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

// =============================================================================
// Video Entity 데이터 계약 (AI 생성 메타데이터 포함)
// =============================================================================

const aiGenerationMetadataSchema = z.object({
  model: z.string(),
  version: z.string(),
  prompt: z.string().max(2000),
  generatedAt: timestampSchema,
  processingTime: z.number().positive(), // milliseconds
  qualityScore: z.number().min(0).max(1),
  revisionHistory: z.array(z.object({
    version: z.number().positive(),
    changes: z.string(),
    timestamp: timestampSchema,
    qualityScore: z.number().min(0).max(1).optional()
  }))
})

const videoMetadataSchema = z.object({
  thumbnailUrl: urlSchema.optional(),
  previewUrl: urlSchema.optional(),
  transcription: z.string().optional(),
  tags: z.array(z.string().max(50)),
  language: z.string().length(2), // ISO 639-1
  captions: z.array(z.object({
    language: z.string().length(2),
    url: urlSchema,
    format: z.enum(['srt', 'vtt', 'ass'])
  })).optional()
})

export const videoDataContract = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  filename: z.string(),
  fileSize: z.number().positive(),
  duration: z.number().positive(), // milliseconds
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  format: z.enum(['mp4', 'webm', 'avi', 'mov']),
  quality: z.enum(['low', 'medium', 'high', 'ultra']),
  status: z.enum(['uploading', 'processing', 'processed', 'failed', 'archived']),
  uploadedBy: idSchema,
  aiGeneration: aiGenerationMetadataSchema.optional(),
  metadata: videoMetadataSchema,
  storageLocation: z.object({
    bucket: z.string(),
    key: z.string(),
    region: z.string(),
    cdn: urlSchema.optional()
  }),
  accessControl: z.object({
    isPublic: z.boolean(),
    allowedUsers: z.array(idSchema).optional(),
    downloadPermissions: z.array(idSchema).optional()
  }),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

// =============================================================================
// Comment Entity 데이터 계약
// =============================================================================

export const commentDataContract = z.object({
  id: idSchema,
  videoId: idSchema,
  projectId: idSchema,
  authorId: idSchema,
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'annotation', 'timestamp', 'approval']),
  timestamp: z.number().nonnegative().optional(), // video timestamp in ms
  coordinates: z.object({
    x: z.number().min(0).max(1), // normalized coordinates
    y: z.number().min(0).max(1)
  }).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'resolved']),
  parentId: idSchema.optional(), // for threaded comments
  reactions: z.array(z.object({
    userId: idSchema,
    type: z.enum(['like', 'dislike', 'heart', 'thumbs_up', 'thumbs_down']),
    timestamp: timestampSchema
  })),
  attachments: z.array(z.object({
    id: idSchema,
    filename: z.string(),
    url: urlSchema,
    mimeType: z.string()
  })),
  moderationMetadata: z.object({
    flagged: z.boolean(),
    flaggedBy: idSchema.optional(),
    flaggedAt: timestampSchema.optional(),
    moderatedBy: idSchema.optional(),
    moderatedAt: timestampSchema.optional(),
    moderationReason: z.string().optional()
  }),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isDeleted: z.boolean()
})

// =============================================================================
// Analytics & Metrics 데이터 계약 (GDPR 준수)
// =============================================================================

const analyticsEventSchema = z.object({
  type: z.enum([
    'page_view', 'video_play', 'video_pause', 'video_complete',
    'comment_posted', 'project_created', 'file_upload',
    'user_login', 'user_logout', 'feature_used'
  ]),
  timestamp: timestampSchema,
  properties: z.record(z.unknown()),
  anonymized: z.boolean()
})

export const analyticsDataContract = z.object({
  sessionId: z.string(),
  userId: idSchema.nullable(), // null for anonymized data
  events: z.array(analyticsEventSchema),
  metrics: z.object({
    sessionDuration: z.number().nonnegative(),
    pageViews: z.number().nonnegative(),
    videoWatchTime: z.number().nonnegative(),
    interactionCount: z.number().nonnegative()
  }),
  gdprCompliant: z.boolean(),
  retentionExpiry: timestampSchema, // auto-deletion date
  aggregationLevel: z.enum(['individual', 'session', 'daily', 'weekly', 'monthly']).optional()
})

// =============================================================================
// Pipeline Progress 데이터 계약
// =============================================================================

export const pipelineProgressContract = z.object({
  currentPhase: z.string(),
  phases: z.array(z.object({
    id: idSchema,
    name: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    progress: z.number().min(0).max(100),
    startedAt: timestampSchema.optional(),
    completedAt: timestampSchema.optional(),
    deliverables: z.array(z.string()),
    dependencies: z.array(idSchema).optional()
  })),
  totalProgress: z.number().min(0).max(100),
  estimatedCompletion: timestampSchema.optional(),
  blockers: z.array(z.object({
    id: idSchema,
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    reportedAt: timestampSchema,
    resolvedAt: timestampSchema.optional()
  })).optional()
})

// =============================================================================
// Data Quality 메트릭 계약
// =============================================================================

export const dataQualityContract = z.object({
  timestamp: timestampSchema,
  dataSource: z.string(),
  metrics: z.object({
    completeness: z.number().min(0).max(1), // 완전성 점수
    accuracy: z.number().min(0).max(1), // 정확성 점수
    consistency: z.number().min(0).max(1), // 일관성 점수
    timeliness: z.number().min(0).max(1), // 적시성 점수
    validity: z.number().min(0).max(1) // 유효성 점수
  }),
  violations: z.array(z.object({
    rule: z.string(),
    count: z.number().nonnegative(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    examples: z.array(z.string()).max(5)
  })),
  recommendations: z.array(z.string()),
  overallScore: z.number().min(0).max(1).optional()
})

// =============================================================================
// Export/Import 데이터 계약
// =============================================================================

export const dataExportContract = z.object({
  exportId: idSchema,
  userId: idSchema,
  requestedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
  format: z.enum(['json', 'csv', 'xml', 'parquet']),
  includePersonalData: z.boolean(), // GDPR compliance flag
  data: z.object({
    projects: z.array(z.unknown()),
    videos: z.array(z.unknown()),
    comments: z.array(z.unknown()),
    analytics: z.array(z.unknown()).optional()
  }),
  metadata: z.object({
    version: z.string(),
    schema: z.string(),
    fileSize: z.number().positive(),
    checksum: z.string(),
    encryption: z.enum(['none', 'AES-256', 'ChaCha20-Poly1305']),
    expiresAt: timestampSchema // auto-cleanup date
  }),
  gdprCompliant: z.boolean(),
  auditTrail: z.array(z.object({
    action: z.string(),
    timestamp: timestampSchema,
    userId: idSchema
  })).optional()
})

// =============================================================================
// Data Pipeline 계약
// =============================================================================

export const dataPipelineContract = z.object({
  pipelineId: idSchema,
  name: z.string(),
  version: z.string(),
  stages: z.array(z.object({
    id: idSchema,
    name: z.string(),
    type: z.enum(['extract', 'transform', 'validate', 'load', 'analyze']),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
    inputSchema: z.string(), // JSON schema reference
    outputSchema: z.string(), // JSON schema reference
    executionTime: z.number().nonnegative().optional(), // milliseconds
    recordsProcessed: z.number().nonnegative().optional(),
    errorCount: z.number().nonnegative().optional(),
    qualityMetrics: dataQualityContract.optional()
  })),
  executionContext: z.object({
    triggeredBy: z.enum(['schedule', 'manual', 'event', 'api']),
    triggeredAt: timestampSchema,
    environment: z.enum(['development', 'staging', 'production']),
    version: z.string()
  }),
  sla: z.object({
    maxExecutionTime: z.number().positive(), // milliseconds
    maxErrorRate: z.number().min(0).max(1),
    requiredQualityScore: z.number().min(0).max(1)
  }),
  monitoring: z.object({
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    status: z.enum(['running', 'completed', 'failed', 'cancelled']),
    alerts: z.array(z.object({
      level: z.enum(['info', 'warning', 'error', 'critical']),
      message: z.string(),
      timestamp: timestampSchema
    }))
  })
})

// =============================================================================
// Backup & Recovery 계약
// =============================================================================

export const backupDataContract = z.object({
  backupId: idSchema,
  type: z.enum(['full', 'incremental', 'differential']),
  scope: z.array(z.enum(['users', 'projects', 'videos', 'comments', 'analytics'])),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  schedule: z.object({
    frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    retentionPeriod: z.number().positive(), // days
    nextRun: timestampSchema.optional()
  }),
  storage: z.object({
    location: z.string(),
    encryption: z.boolean(),
    compression: z.boolean(),
    size: z.number().nonnegative(), // bytes
    checksum: z.string()
  }),
  integrity: z.object({
    verified: z.boolean(),
    verifiedAt: timestampSchema.optional(),
    restoreTestedAt: timestampSchema.optional()
  }),
  createdAt: timestampSchema,
  completedAt: timestampSchema.optional()
})

// =============================================================================
// 데이터 검증 유틸리티
// =============================================================================

export class DataContractValidator {
  /**
   * 데이터 계약 검증 및 오류 리포트 생성
   */
  static validateWithReport<T>(schema: z.ZodSchema<T>, data: unknown): {
    isValid: boolean
    data?: T
    errors: Array<{
      path: string
      message: string
      severity: 'error' | 'warning'
    }>
  } {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return {
        isValid: true,
        data: result.data,
        errors: []
      }
    }

    const errors = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      severity: 'error' as const
    }))

    return {
      isValid: false,
      errors
    }
  }

  /**
   * GDPR 준수 검증
   */
  static validateGDPRCompliance(data: unknown): boolean {
    // GDPR 필수 필드 검증 로직
    if (typeof data !== 'object' || data === null) return false
    
    const obj = data as Record<string, unknown>
    
    // 개인 식별 정보 처리 시 반드시 gdprConsent 필요
    const hasPersonalData = obj.email || obj.username || obj.userId
    if (hasPersonalData && !obj.gdprConsent) {
      return false
    }

    return true
  }

  /**
   * 데이터 암호화 요구사항 검증
   */
  static requiresEncryption(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false
    
    const obj = data as Record<string, unknown>
    const sensitiveFields = ['email', 'password', 'personalInfo', 'paymentInfo']
    
    return sensitiveFields.some(field => field in obj)
  }
}

// =============================================================================
// 이미지 생성 및 스타일 일관성 데이터 계약
// =============================================================================

const imageStyleConsistencySchema = z.object({
  projectId: idSchema,
  baselineImages: z.array(z.object({
    shotNumber: z.number().int().positive(),
    imageUrl: urlSchema,
    extractedFeatures: z.object({
      colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)), // hex colors
      dominantColors: z.array(z.string()),
      brightness: z.number().min(0).max(1),
      contrast: z.number().min(0).max(2),
      saturation: z.number().min(0).max(2),
      composition: z.object({
        ruleOfThirds: z.number().min(0).max(1),
        symmetry: z.number().min(0).max(1),
        leadingLines: z.number().min(0).max(1)
      }),
      textualElements: z.object({
        hasText: z.boolean(),
        textRegions: z.array(z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number()
        })).optional()
      }).optional()
    }),
    analysisTimestamp: timestampSchema
  })),
  consistencyMetrics: z.object({
    colorConsistency: z.number().min(0).max(1),
    styleConsistency: z.number().min(0).max(1),
    compositionConsistency: z.number().min(0).max(1),
    characterConsistency: z.number().min(0).max(1).optional(),
    overallScore: z.number().min(0).max(1),
    deviations: z.array(z.object({
      shotNumber: z.number().int().positive(),
      deviationType: z.enum(['color', 'style', 'composition', 'character']),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      suggestedFix: z.string().optional()
    }))
  }),
  generationSettings: z.object({
    artStyle: z.string(),
    colorPalette: z.string(),
    consistencyEnforcement: z.object({
      enabled: z.boolean(),
      strength: z.number().min(0).max(1),
      referenceShots: z.array(z.number().int().positive()).optional()
    })
  }),
  qualityAssurance: z.object({
    minConsistencyThreshold: z.number().min(0).max(1).default(0.75),
    autoRegenerateBelow: z.number().min(0).max(1).default(0.6),
    manualReviewRequired: z.boolean().default(false),
    approvedBy: idSchema.optional(),
    approvedAt: timestampSchema.optional()
  }),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

const storyboardExportContract = z.object({
  exportId: idSchema,
  projectId: idSchema,
  requestedBy: idSchema,
  exportType: z.enum(['png_grid', 'pdf_document', 'individual_shots', 'json_metadata']),
  configuration: z.object({
    includeMetadata: z.boolean().default(true),
    includeMetrics: z.boolean().default(false),
    resolution: z.enum(['low', 'medium', 'high', 'original']).default('high'),
    format: z.enum(['png', 'jpg', 'webp', 'pdf']),
    gridLayout: z.enum(['3x4', '4x3', '2x6', '6x2']).optional(),
    branding: z.object({
      includeLogo: z.boolean().default(false),
      logoUrl: urlSchema.optional(),
      watermark: z.object({
        text: z.string().optional(),
        position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']).default('bottom-right'),
        opacity: z.number().min(0).max(1).default(0.7)
      }).optional()
    }).optional()
  }),
  outputUrls: z.array(z.object({
    type: z.enum(['grid', 'pdf', 'individual', 'metadata']),
    url: urlSchema,
    filename: z.string(),
    fileSize: z.number().positive(),
    checksum: z.string()
  })),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  processingMetrics: z.object({
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    processingTime: z.number().nonnegative().optional(),
    filesSizeTotal: z.number().nonnegative().optional()
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional()
  }).optional(),
  expiresAt: timestampSchema, // auto-cleanup date
  downloadCount: z.number().nonnegative().default(0),
  lastDownloadedAt: timestampSchema.optional()
})

const imageGenerationAnalyticsContract = z.object({
  projectId: idSchema,
  generationSession: z.object({
    sessionId: z.string(),
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    totalShots: z.number().int().positive(),
    successfulShots: z.number().nonnegative(),
    failedShots: z.number().nonnegative(),
    regeneratedShots: z.number().nonnegative()
  }),
  performanceMetrics: z.object({
    averageGenerationTime: z.number().positive(), // milliseconds per image
    totalProcessingTime: z.number().positive(),
    batchEfficiency: z.number().min(0).max(1), // successful batches / total batches
    apiCallsCount: z.number().nonnegative(),
    fallbackUsage: z.object({
      googleToHuggingface: z.number().nonnegative(),
      totalFallbacks: z.number().nonnegative()
    })
  }),
  qualityMetrics: z.object({
    averageConsistency: z.number().min(0).max(1),
    consistencyDistribution: z.object({
      excellent: z.number().nonnegative(), // 0.9+
      good: z.number().nonnegative(), // 0.7-0.9
      fair: z.number().nonnegative(), // 0.5-0.7
      poor: z.number().nonnegative() // <0.5
    }),
    userSatisfaction: z.object({
      regenerationRate: z.number().min(0).max(1), // shots regenerated / total shots
      manualEditRate: z.number().min(0).max(1),
      finalApprovalRate: z.number().min(0).max(1)
    })
  }),
  costAnalysis: z.object({
    apiCosts: z.object({
      googleImagen: z.number().nonnegative(), // USD
      huggingface: z.number().nonnegative(),
      totalCost: z.number().nonnegative()
    }),
    storageUsage: z.object({
      originalImages: z.number().nonnegative(), // bytes
      thumbnails: z.number().nonnegative(),
      totalStorage: z.number().nonnegative()
    }),
    bandwidthUsage: z.number().nonnegative() // bytes transferred
  }),
  userBehavior: z.object({
    mostRegeneratedShots: z.array(z.number().int().positive()),
    commonStyleChanges: z.array(z.string()),
    averageEditingTime: z.number().positive(), // milliseconds
    preferredExportFormats: z.record(z.number().nonnegative())
  }),
  errors: z.array(z.object({
    shotNumber: z.number().int().positive().optional(),
    errorType: z.enum(['api_error', 'timeout', 'quota_exceeded', 'invalid_prompt', 'network_error']),
    errorMessage: z.string(),
    timestamp: timestampSchema,
    resolved: z.boolean().default(false),
    resolutionMethod: z.enum(['retry', 'fallback', 'manual_fix']).optional()
  }))
})

export const imageStyleConsistencyContract = imageStyleConsistencySchema
export const storyboardExportDataContract = storyboardExportContract
export const imageGenerationAnalyticsDataContract = imageGenerationAnalyticsContract

// =============================================================================
// 타입 추출 (TypeScript 타입으로 사용)
// =============================================================================

export type UserData = z.infer<typeof userDataContract>
export type ProjectData = z.infer<typeof projectDataContract>
export type PlanningData = z.infer<typeof planningDataContract>
export type VideoData = z.infer<typeof videoDataContract>
export type CommentData = z.infer<typeof commentDataContract>
export type AnalyticsData = z.infer<typeof analyticsDataContract>
export type PipelineProgress = z.infer<typeof pipelineProgressContract>
export type DataQualityMetrics = z.infer<typeof dataQualityContract>
export type DataExportPackage = z.infer<typeof dataExportContract>
export type BackupData = z.infer<typeof backupDataContract>
export type DataPipeline = z.infer<typeof dataPipelineContract>

// 이미지 생성 관련 타입
export type ImageStyleConsistency = z.infer<typeof imageStyleConsistencyContract>
export type StoryboardExportData = z.infer<typeof storyboardExportDataContract>
export type ImageGenerationAnalytics = z.infer<typeof imageGenerationAnalyticsDataContract>

// =============================================================================
// 스키마 레지스트리 (Schema Registry)
// =============================================================================

export const SCHEMA_REGISTRY = {
  user: { schema: userDataContract, version: '1.0.0' },
  project: { schema: projectDataContract, version: '1.0.0' },
  planning: { schema: planningDataContract, version: '1.0.0' },
  video: { schema: videoDataContract, version: '1.0.0' },
  comment: { schema: commentDataContract, version: '1.0.0' },
  analytics: { schema: analyticsDataContract, version: '1.0.0' },
  pipelineProgress: { schema: pipelineProgressContract, version: '1.0.0' },
  dataQuality: { schema: dataQualityContract, version: '1.0.0' },
  dataExport: { schema: dataExportContract, version: '1.0.0' },
  backup: { schema: backupDataContract, version: '1.0.0' },
  dataPipeline: { schema: dataPipelineContract, version: '1.0.0' },
  // 이미지 생성 관련 스키마
  imageStyleConsistency: { schema: imageStyleConsistencyContract, version: '1.0.0' },
  storyboardExport: { schema: storyboardExportDataContract, version: '1.0.0' },
  imageGenerationAnalytics: { schema: imageGenerationAnalyticsDataContract, version: '1.0.0' }
} as const

export type SchemaName = keyof typeof SCHEMA_REGISTRY