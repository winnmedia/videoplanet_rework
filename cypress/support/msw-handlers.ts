// MSW handlers for deterministic E2E testing
import { http, HttpResponse } from 'msw'

// Authentication handlers
export const authHandlers = [
  // Sign up
  http.post('/api/auth/signup', async ({ request }) => {
    const { username, email, password } = await request.json() as any
    
    // Simulate validation
    if (!email || !password || password.length < 8) {
      return new HttpResponse(JSON.stringify({
        error: 'Invalid input data',
        details: 'Password must be at least 8 characters'
      }), { status: 400 })
    }
    
    return HttpResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: 'user-123',
        username,
        email,
        createdAt: new Date().toISOString()
      }
    })
  }),
  
  // Sign in
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as any
    
    // Simulate login validation
    if (email.includes('test') && password === 'Test123!@#') {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'user-123',
          email,
          username: 'testuser',
          role: 'user'
        },
        token: 'mock-jwt-token'
      })
    }
    
    return new HttpResponse(JSON.stringify({
      error: 'Invalid credentials'
    }), { status: 401 })
  }),
  
  // Get current user
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      isAuthenticated: true
    })
  })
]

// Project management handlers
export const projectHandlers = [
  // Create project
  http.post('/api/projects', async ({ request }) => {
    const projectData = await request.json() as any
    
    return HttpResponse.json({
      id: 'project-123',
      slug: 'test-project-' + Date.now(),
      ...projectData,
      createdAt: new Date().toISOString(),
      schedule: {
        planning: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
          duration: '1주'
        },
        shooting: {
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
          duration: '1일'
        },
        editing: {
          startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
          duration: '2주'
        }
      }
    })
  }),
  
  // Send team invitation
  http.post('/api/projects/:projectId/invites', async ({ request, params }) => {
    const inviteData = await request.json() as any
    
    // Simulate SendGrid integration
    return HttpResponse.json({
      success: true,
      inviteId: 'invite-' + Date.now(),
      message: '초대장이 전송되었습니다',
      email: inviteData.email,
      role: inviteData.role,
      projectId: params.projectId,
      cooldownUntil: new Date(Date.now() + 60000).toISOString() // 60 seconds cooldown
    })
  }),
  
  // Get project permissions
  http.get('/api/projects/:projectId/permissions', ({ params }) => {
    return HttpResponse.json({
      projectId: params.projectId,
      userRole: 'owner', // Default for test user
      permissions: {
        canEdit: true,
        canInvite: true,
        canDelete: true,
        canManageSettings: true
      }
    })
  })
]

// AI Video Planning handlers
export const aiPlanningHandlers = [
  // Generate 4-act structure
  http.post('/api/ai/generate-structure', async ({ request }) => {
    const { story, tone, genre } = await request.json() as any
    
    // Simulate Google Gemini API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return HttpResponse.json({
      structure: {
        act1: '도입부: 주인공과 상황 설정',
        act2: '갈등 발전: 문제 상황 심화',
        act3: '절정: 갈등 최고조',
        act4: '해결: 결말과 메시지 전달'
      },
      metadata: {
        tone,
        genre,
        estimatedDuration: '2-3 minutes',
        keyThemes: ['innovation', 'collaboration', 'success']
      }
    })
  }),
  
  // Generate 12-shot breakdown
  http.post('/api/ai/generate-shots', async ({ request }) => {
    const structureData = await request.json() as any
    
    // Simulate shot generation delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const shots = Array.from({ length: 12 }, (_, i) => ({
      shotNumber: i + 1,
      shotType: ['Wide', 'Medium', 'Close-up', 'Detail'][i % 4],
      description: `Shot ${i + 1}: ${structureData.act1 ? 'Act 1' : 'Generated'} scene description`,
      duration: '5-8 seconds',
      notes: 'Camera movement and lighting notes'
    }))
    
    return HttpResponse.json({
      shots,
      storyboard: {
        generated: true,
        images: shots.map((_, i) => `/api/storyboard/shot-${i + 1}.jpg`)
      }
    })
  }),
  
  // Advanced prompt builder
  http.post('/api/ai/prompt-builder/execute', async ({ request }) => {
    const { promptChain, metadata } = await request.json() as any
    
    // Simulate AI processing chain
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const results = promptChain.map((prompt: any, index: number) => ({
      stepIndex: index,
      stepName: prompt.step,
      input: prompt.prompt,
      output: `Generated response for step ${index + 1}: ${prompt.step}`,
      qualityScore: 0.85,
      executionTime: '2.3s'
    }))
    
    return HttpResponse.json({
      executionId: 'exec-' + Date.now(),
      results,
      overallQuality: 0.87,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString()
      }
    })
  }),
  
  // Export to PDF
  http.post('/api/ai/export-pdf', async ({ request }) => {
    const exportData = await request.json() as any
    
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    return HttpResponse.json({
      success: true,
      files: {
        json: exportData.format.includes('json') ? '/downloads/plan-export.json' : null,
        pdf: exportData.format.includes('marp') ? '/downloads/plan-export.pdf' : null
      },
      message: '내보내기 완료'
    })
  })
]

