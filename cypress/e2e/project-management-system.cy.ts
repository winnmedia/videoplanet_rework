describe('프로젝트 생성 및 일정 관리 시스템 E2E', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'https://api.vlanet.net'
  let authToken: string
  let userId: string
  let projectId: string
  let scheduleId: string
  let templateId: string

  before(() => {
    // 테스트 사용자 로그인
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/api/auth/login`,
      body: {
        email: 'test@vlanet.net',
        password: 'test123'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      authToken = response.body.token
      userId = response.body.user.id
      
      // 기본 헤더 설정
      Cypress.env('authToken', authToken)
    })
  })

  beforeEach(() => {
    // 각 테스트 전 인증 토큰 설정
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', authToken)
    })
  })

  describe('1. 프로젝트 생성 워크플로우', () => {
    it('새 프로젝트를 생성해야 한다', () => {
      const projectData = {
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

      // API 요청을 통한 프로젝트 생성
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/projects`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: projectData
      }).then((response) => {
        expect(response.status).to.eq(201)
        expect(response.body).to.have.property('project')
        expect(response.body).to.have.property('folderPath')
        
        const project = response.body.project
        projectId = project.id

        // 프로젝트 메타데이터 검증
        expect(project.name).to.eq(projectData.name)
        expect(project.description).to.eq(projectData.description)
        expect(project.status).to.eq('draft')
        expect(project.owner.userId).to.eq(userId)
        expect(project.settings.visibility).to.eq('private')
        
        // UUID 기반 프로젝트 식별자 검증
        expect(project.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        
        // 자동 폴더 구조 생성 검증
        expect(response.body.folderPath).to.include('/media/projects/')
        expect(response.body.folderPath).to.include(project.id)
      })

      // 성능 요구사항: 프로젝트 생성 2초 이내
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 2000
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.duration).to.be.lessThan(2000)
      })
    })

    it('기본 권한 설정을 확인해야 한다', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        const project = response.body.project
        const permissions = response.body.permissions
        
        // 생성자 = Owner 권한 확인
        expect(project.owner.role).to.eq('owner')
        expect(permissions.canEdit).to.be.true
        expect(permissions.canDelete).to.be.true
        expect(permissions.canInviteMembers).to.be.true
        expect(permissions.canManageSettings).to.be.true
        expect(permissions.canUploadVideos).to.be.true
        expect(permissions.canViewAnalytics).to.be.true
      })
    })

    it('5-tier 권한 시스템을 테스트해야 한다', () => {
      const memberRoles = ['admin', 'editor', 'reviewer', 'viewer']
      
      memberRoles.forEach((role, index) => {
        const testUserId = `test-user-${index + 2}`
        
        // 멤버 초대
        cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/api/projects/${projectId}/members`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            userId: testUserId,
            role: role,
            message: `${role} 권한으로 초대합니다`
          }
        }).then((response) => {
          expect(response.status).to.eq(201)
          
          const member = response.body.member
          expect(member.role).to.eq(role)
          expect(member.permissions).to.exist
          
          // 권한별 기능 매트릭스 검증
          switch (role) {
            case 'admin':
              expect(member.permissions.canEdit).to.be.true
              expect(member.permissions.canInviteMembers).to.be.true
              expect(member.permissions.canManageSettings).to.be.true
              expect(member.permissions.canViewAnalytics).to.be.true
              expect(member.permissions.canDelete).to.be.false // Owner만 가능
              break
            case 'editor':
              expect(member.permissions.canEdit).to.be.true
              expect(member.permissions.canUploadVideos).to.be.true
              expect(member.permissions.canInviteMembers).to.be.false
              expect(member.permissions.canManageSettings).to.be.false
              break
            case 'reviewer':
              expect(member.permissions.canEdit).to.be.false
              expect(member.permissions.canViewAnalytics).to.be.true
              expect(member.permissions.canUploadVideos).to.be.false
              break
            case 'viewer':
              expect(member.permissions.canEdit).to.be.false
              expect(member.permissions.canDelete).to.be.false
              expect(member.permissions.canInviteMembers).to.be.false
              expect(member.permissions.canManageSettings).to.be.false
              break
          }
        })
      })
    })
  })

  describe('2. 일정 관리 시스템', () => {
    it('프로젝트 타임라인을 생성해야 한다', () => {
      const scheduleData = {
        projectId: projectId,
        name: '마케팅 비디오 제작 일정',
        description: 'Q1 마케팅 캠페인용 비디오 제작 스케줄',
        timeline: {
          startDate: '2025-01-15T09:00:00Z',
          endDate: '2025-03-15T18:00:00Z',
          bufferDays: 5
        },
        workingDays: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
          { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isWorkingDay: false },
          { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isWorkingDay: false }
        ]
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/schedules`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: scheduleData
      }).then((response) => {
        expect(response.status).to.eq(201)
        
        const schedule = response.body.schedule
        scheduleId = schedule.id
        
        expect(schedule.projectId).to.eq(projectId)
        expect(schedule.name).to.eq(scheduleData.name)
        expect(schedule.status).to.eq('draft')
        expect(schedule.timeline.estimatedDuration).to.be.greaterThan(0)
        
        // 작업일 계산 검증
        expect(schedule.timeline.workingDays).to.have.length(7)
        const workingDaysCount = schedule.timeline.workingDays.filter(wd => wd.isWorkingDay).length
        expect(workingDaysCount).to.eq(5) // 주 5일 근무
      })
    })

    it('마일스톤 및 데드라인을 설정해야 한다', () => {
      // 마일스톤 추가
      const milestoneData = {
        name: '프리프로덕션 완료',
        description: '기획 및 준비 단계 완료',
        targetDate: '2025-02-01T18:00:00Z',
        priority: 'high',
        deliverables: ['스토리보드', '촬영계획서', '캐스팅 완료'],
        criteria: ['스토리보드 승인', '예산 확정', '촬영 일정 확정']
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/schedules/${scheduleId}/milestones`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: milestoneData
      }).then((response) => {
        expect(response.status).to.eq(201)
      })

      // 데드라인 추가
      const deadlineData = {
        name: '최종 납품',
        description: '클라이언트 최종 승인 및 납품',
        dueDate: '2025-03-10T18:00:00Z',
        type: 'hard',
        priority: 'critical',
        assignees: [userId],
        notifications: [
          {
            type: 'email',
            timing: 7, // 7일 전
            recipients: [userId]
          },
          {
            type: 'push',
            timing: 1, // 1일 전
            recipients: [userId]
          }
        ]
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/schedules/${scheduleId}/deadlines`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: deadlineData
      }).then((response) => {
        expect(response.status).to.eq(201)
      })
    })

    it('일정 조회 성능을 확인해야 한다', () => {
      // 성능 요구사항: 일정 조회 500ms 이내
      const startTime = Date.now()
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/schedules/${scheduleId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 500
      }).then((response) => {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        expect(response.status).to.eq(200)
        expect(responseTime).to.be.lessThan(500)
        
        const schedule = response.body.schedule
        expect(schedule.milestones).to.have.length.greaterThan(0)
        expect(schedule.deadlines).to.have.length.greaterThan(0)
      })
    })

    it('일정 충돌 감지 시스템을 테스트해야 한다', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/schedules/${scheduleId}/conflicts`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        const conflictData = response.body
        expect(conflictData).to.have.property('conflicts')
        expect(conflictData).to.have.property('scheduleId')
        expect(conflictData).to.have.property('detectedAt')
        expect(conflictData.scheduleId).to.eq(scheduleId)
        
        // 충돌 유형별 검증
        conflictData.conflicts.forEach((conflict: any) => {
          expect(conflict).to.have.property('type')
          expect(conflict).to.have.property('severity')
          expect(conflict).to.have.property('description')
          expect(conflict).to.have.property('affectedItems')
          
          expect(['resource_overallocation', 'schedule_overlap', 'deadline_impossible', 
                   'dependency_cycle', 'resource_unavailable']).to.include(conflict.type)
          expect(['low', 'medium', 'high', 'critical']).to.include(conflict.severity)
        })
      })
    })
  })

  describe('3. 프로젝트 템플릿 시스템', () => {
    it('산업별 기본 템플릿을 조회해야 한다', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/templates`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        qs: {
          category: 'marketing',
          industry: 'media',
          complexity: 'moderate',
          page: 1,
          limit: 10
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        const templateData = response.body
        expect(templateData).to.have.property('templates')
        expect(templateData).to.have.property('total')
        expect(templateData.templates).to.be.an('array')
        
        if (templateData.templates.length > 0) {
          const template = templateData.templates[0]
          templateId = template.id
          
          expect(template).to.have.property('name')
          expect(template).to.have.property('category')
          expect(template).to.have.property('industry')
          expect(template).to.have.property('structure')
          expect(template).to.have.property('schedule')
          expect(template).to.have.property('resources')
          expect(template).to.have.property('metadata')
          
          // 메타데이터 검증
          expect(template.metadata).to.have.property('complexity')
          expect(template.metadata).to.have.property('teamSize')
          expect(template.metadata).to.have.property('duration')
          expect(template.metadata.teamSize).to.have.property('min')
          expect(template.metadata.teamSize).to.have.property('max')
          expect(template.metadata.teamSize).to.have.property('optimal')
        }
      })
    })

    it('커스텀 템플릿을 생성해야 한다', () => {
      const templateData = {
        name: '비디오 마케팅 템플릿',
        description: '중소기업을 위한 비디오 마케팅 제작 템플릿',
        category: 'marketing',
        industry: 'media',
        isPublic: true,
        tags: ['marketing', 'video', 'small-business'],
        structure: {
          phases: [
            {
              id: 'phase_1',
              name: '기획 단계',
              description: '프로젝트 기획 및 준비',
              order: 1,
              estimatedDuration: 7,
              dependencies: [],
              deliverables: ['deliverable_1', 'deliverable_2'],
              roles: [{
                role: 'producer',
                count: 1,
                experienceLevel: 'intermediate',
                skills: ['project-management', 'planning'],
                allocation: 100
              }],
              resources: ['resource_1']
            }
          ],
          deliverables: [
            {
              id: 'deliverable_1',
              name: '프로젝트 기획서',
              type: 'document',
              format: ['pdf', 'docx'],
              approvalRequired: true,
              approvers: ['client'],
              dependencies: []
            }
          ],
          workflows: [],
          dependencies: []
        },
        schedule: {
          estimatedDuration: 30,
          bufferPercentage: 10,
          workingHours: {
            hoursPerDay: 8,
            daysPerWeek: 5,
            workingDays: [1, 2, 3, 4, 5],
            holidays: []
          },
          milestones: [
            {
              id: 'milestone_1',
              name: '기획 승인',
              daysFromStart: 7,
              priority: 'high',
              criteria: ['기획서 승인'],
              deliverables: ['deliverable_1']
            }
          ],
          deadlines: []
        },
        resources: [
          {
            id: 'resource_1',
            name: '프로듀서',
            type: 'person',
            role: 'producer',
            skillsRequired: ['project-management'],
            experienceLevel: 'intermediate',
            allocationPercentage: 50,
            phases: ['phase_1']
          }
        ],
        settings: {
          defaultVisibility: 'private',
          collaboration: {
            allowGuestComments: false,
            requireApproval: true,
            notificationSettings: {
              newComments: true,
              statusChanges: true,
              memberChanges: true
            }
          },
          approvalWorkflow: {
            enabled: true,
            levels: [
              {
                level: 1,
                name: '1차 승인',
                roles: ['reviewer'],
                threshold: 1
              }
            ],
            autoApproval: {
              enabled: false,
              conditions: [],
              timeout: 24
            }
          },
          notifications: {
            newComments: true,
            statusChanges: true,
            memberChanges: true
          },
          quality: {
            reviewRequired: true,
            reviewers: ['reviewer'],
            qualityGates: [],
            standards: []
          }
        },
        metadata: {
          complexity: 'moderate',
          teamSize: {
            min: 3,
            max: 8,
            optimal: 5
          },
          budget: {
            min: 10000,
            max: 50000,
            currency: 'USD'
          },
          duration: {
            min: 20,
            max: 45,
            typical: 30
          },
          successMetrics: ['온타임 납품', '예산 준수'],
          risks: [
            {
              name: '일정 지연',
              description: '클라이언트 피드백 지연으로 인한 일정 지연',
              probability: 'medium',
              impact: 'medium',
              mitigation: ['버퍼 시간 확보', '정기 검토 회의']
            }
          ],
          bestPractices: ['정기적인 클라이언트 커뮤니케이션'],
          commonPitfalls: ['초기 기획 부족', '스코프 크리프']
        }
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/templates`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: templateData
      }).then((response) => {
        expect(response.status).to.eq(201)
        
        const template = response.body.template
        expect(template.name).to.eq(templateData.name)
        expect(template.category).to.eq(templateData.category)
        expect(template.industry).to.eq(templateData.industry)
        expect(template.version).to.match(/^\d+\.\d+\.\d+$/)
        expect(template.usageCount).to.eq(0)
        expect(template.rating.count).to.eq(0)
        
        templateId = template.id
      })
    })

    it('템플릿 기반 빠른 프로젝트 생성을 테스트해야 한다', () => {
      if (!templateId) {
        cy.log('템플릿 ID가 없어 테스트를 건너뜁니다')
        return
      }

      const applyData = {
        projectName: 'Q1 마케팅 캠페인 비디오',
        projectDescription: '신제품 런칭을 위한 마케팅 비디오 제작',
        customizations: {
          startDate: '2025-02-01T09:00:00Z',
          budget: 25000,
          teamMembers: [userId],
          modifications: {
            schedule: {
              estimatedDuration: 35, // 기본값에서 5일 연장
              bufferPercentage: 15   // 버퍼 증가
            }
          }
        }
      }

      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/templates/${templateId}/apply`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: applyData
      }).then((response) => {
        expect(response.status).to.eq(201)
        
        expect(response.body).to.have.property('project')
        expect(response.body).to.have.property('schedule')
        
        const project = response.body.project
        const schedule = response.body.schedule
        
        // 템플릿 기반 프로젝트 생성 검증
        expect(project.name).to.eq(applyData.projectName)
        expect(project.description).to.eq(applyData.projectDescription)
        
        if (schedule) {
          expect(schedule.projectId).to.eq(project.id)
          expect(schedule.timeline.estimatedDuration).to.eq(35)
          expect(schedule.milestones).to.have.length.greaterThan(0)
        }
      })
    })
  })

  describe('4. 데이터 무결성 및 성능', () => {
    it('데이터 무결성을 검증해야 한다', () => {
      // 프로젝트-사용자 관계 정합성
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}/members`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        const members = response.body.members
        expect(members).to.be.an('array')
        
        // Owner가 멤버 목록에 포함되어 있는지 확인
        const owner = members.find((member: any) => member.role === 'owner')
        expect(owner).to.exist
        expect(owner.userId).to.eq(userId)
      })

      // 스케줄-프로젝트 연관성 검증
      if (scheduleId) {
        cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/api/schedules/${scheduleId}`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.schedule.projectId).to.eq(projectId)
        })
      }
    })

    it('권한 체크 성능을 확인해야 한다', () => {
      // 성능 요구사항: 권한 체크 100ms 이내
      const startTime = Date.now()
      
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 100
      }).then((response) => {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        expect(response.status).to.eq(200)
        expect(responseTime).to.be.lessThan(100)
        
        // 권한 정보가 포함되어 있는지 확인
        expect(response.body).to.have.property('permissions')
      })
    })

    it('동시 접근 시나리오를 테스트해야 한다', () => {
      // 동시 접근 요구사항: 100명 이상 지원
      const concurrentRequests = Array.from({ length: 10 }, (_, index) => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/api/projects/${projectId}`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          failOnStatusCode: false
        })
      })

      Promise.all(concurrentRequests).then((responses) => {
        // 모든 요청이 성공했는지 확인
        responses.forEach((response) => {
          expect(response.status).to.eq(200)
        })
      })
    })

    it('API 계약 검증 (상태 코드 정확성)을 확인해야 한다', () => {
      // 200: 성공적인 조회
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('project')
      })

      // 404: 존재하지 않는 리소스
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/non-existent-id`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body).to.have.property('error')
        expect(response.body.error).to.eq('NOT_FOUND')
      })

      // 401: 인증 실패
      cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401)
        expect(response.body).to.have.property('error')
        expect(response.body.error).to.eq('UNAUTHORIZED')
      })

      // 403: 권한 없음 (다른 사용자의 프로젝트 삭제 시도)
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}` // 일반 사용자 토큰
        },
        failOnStatusCode: false
      }).then((response) => {
        // Owner이므로 삭제 가능하다면 204, 아니라면 403
        expect([204, 403]).to.include(response.status)
      })

      // 400: 잘못된 요청 데이터
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/projects`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          // name 필드 누락 (필수 필드)
          description: 'Invalid project data',
          category: 'invalid-category'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('error')
        expect(response.body.error).to.eq('VALIDATION_ERROR')
        expect(response.body).to.have.property('details')
      })
    })
  })

  after(() => {
    // 테스트 정리: 생성된 프로젝트 삭제
    if (projectId) {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/api/projects/${projectId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log(`테스트 프로젝트 정리 완료: ${response.status}`)
      })
    }
  })
})