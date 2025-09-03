import { PactV3, MatchersV3, SpecificationVersion } from '@pact-foundation/pact'
import { describe, it, beforeAll, afterAll, beforeEach } from '@jest/globals'
import axios, { AxiosResponse } from 'axios'
import {
  ProjectResponse,
  ProjectListResponse,
  ScheduleResponse,
  TemplateResponse,
  CreateProjectRequest,
  CreateScheduleRequest,
  ApplyTemplateRequest
} from '../schemas/project-management'

const { like, eachLike, term, uuid, iso8601DateTime, boolean, integer } = MatchersV3

// Pact 소비자 테스트 - 프론트엔드에서 백엔드 API 계약 검증
describe('VideoPlanet Project Management API - Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'vridge-frontend',
    provider: 'vridge-backend',
    port: 9000,
    host: '127.0.0.1',
    spec: SpecificationVersion.SPECIFICATION_VERSION_V3,
  })

  const mockApiClient = axios.create({
    baseURL: 'http://127.0.0.1:9000',
    headers: {
      'Authorization': 'Bearer mock-jwt-token',
      'Content-Type': 'application/json'
    }
  })

  beforeAll(() => {
    return provider.setup()
  })

  afterAll(() => {
    return provider.finalize()
  })

  beforeEach(() => {
    provider.clean()
  })

  describe('프로젝트 관리 API 계약', () => {
    describe('GET /api/projects - 프로젝트 목록 조회', () => {
      it('성공적으로 프로젝트 목록을 반환해야 한다', async () => {
        // Given: 백엔드가 프로젝트 목록 응답을 제공한다고 가정
        await provider
          .given('사용자가 접근할 수 있는 프로젝트들이 존재함')
          .uponReceiving('프로젝트 목록 조회 요청')
          .withRequest({
            method: 'GET',
            path: '/api/projects',
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
            },
            query: {
              page: '1',
              limit: '10'
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              projects: eachLike({
                id: uuid('550e8400-e29b-41d4-a716-446655440000'),
                name: like('마케팅 비디오 프로젝트'),
                description: like('Q1 제품 마케팅을 위한 브랜드 비디오 제작'),
                status: term({
                  matcher: '^(draft|planning|in_progress|review|completed|cancelled|on_hold)$',
                  generate: 'draft'
                }),
                owner: {
                  userId: uuid('550e8400-e29b-41d4-a716-446655440001'),
                  role: 'owner',
                  joinedAt: iso8601DateTime('2025-01-15T09:00:00Z'),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                },
                members: eachLike({
                  userId: uuid('550e8400-e29b-41d4-a716-446655440002'),
                  role: term({
                    matcher: '^(owner|admin|editor|reviewer|viewer)$',
                    generate: 'editor'
                  }),
                  joinedAt: iso8601DateTime('2025-01-16T10:00:00Z'),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(false),
                    canInviteMembers: boolean(false),
                    canManageSettings: boolean(false),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(false)
                  }
                }),
                settings: {
                  visibility: term({
                    matcher: '^(public|private|team)$',
                    generate: 'private'
                  }),
                  allowComments: boolean(true),
                  allowDownloads: boolean(false)
                },
                metadata: {
                  tags: eachLike('marketing'),
                  category: term({
                    matcher: '^(marketing|education|entertainment|corporate|documentary|other)$',
                    generate: 'marketing'
                  }),
                  deliverables: eachLike('비디오 파일')
                },
                createdAt: iso8601DateTime('2025-01-15T09:00:00Z'),
                updatedAt: iso8601DateTime('2025-01-15T09:00:00Z'),
                isArchived: boolean(false)
              }),
              total: integer(1),
              page: integer(1),
              limit: integer(10),
              hasNext: boolean(false)
            }
          })

        // When: 프론트엔드에서 프로젝트 목록을 요청
        const response: AxiosResponse<ProjectListResponse> = await mockApiClient.get('/api/projects', {
          params: { page: 1, limit: 10 }
        })

        // Then: 올바른 형식의 데이터를 받아야 함
        expect(response.status).toBe(200)
        expect(response.data.projects).toBeDefined()
        expect(Array.isArray(response.data.projects)).toBe(true)
        expect(response.data.total).toBeDefined()
        expect(typeof response.data.total).toBe('number')
        expect(response.data.page).toBe(1)
        expect(response.data.limit).toBe(10)
      })

      it('빈 프로젝트 목록을 올바르게 처리해야 한다', async () => {
        await provider
          .given('사용자가 접근할 수 있는 프로젝트가 없음')
          .uponReceiving('빈 프로젝트 목록 조회 요청')
          .withRequest({
            method: 'GET',
            path: '/api/projects',
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              projects: [],
              total: integer(0),
              page: integer(1),
              limit: integer(10),
              hasNext: boolean(false)
            }
          })

        const response: AxiosResponse<ProjectListResponse> = await mockApiClient.get('/api/projects')
        
        expect(response.status).toBe(200)
        expect(response.data.projects).toEqual([])
        expect(response.data.total).toBe(0)
      })
    })

    describe('POST /api/projects - 프로젝트 생성', () => {
      it('유효한 프로젝트 데이터로 새 프로젝트를 생성해야 한다', async () => {
        const projectData: CreateProjectRequest = {
          name: '마케팅 비디오 프로젝트',
          description: 'Q1 제품 마케팅을 위한 브랜드 비디오 제작',
          category: 'marketing',
          tags: ['marketing', 'brand', 'video'],
          settings: {
            visibility: 'private',
            allowComments: true,
            allowDownloads: false
          }
        }

        await provider
          .given('사용자가 프로젝트를 생성할 수 있는 권한을 가짐')
          .uponReceiving('새 프로젝트 생성 요청')
          .withRequest({
            method: 'POST',
            path: '/api/projects',
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
              'Content-Type': 'application/json'
            },
            body: like(projectData)
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              project: {
                id: uuid('550e8400-e29b-41d4-a716-446655440000'),
                name: like(projectData.name),
                description: like(projectData.description),
                status: 'draft',
                owner: {
                  userId: uuid('550e8400-e29b-41d4-a716-446655440001'),
                  role: 'owner',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                },
                members: eachLike({
                  userId: uuid('550e8400-e29b-41d4-a716-446655440001'),
                  role: 'owner',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                }),
                settings: like(projectData.settings),
                metadata: {
                  tags: like(projectData.tags || []),
                  category: like(projectData.category),
                  deliverables: eachLike('default-deliverable')
                },
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                isArchived: boolean(false)
              },
              folderPath: like('/media/projects/550e8400-e29b-41d4-a716-446655440000')
            }
          })

        const response = await mockApiClient.post('/api/projects', projectData)
        
        expect(response.status).toBe(201)
        expect(response.data.project).toBeDefined()
        expect(response.data.project.name).toBe(projectData.name)
        expect(response.data.project.status).toBe('draft')
        expect(response.data.project.owner.role).toBe('owner')
        expect(response.data.folderPath).toBeDefined()
        expect(response.data.folderPath).toContain('/media/projects/')
      })

      it('잘못된 프로젝트 데이터에 대해 400 에러를 반환해야 한다', async () => {
        const invalidProjectData = {
          // name 필드 누락 (필수 필드)
          description: '유효하지 않은 프로젝트 데이터',
          category: 'invalid-category'
        }

        await provider
          .given('사용자가 프로젝트를 생성할 수 있는 권한을 가짐')
          .uponReceiving('잘못된 데이터로 프로젝트 생성 요청')
          .withRequest({
            method: 'POST',
            path: '/api/projects',
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
              'Content-Type': 'application/json'
            },
            body: invalidProjectData
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              error: 'VALIDATION_ERROR',
              message: '요청 데이터가 올바르지 않습니다',
              details: eachLike({
                field: 'name',
                message: '프로젝트 이름은 필수입니다',
                value: like('')
              }),
              timestamp: iso8601DateTime(),
              path: '/api/projects'
            }
          })

        try {
          await mockApiClient.post('/api/projects', invalidProjectData)
          fail('400 에러가 발생해야 합니다')
        } catch (error: any) {
          expect(error.response.status).toBe(400)
          expect(error.response.data.error).toBe('VALIDATION_ERROR')
          expect(error.response.data.details).toBeDefined()
        }
      })
    })

    describe('GET /api/projects/{projectId} - 프로젝트 상세 조회', () => {
      it('존재하는 프로젝트의 상세 정보를 반환해야 한다', async () => {
        const projectId = '550e8400-e29b-41d4-a716-446655440000'

        await provider
          .given('사용자가 접근할 수 있는 프로젝트가 존재함')
          .uponReceiving('프로젝트 상세 조회 요청')
          .withRequest({
            method: 'GET',
            path: `/api/projects/${projectId}`,
            headers: {
              Authorization: like('Bearer mock-jwt-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              project: {
                id: like(projectId),
                name: like('마케팅 비디오 프로젝트'),
                description: like('프로젝트 설명'),
                status: 'in_progress',
                owner: {
                  userId: uuid(),
                  role: 'owner',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                },
                members: eachLike({
                  userId: uuid(),
                  role: 'editor',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(false),
                    canInviteMembers: boolean(false),
                    canManageSettings: boolean(false),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(false)
                  }
                }),
                settings: {
                  visibility: 'private',
                  allowComments: boolean(true),
                  allowDownloads: boolean(false)
                },
                metadata: {
                  tags: eachLike('marketing'),
                  category: 'marketing',
                  deliverables: eachLike('비디오 파일')
                },
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                isArchived: boolean(false)
              },
              permissions: {
                canEdit: boolean(true),
                canDelete: boolean(true),
                canInviteMembers: boolean(true),
                canManageSettings: boolean(true),
                canUploadVideos: boolean(true),
                canViewAnalytics: boolean(true),
                role: 'owner'
              }
            }
          })

        const response = await mockApiClient.get(`/api/projects/${projectId}`)
        
        expect(response.status).toBe(200)
        expect(response.data.project).toBeDefined()
        expect(response.data.project.id).toBe(projectId)
        expect(response.data.permissions).toBeDefined()
        expect(response.data.permissions.role).toBe('owner')
      })

      it('존재하지 않는 프로젝트에 대해 404 에러를 반환해야 한다', async () => {
        const nonExistentProjectId = 'non-existent-id'

        await provider
          .given('요청된 프로젝트가 존재하지 않음')
          .uponReceiving('존재하지 않는 프로젝트 조회 요청')
          .withRequest({
            method: 'GET',
            path: `/api/projects/${nonExistentProjectId}`,
            headers: {
              Authorization: like('Bearer mock-jwt-token')
            }
          })
          .willRespondWith({
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              error: 'NOT_FOUND',
              message: '요청한 프로젝트를 찾을 수 없습니다',
              timestamp: iso8601DateTime(),
              path: `/api/projects/${nonExistentProjectId}`
            }
          })

        try {
          await mockApiClient.get(`/api/projects/${nonExistentProjectId}`)
          fail('404 에러가 발생해야 합니다')
        } catch (error: any) {
          expect(error.response.status).toBe(404)
          expect(error.response.data.error).toBe('NOT_FOUND')
        }
      })
    })
  })

  describe('일정 관리 API 계약', () => {
    describe('POST /api/schedules - 일정 생성', () => {
      it('유효한 일정 데이터로 새 일정을 생성해야 한다', async () => {
        const scheduleData: CreateScheduleRequest = {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          name: '마케팅 비디오 제작 일정',
          description: 'Q1 마케팅 캠페인용 비디오 제작 스케줄',
          timeline: {
            startDate: '2025-01-15T09:00:00Z',
            endDate: '2025-03-15T18:00:00Z',
            bufferDays: 5
          }
        }

        await provider
          .given('사용자가 프로젝트에 대한 일정을 생성할 수 있는 권한을 가짐')
          .uponReceiving('새 일정 생성 요청')
          .withRequest({
            method: 'POST',
            path: '/api/schedules',
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
              'Content-Type': 'application/json'
            },
            body: like(scheduleData)
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              schedule: {
                id: uuid(),
                projectId: like(scheduleData.projectId),
                name: like(scheduleData.name),
                description: like(scheduleData.description),
                timeline: {
                  startDate: iso8601DateTime(scheduleData.timeline.startDate),
                  endDate: iso8601DateTime(scheduleData.timeline.endDate),
                  estimatedDuration: integer(60), // 작업일 기준
                  bufferDays: integer(scheduleData.timeline.bufferDays || 0),
                  workingDays: eachLike({
                    dayOfWeek: integer(1),
                    startTime: like('09:00'),
                    endTime: like('18:00'),
                    isWorkingDay: boolean(true)
                  }),
                  phases: eachLike({
                    id: uuid(),
                    name: like('기획 단계'),
                    description: like('프로젝트 기획 및 준비'),
                    startDate: iso8601DateTime(),
                    endDate: iso8601DateTime(),
                    dependencies: eachLike(uuid()),
                    status: 'not_started',
                    progress: integer(0),
                    deliverables: eachLike('기획서'),
                    assignees: eachLike(uuid())
                  })
                },
                milestones: eachLike({
                  id: uuid(),
                  name: like('기획 완료'),
                  targetDate: iso8601DateTime(),
                  status: 'pending',
                  priority: 'high',
                  deliverables: eachLike('기획서'),
                  dependencies: eachLike(uuid()),
                  approvers: eachLike(uuid()),
                  criteria: eachLike('기획서 승인')
                }),
                deadlines: eachLike({
                  id: uuid(),
                  name: like('최종 납품'),
                  dueDate: iso8601DateTime(),
                  type: 'hard',
                  priority: 'critical',
                  status: 'pending',
                  assignees: eachLike(uuid()),
                  notifications: eachLike({
                    type: 'email',
                    timing: integer(7),
                    recipients: eachLike(uuid())
                  })
                }),
                dependencies: eachLike({
                  id: uuid(),
                  predecessorId: uuid(),
                  successorId: uuid(),
                  type: 'finish_to_start',
                  lag: integer(0),
                  description: like('의존성 설명')
                }),
                resources: eachLike({
                  id: uuid(),
                  name: like('프로듀서'),
                  type: 'person',
                  availability: eachLike({
                    startDate: iso8601DateTime(),
                    endDate: iso8601DateTime(),
                    availableHours: integer(8)
                  }),
                  maxUtilization: integer(100),
                  currentUtilization: integer(50)
                }),
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                status: 'draft',
                version: integer(1)
              }
            }
          })

        const response = await mockApiClient.post('/api/schedules', scheduleData)
        
        expect(response.status).toBe(201)
        expect(response.data.schedule).toBeDefined()
        expect(response.data.schedule.projectId).toBe(scheduleData.projectId)
        expect(response.data.schedule.name).toBe(scheduleData.name)
        expect(response.data.schedule.status).toBe('draft')
        expect(response.data.schedule.timeline.estimatedDuration).toBeGreaterThan(0)
      })
    })

    describe('GET /api/schedules/{scheduleId}/conflicts - 일정 충돌 감지', () => {
      it('일정 충돌을 감지하고 보고해야 한다', async () => {
        const scheduleId = '550e8400-e29b-41d4-a716-446655440100'

        await provider
          .given('일정에 충돌이 존재함')
          .uponReceiving('일정 충돌 감지 요청')
          .withRequest({
            method: 'GET',
            path: `/api/schedules/${scheduleId}/conflicts`,
            headers: {
              Authorization: like('Bearer mock-jwt-token')
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              conflicts: eachLike({
                id: uuid(),
                type: term({
                  matcher: '^(resource_overallocation|schedule_overlap|deadline_impossible|dependency_cycle|resource_unavailable)$',
                  generate: 'resource_overallocation'
                }),
                description: like('리소스 과부하가 감지되었습니다'),
                affectedItems: eachLike(uuid()),
                severity: term({
                  matcher: '^(low|medium|high|critical)$',
                  generate: 'high'
                }),
                suggestedResolution: like('리소스 재할당 또는 일정 조정을 권장합니다'),
                detectedAt: iso8601DateTime()
              }),
              scheduleId: like(scheduleId),
              detectedAt: iso8601DateTime()
            }
          })

        const response = await mockApiClient.get(`/api/schedules/${scheduleId}/conflicts`)
        
        expect(response.status).toBe(200)
        expect(response.data.conflicts).toBeDefined()
        expect(Array.isArray(response.data.conflicts)).toBe(true)
        expect(response.data.scheduleId).toBe(scheduleId)
        expect(response.data.detectedAt).toBeDefined()
      })
    })
  })

  describe('템플릿 관리 API 계약', () => {
    describe('GET /api/templates - 템플릿 목록 조회', () => {
      it('필터링된 템플릿 목록을 반환해야 한다', async () => {
        await provider
          .given('사용 가능한 템플릿들이 존재함')
          .uponReceiving('템플릿 목록 조회 요청')
          .withRequest({
            method: 'GET',
            path: '/api/templates',
            headers: {
              Authorization: like('Bearer mock-jwt-token')
            },
            query: {
              category: 'marketing',
              industry: 'media'
            }
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              templates: eachLike({
                id: uuid(),
                name: like('마케팅 비디오 템플릿'),
                description: like('중소기업을 위한 마케팅 비디오 제작 템플릿'),
                category: 'marketing',
                industry: 'media',
                version: term({
                  matcher: '^\\d+\\.\\d+\\.\\d+$',
                  generate: '1.0.0'
                }),
                isPublic: boolean(true),
                createdBy: uuid(),
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                usageCount: integer(45),
                rating: {
                  average: like(4.5),
                  count: integer(20),
                  distribution: {
                    1: integer(0),
                    2: integer(1),
                    3: integer(2),
                    4: integer(7),
                    5: integer(10)
                  }
                },
                tags: eachLike('marketing'),
                structure: like({
                  phases: eachLike({
                    id: uuid(),
                    name: like('기획 단계'),
                    order: integer(1),
                    estimatedDuration: integer(7)
                  })
                }),
                schedule: like({
                  estimatedDuration: integer(30),
                  bufferPercentage: integer(10)
                }),
                resources: eachLike({
                  id: uuid(),
                  name: like('프로듀서'),
                  type: 'person',
                  role: 'producer'
                }),
                settings: like({
                  defaultVisibility: 'private'
                }),
                metadata: {
                  complexity: 'moderate',
                  teamSize: {
                    min: integer(3),
                    max: integer(8),
                    optimal: integer(5)
                  },
                  budget: {
                    min: integer(10000),
                    max: integer(50000),
                    currency: 'USD'
                  },
                  duration: {
                    min: integer(20),
                    max: integer(45),
                    typical: integer(30)
                  }
                }
              }),
              total: integer(1),
              page: integer(1),
              limit: integer(10),
              hasNext: boolean(false)
            }
          })

        const response = await mockApiClient.get('/api/templates', {
          params: { category: 'marketing', industry: 'media' }
        })
        
        expect(response.status).toBe(200)
        expect(response.data.templates).toBeDefined()
        expect(Array.isArray(response.data.templates)).toBe(true)
        expect(response.data.total).toBeDefined()
      })
    })

    describe('POST /api/templates/{templateId}/apply - 템플릿 적용', () => {
      it('템플릿을 프로젝트에 성공적으로 적용해야 한다', async () => {
        const templateId = '550e8400-e29b-41d4-a716-446655440200'
        const applyData: ApplyTemplateRequest = {
          projectName: 'Q1 마케팅 캠페인 비디오',
          projectDescription: '신제품 런칭을 위한 마케팅 비디오 제작',
          customizations: {
            startDate: '2025-02-01T09:00:00Z',
            budget: 25000,
            teamMembers: ['550e8400-e29b-41d4-a716-446655440001']
          }
        }

        await provider
          .given('사용자가 접근할 수 있는 템플릿이 존재함')
          .uponReceiving('템플릿 적용 요청')
          .withRequest({
            method: 'POST',
            path: `/api/templates/${templateId}/apply`,
            headers: {
              Authorization: like('Bearer mock-jwt-token'),
              'Content-Type': 'application/json'
            },
            body: like(applyData)
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              project: {
                id: uuid(),
                name: like(applyData.projectName),
                description: like(applyData.projectDescription),
                status: 'draft',
                owner: {
                  userId: uuid(),
                  role: 'owner',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                },
                members: eachLike({
                  userId: uuid(),
                  role: 'owner',
                  joinedAt: iso8601DateTime(),
                  permissions: {
                    canEdit: boolean(true),
                    canDelete: boolean(true),
                    canInviteMembers: boolean(true),
                    canManageSettings: boolean(true),
                    canUploadVideos: boolean(true),
                    canViewAnalytics: boolean(true)
                  }
                }),
                settings: {
                  visibility: 'private',
                  allowComments: boolean(true),
                  allowDownloads: boolean(false)
                },
                metadata: {
                  tags: eachLike('marketing'),
                  category: 'marketing',
                  deliverables: eachLike('비디오 파일')
                },
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                isArchived: boolean(false)
              },
              schedule: {
                id: uuid(),
                projectId: uuid(),
                name: like('Q1 마케팅 캠페인 비디오 일정'),
                timeline: {
                  startDate: iso8601DateTime(applyData.customizations?.startDate),
                  endDate: iso8601DateTime(),
                  estimatedDuration: integer(35),
                  bufferDays: integer(5),
                  workingDays: eachLike({
                    dayOfWeek: integer(1),
                    startTime: '09:00',
                    endTime: '18:00',
                    isWorkingDay: boolean(true)
                  }),
                  phases: eachLike({
                    id: uuid(),
                    name: like('기획 단계'),
                    startDate: iso8601DateTime(),
                    endDate: iso8601DateTime(),
                    dependencies: eachLike(uuid()),
                    status: 'not_started',
                    progress: integer(0),
                    deliverables: eachLike('기획서'),
                    assignees: eachLike(uuid())
                  })
                },
                milestones: eachLike({
                  id: uuid(),
                  name: like('기획 승인'),
                  targetDate: iso8601DateTime(),
                  status: 'pending',
                  priority: 'high',
                  deliverables: eachLike('기획서'),
                  dependencies: eachLike(uuid()),
                  approvers: eachLike(uuid()),
                  criteria: eachLike('기획서 승인')
                }),
                deadlines: eachLike({
                  id: uuid(),
                  name: like('최종 납품'),
                  dueDate: iso8601DateTime(),
                  type: 'hard',
                  priority: 'critical',
                  status: 'pending',
                  assignees: eachLike(uuid()),
                  notifications: eachLike({
                    type: 'email',
                    timing: integer(7),
                    recipients: eachLike(uuid())
                  })
                }),
                dependencies: eachLike({
                  id: uuid(),
                  predecessorId: uuid(),
                  successorId: uuid(),
                  type: 'finish_to_start',
                  lag: integer(0)
                }),
                resources: eachLike({
                  id: uuid(),
                  name: like('프로듀서'),
                  type: 'person',
                  availability: eachLike({
                    startDate: iso8601DateTime(),
                    endDate: iso8601DateTime(),
                    availableHours: integer(8)
                  }),
                  maxUtilization: integer(100),
                  currentUtilization: integer(50)
                }),
                createdAt: iso8601DateTime(),
                updatedAt: iso8601DateTime(),
                status: 'draft',
                version: integer(1)
              }
            }
          })

        const response = await mockApiClient.post(`/api/templates/${templateId}/apply`, applyData)
        
        expect(response.status).toBe(201)
        expect(response.data.project).toBeDefined()
        expect(response.data.schedule).toBeDefined()
        expect(response.data.project.name).toBe(applyData.projectName)
        expect(response.data.project.description).toBe(applyData.projectDescription)
      })
    })
  })

  describe('인증 및 에러 처리 계약', () => {
    it('인증되지 않은 요청에 대해 401 에러를 반환해야 한다', async () => {
      await provider
        .given('인증되지 않은 사용자')
        .uponReceiving('인증 없이 프로젝트 목록 요청')
        .withRequest({
          method: 'GET',
          path: '/api/projects'
          // Authorization 헤더 없음
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            error: 'UNAUTHORIZED',
            message: '인증이 필요합니다',
            timestamp: iso8601DateTime(),
            path: '/api/projects'
          }
        })

      try {
        await axios.get('http://127.0.0.1:9000/api/projects')
        fail('401 에러가 발생해야 합니다')
      } catch (error: any) {
        expect(error.response.status).toBe(401)
        expect(error.response.data.error).toBe('UNAUTHORIZED')
      }
    })

    it('권한이 없는 요청에 대해 403 에러를 반환해야 한다', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000'

      await provider
        .given('사용자가 해당 프로젝트에 대한 삭제 권한이 없음')
        .uponReceiving('권한 없는 프로젝트 삭제 요청')
        .withRequest({
          method: 'DELETE',
          path: `/api/projects/${projectId}`,
          headers: {
            Authorization: like('Bearer limited-access-token')
          }
        })
        .willRespondWith({
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            error: 'FORBIDDEN',
            message: '해당 작업을 수행할 권한이 없습니다',
            timestamp: iso8601DateTime(),
            path: `/api/projects/${projectId}`
          }
        })

      try {
        await axios.delete(`http://127.0.0.1:9000/api/projects/${projectId}`, {
          headers: {
            Authorization: 'Bearer limited-access-token'
          }
        })
        fail('403 에러가 발생해야 합니다')
      } catch (error: any) {
        expect(error.response.status).toBe(403)
        expect(error.response.data.error).toBe('FORBIDDEN')
      }
    })
  })

  // 성능 계약 검증
  describe('성능 요구사항 계약', () => {
    it('프로젝트 생성은 2초 이내에 응답해야 한다', async () => {
      const projectData = {
        name: '성능 테스트 프로젝트',
        category: 'marketing'
      }

      await provider
        .given('시스템이 정상 상태임')
        .uponReceiving('성능 테스트용 프로젝트 생성 요청')
        .withRequest({
          method: 'POST',
          path: '/api/projects',
          headers: {
            Authorization: like('Bearer mock-jwt-token'),
            'Content-Type': 'application/json'
          },
          body: like(projectData)
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': like('1500ms') // 응답 시간 메타데이터
          },
          body: {
            project: {
              id: uuid(),
              name: like(projectData.name),
              status: 'draft',
              owner: {
                userId: uuid(),
                role: 'owner',
                joinedAt: iso8601DateTime(),
                permissions: {
                  canEdit: boolean(true),
                  canDelete: boolean(true),
                  canInviteMembers: boolean(true),
                  canManageSettings: boolean(true),
                  canUploadVideos: boolean(true),
                  canViewAnalytics: boolean(true)
                }
              },
              members: eachLike({
                userId: uuid(),
                role: 'owner',
                joinedAt: iso8601DateTime(),
                permissions: {
                  canEdit: boolean(true),
                  canDelete: boolean(true),
                  canInviteMembers: boolean(true),
                  canManageSettings: boolean(true),
                  canUploadVideos: boolean(true),
                  canViewAnalytics: boolean(true)
                }
              }),
              settings: {
                visibility: 'private',
                allowComments: boolean(true),
                allowDownloads: boolean(false)
              },
              metadata: {
                tags: eachLike('marketing'),
                category: 'marketing',
                deliverables: eachLike('default-deliverable')
              },
              createdAt: iso8601DateTime(),
              updatedAt: iso8601DateTime(),
              isArchived: boolean(false)
            },
            folderPath: like('/media/projects/' + uuid())
          }
        })

      const startTime = Date.now()
      const response = await mockApiClient.post('/api/projects', projectData)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(201)
      expect(responseTime).toBeLessThan(2000) // 2초 이내
      expect(response.headers['x-response-time']).toBeDefined()
    })
  })
})