// Video feedback handlers
export const feedbackHandlers = [
  // Setup video feedback session
  http.get('/api/videos/:videoId/feedback-session', ({ params }) => {
    return HttpResponse.json({
      videoId: params.videoId,
      title: 'Test Video Title',
      duration: '00:02:30',
      videoUrl: '/api/videos/test-video.mp4',
      project: {
        id: 'project-123',
        name: 'Test Project',
        slug: 'test-project'
      },
      permissions: {
        canComment: true,
        canReply: true,
        canTakeScreenshots: true
      }
    })
  }),
  
  // Add timecode comment
  http.post('/api/videos/:videoId/comments', async ({ request, params }) => {
    const commentData = await request.json() as any
    
    return HttpResponse.json({
      id: 'comment-' + Date.now(),
      videoId: params.videoId,
      userId: 'user-123',
      username: 'testuser',
      timecode: commentData.timecode,
      content: commentData.comment,
      category: commentData.category || 'general',
      mentions: commentData.mentions || [],
      createdAt: new Date().toISOString(),
      replies: []
    })
  }),
  
  // Take screenshot
  http.post('/api/videos/:videoId/screenshots', async ({ request, params }) => {
    const { timecode, projectSlug, description } = await request.json() as any
    
    // Generate standardized filename
    const timestamp = new Date()
    const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '')
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '')
    const timecodeFormatted = timecode.replace(/:/g, '').replace(/\./g, '')
    const filename = `${projectSlug}_TC${timecodeFormatted}_${dateStr}T${timeStr}.jpg`
    
    return HttpResponse.json({
      success: true,
      screenshot: {
        filename,
        url: `/screenshots/${filename}`,
        timecode,
        description,
        createdAt: new Date().toISOString()
      }
    })
  })
]

// Dashboard handlers
export const dashboardHandlers = [
  // Get dashboard summary
  http.get('/api/dashboard/summary', () => {
    return HttpResponse.json({
      newComments: 5,
      newReplies: 3,
      newReactions: 12,
      pendingInvites: 2,
      activeProjects: 4,
      upcomingDeadlines: 1,
      recentActivity: [
        {
          type: 'comment',
          message: '새로운 댓글이 달렸습니다',
          projectName: 'Test Project',
          timestamp: new Date().toISOString()
        }
      ]
    })
  }),
  
  // Get notifications
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit') || '10'
    
    const notifications = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: 'notification-' + i,
      type: ['comment', 'reply', 'mention', 'invite'][i % 4],
      message: `Notification ${i + 1} message`,
      projectId: 'project-123',
      projectName: 'Test Project',
      isRead: i > 2, // First 3 unread
      createdAt: new Date(Date.now() - i * 60000).toISOString()
    }))
    
    return HttpResponse.json({
      notifications,
      unreadCount: 3,
      hasMore: false
    })
  })
]

// Calendar and scheduling handlers
export const calendarHandlers = [
  // Get schedule conflicts
  http.post('/api/calendar/check-conflicts', async ({ request }) => {
    const { startDate, endDate, type } = await request.json() as any
    
    if (type === 'shooting') {
      // Simulate conflict detection
      const hasConflict = startDate === '2024-01-15'
      
      if (hasConflict) {
        return HttpResponse.json({
          hasConflicts: true,
          conflicts: [{
            id: 'schedule-conflict-1',
            projectName: 'Existing Project',
            conflictType: 'shooting',
            startDate: '2024-01-15',
            endDate: '2024-01-16',
            message: '촬영 일정 충돌'
          }]
        })
      }
    }
    
    return HttpResponse.json({
      hasConflicts: false,
      conflicts: []
    })
  }),
  
  // Create schedule
  http.post('/api/calendar/schedules', async ({ request }) => {
    const scheduleData = await request.json() as any
    
    return HttpResponse.json({
      id: 'schedule-' + Date.now(),
      ...scheduleData,
      createdAt: new Date().toISOString()
    })
  })
]

// Combine all handlers
export const allHandlers = [
  ...authHandlers,
  ...projectHandlers,
  ...aiPlanningHandlers,
  ...feedbackHandlers,
  ...dashboardHandlers,
  ...calendarHandlers
]