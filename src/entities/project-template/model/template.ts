import {
  ProjectTemplate,
  CreateTemplateCommand,
  UpdateTemplateCommand,
  CloneTemplateCommand,
  ApplyTemplateCommand,
  RateTemplateCommand,
  TemplateModifications,
  ProjectCustomizations,
  TemplateRating,
  ComplexityLevel,
  TemplateCategory,
  IndustryType,
  RoleType
} from './types'
import { 
  Project, 
  CreateProjectCommand, 
  ProjectCategory,
  ProjectMemberRole 
} from '../../project'
import {
  ProjectSchedule,
  CreateScheduleCommand,
  AddMilestoneCommand,
  AddDeadlineCommand
} from '../../schedule'

// Template Domain Logic
export function createTemplate(command: CreateTemplateCommand): ProjectTemplate {
  const now = new Date()
  const templateId = generateTemplateId()
  
  // Validate template structure
  const validation = validateTemplateStructure(command)
  if (!validation.isValid) {
    throw new Error(`템플릿 구조가 유효하지 않습니다: ${validation.errors.join(', ')}`)
  }

  const initialRating: TemplateRating = {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  }

  return {
    id: templateId,
    name: command.name,
    description: command.description,
    category: command.category,
    industry: command.industry,
    version: '1.0.0',
    isPublic: command.isPublic,
    createdBy: command.createdBy,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    rating: initialRating,
    tags: command.tags,
    structure: command.structure,
    schedule: command.schedule,
    resources: command.resources,
    settings: command.settings,
    metadata: command.metadata
  }
}

export function updateTemplate(
  template: ProjectTemplate,
  command: UpdateTemplateCommand
): ProjectTemplate {
  if (template.id !== command.templateId) {
    throw new Error('템플릿 ID가 일치하지 않습니다')
  }

  const updatedTemplate: ProjectTemplate = {
    ...template,
    name: command.name ?? template.name,
    description: command.description ?? template.description,
    category: command.category ?? template.category,
    isPublic: command.isPublic ?? template.isPublic,
    tags: command.tags ?? template.tags,
    updatedAt: new Date(),
    version: incrementVersion(template.version)
  }

  if (command.structure) {
    updatedTemplate.structure = { ...template.structure, ...command.structure }
  }

  if (command.schedule) {
    updatedTemplate.schedule = { ...template.schedule, ...command.schedule }
  }

  if (command.resources) {
    updatedTemplate.resources = command.resources
  }

  if (command.settings) {
    updatedTemplate.settings = { ...template.settings, ...command.settings }
  }

  if (command.metadata) {
    updatedTemplate.metadata = { ...template.metadata, ...command.metadata }
  }

  // Validate updated structure
  const validation = validateTemplateStructure(updatedTemplate)
  if (!validation.isValid) {
    throw new Error(`업데이트된 템플릿 구조가 유효하지 않습니다: ${validation.errors.join(', ')}`)
  }

  return updatedTemplate
}

export function cloneTemplate(
  originalTemplate: ProjectTemplate,
  command: CloneTemplateCommand
): ProjectTemplate {
  if (originalTemplate.id !== command.templateId) {
    throw new Error('템플릿 ID가 일치하지 않습니다')
  }

  const now = new Date()
  const clonedId = generateTemplateId()

  let clonedTemplate: ProjectTemplate = {
    ...originalTemplate,
    id: clonedId,
    name: command.name,
    description: command.description ?? originalTemplate.description,
    createdBy: command.clonedBy,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    rating: {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    },
    version: '1.0.0'
  }

  // Apply modifications if provided
  if (command.modifications) {
    clonedTemplate = applyTemplateModifications(clonedTemplate, command.modifications)
  }

  return clonedTemplate
}

export function applyTemplateToProject(
  template: ProjectTemplate,
  command: ApplyTemplateCommand
): { project: Project; schedule?: ProjectSchedule } {
  if (template.id !== command.templateId) {
    throw new Error('템플릿 ID가 일치하지 않습니다')
  }

  // Create project from template
  const projectCommand: CreateProjectCommand = {
    name: command.projectName,
    description: command.projectDescription || template.description,
    ownerId: command.appliedBy,
    category: mapTemplateCategoryToProjectCategory(template.category),
    settings: {
      visibility: template.settings.defaultVisibility as any,
      allowComments: template.settings.collaboration.allowGuestComments,
      allowDownloads: template.settings.collaboration.requireApproval,
      videoQuality: 'high' as any,
      collaboration: template.settings.collaboration as any
    },
    tags: template.tags
  }

  const project: Project = {
    id: generateProjectId(),
    name: projectCommand.name,
    description: projectCommand.description,
    status: 'draft' as any,
    owner: {
      userId: command.appliedBy,
      role: ProjectMemberRole.OWNER,
      joinedAt: new Date(),
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
    settings: projectCommand.settings as any,
    metadata: {
      tags: template.tags,
      category: projectCommand.category,
      deliverables: template.structure.deliverables.map(d => d.name)
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false
  }

  // Create schedule from template if customizations include start date
  let schedule: ProjectSchedule | undefined

  if (command.customizations?.startDate) {
    const startDate = command.customizations.startDate
    const endDate = new Date(startDate.getTime() + (template.schedule.estimatedDuration * 24 * 60 * 60 * 1000))

    const scheduleCommand: CreateScheduleCommand = {
      projectId: project.id,
      name: `${command.projectName} 일정`,
      description: `${template.name} 템플릿 기반 프로젝트 일정`,
      timeline: {
        startDate,
        endDate,
        bufferDays: Math.floor(template.schedule.estimatedDuration * template.schedule.bufferPercentage / 100)
      },
      createdBy: command.appliedBy
    }

    schedule = {
      id: generateScheduleId(),
      projectId: project.id,
      name: scheduleCommand.name,
      description: scheduleCommand.description,
      timeline: {
        startDate: scheduleCommand.timeline.startDate,
        endDate: scheduleCommand.timeline.endDate,
        estimatedDuration: template.schedule.estimatedDuration,
        bufferDays: scheduleCommand.timeline.bufferDays,
        workingDays: template.schedule.workingHours as any,
        phases: template.structure.phases.map(phase => ({
          id: generatePhaseId(),
          name: phase.name,
          description: phase.description,
          startDate: new Date(startDate.getTime() + (phase.order * 24 * 60 * 60 * 1000)),
          endDate: new Date(startDate.getTime() + ((phase.order + phase.estimatedDuration) * 24 * 60 * 60 * 1000)),
          dependencies: phase.dependencies,
          status: 'not_started' as any,
          progress: 0,
          deliverables: phase.deliverables,
          assignees: []
        }))
      },
      milestones: template.schedule.milestones.map(milestone => ({
        id: generateMilestoneId(),
        name: milestone.name,
        description: milestone.description,
        targetDate: new Date(startDate.getTime() + (milestone.daysFromStart * 24 * 60 * 60 * 1000)),
        status: 'pending' as any,
        priority: milestone.priority,
        deliverables: milestone.deliverables,
        dependencies: [],
        approvers: [],
        criteria: milestone.criteria
      })),
      deadlines: template.schedule.deadlines.map(deadline => ({
        id: generateDeadlineId(),
        name: deadline.name,
        description: deadline.description,
        dueDate: new Date(startDate.getTime() + (deadline.daysFromStart * 24 * 60 * 60 * 1000)),
        type: deadline.type,
        priority: deadline.priority,
        status: 'pending' as any,
        assignees: [],
        notifications: []
      })),
      dependencies: [],
      resources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft' as any,
      version: 1
    }
  }

  return { project, schedule }
}

export function rateTemplate(
  template: ProjectTemplate,
  command: RateTemplateCommand
): ProjectTemplate {
  if (template.id !== command.templateId) {
    throw new Error('템플릿 ID가 일치하지 않습니다')
  }

  if (command.rating < 1 || command.rating > 5) {
    throw new Error('평점은 1-5 사이의 값이어야 합니다')
  }

  const newRating: TemplateRating = {
    ...template.rating,
    count: template.rating.count + 1
  }

  // Update distribution
  newRating.distribution[command.rating as keyof typeof newRating.distribution]++

  // Calculate new average
  const totalScore = Object.entries(newRating.distribution).reduce(
    (sum, [rating, count]) => sum + (parseInt(rating) * count),
    0
  )
  newRating.average = Math.round((totalScore / newRating.count) * 10) / 10

  return {
    ...template,
    rating: newRating,
    updatedAt: new Date()
  }
}

export function validateTemplateStructure(
  template: CreateTemplateCommand | ProjectTemplate
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if phases have valid dependencies
  const phaseIds = new Set(template.structure.phases.map(p => p.id))
  template.structure.phases.forEach(phase => {
    phase.dependencies.forEach(depId => {
      if (!phaseIds.has(depId)) {
        errors.push(`페이즈 "${phase.name}"의 의존성 "${depId}"를 찾을 수 없습니다`)
      }
    })
  })

  // Check if deliverables exist for phases
  const deliverableIds = new Set(template.structure.deliverables.map(d => d.id))
  template.structure.phases.forEach(phase => {
    phase.deliverables.forEach(delivId => {
      if (!deliverableIds.has(delivId)) {
        errors.push(`페이즈 "${phase.name}"의 결과물 "${delivId}"를 찾을 수 없습니다`)
      }
    })
  })

  // Check for circular dependencies in phases
  const hasCycles = detectCircularDependencies(
    template.structure.phases.map(p => ({
      id: p.id,
      dependencies: p.dependencies
    }))
  )
  if (hasCycles) {
    errors.push('페이즈 간 순환 의존성이 감지되었습니다')
  }

  // Validate schedule consistency
  if (template.schedule.estimatedDuration <= 0) {
    errors.push('예상 기간은 0보다 커야 합니다')
  }

  if (template.schedule.bufferPercentage < 0 || template.schedule.bufferPercentage > 100) {
    errors.push('버퍼 비율은 0-100% 사이여야 합니다')
  }

  // Validate milestones are within duration
  template.schedule.milestones.forEach(milestone => {
    if (milestone.daysFromStart > template.schedule.estimatedDuration) {
      errors.push(`마일스톤 "${milestone.name}"이 프로젝트 기간을 초과합니다`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function getRecommendedTemplates(
  userProfile: {
    industry?: IndustryType
    teamSize?: number
    experience?: ComplexityLevel
    previousCategories?: TemplateCategory[]
  },
  availableTemplates: ProjectTemplate[]
): ProjectTemplate[] {
  let scored = availableTemplates.map(template => ({
    template,
    score: calculateRecommendationScore(template, userProfile)
  }))

  // Sort by score and return top recommendations
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.template)
}

export function calculateTemplateComplexity(template: ProjectTemplate): ComplexityLevel {
  let complexityScore = 0

  // Factor in number of phases
  complexityScore += template.structure.phases.length * 2

  // Factor in dependencies
  complexityScore += template.structure.dependencies.length

  // Factor in number of roles required
  const uniqueRoles = new Set(template.resources.map(r => r.role))
  complexityScore += uniqueRoles.size * 3

  // Factor in workflow complexity
  complexityScore += template.structure.workflows.length * 2

  // Factor in estimated duration
  if (template.schedule.estimatedDuration > 90) complexityScore += 10
  else if (template.schedule.estimatedDuration > 30) complexityScore += 5

  // Determine complexity level
  if (complexityScore <= 15) return ComplexityLevel.SIMPLE
  if (complexityScore <= 35) return ComplexityLevel.MODERATE
  if (complexityScore <= 60) return ComplexityLevel.COMPLEX
  return ComplexityLevel.EXPERT
}

export function estimateProjectCost(
  template: ProjectTemplate,
  customizations?: ProjectCustomizations
): {
  totalCost: number
  breakdown: CostBreakdown
  currency: string
} {
  const breakdown: CostBreakdown = {
    personnel: 0,
    equipment: 0,
    software: 0,
    materials: 0,
    overhead: 0
  }

  // Calculate personnel costs
  template.resources.forEach(resource => {
    if (resource.cost && resource.type === 'person') {
      const daysNeeded = template.schedule.estimatedDuration * (resource.allocationPercentage / 100)
      const hoursNeeded = daysNeeded * template.schedule.workingHours.hoursPerDay
      breakdown.personnel += hoursNeeded * resource.cost.hourlyRate
    }
  })

  // Calculate equipment and other costs
  template.resources.forEach(resource => {
    if (resource.cost && resource.type !== 'person') {
      const cost = resource.cost.hourlyRate || 0
      switch (resource.type) {
        case 'equipment':
          breakdown.equipment += cost
          break
        case 'software':
          breakdown.software += cost
          break
        case 'material':
          breakdown.materials += cost
          break
      }
    }
  })

  // Add overhead (typically 10-20% of personnel costs)
  breakdown.overhead = breakdown.personnel * 0.15

  const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)

  return {
    totalCost,
    breakdown,
    currency: 'USD' // Default currency
  }
}

// Helper functions
function generateTemplateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateScheduleId(): string {
  return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generatePhaseId(): string {
  return `phase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateMilestoneId(): string {
  return `milestone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateDeadlineId(): string {
  return `deadline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2]) + 1
  return `${parts[0]}.${parts[1]}.${patch}`
}

function applyTemplateModifications(
  template: ProjectTemplate,
  modifications: TemplateModifications
): ProjectTemplate {
  return {
    ...template,
    structure: modifications.structure ? { ...template.structure, ...modifications.structure } : template.structure,
    schedule: modifications.schedule ? { ...template.schedule, ...modifications.schedule } : template.schedule,
    resources: modifications.resources || template.resources,
    settings: modifications.settings ? { ...template.settings, ...modifications.settings } : template.settings
  }
}

function mapTemplateCategoryToProjectCategory(category: TemplateCategory): ProjectCategory {
  const mapping: Record<TemplateCategory, ProjectCategory> = {
    [TemplateCategory.MARKETING]: ProjectCategory.MARKETING,
    [TemplateCategory.EDUCATION]: ProjectCategory.EDUCATION,
    [TemplateCategory.ENTERTAINMENT]: ProjectCategory.ENTERTAINMENT,
    [TemplateCategory.CORPORATE]: ProjectCategory.CORPORATE,
    [TemplateCategory.DOCUMENTARY]: ProjectCategory.DOCUMENTARY,
    [TemplateCategory.SOCIAL_MEDIA]: ProjectCategory.MARKETING,
    [TemplateCategory.EVENT]: ProjectCategory.MARKETING,
    [TemplateCategory.PRODUCT]: ProjectCategory.CORPORATE,
    [TemplateCategory.TRAINING]: ProjectCategory.EDUCATION,
    [TemplateCategory.CUSTOM]: ProjectCategory.OTHER
  }
  return mapping[category] || ProjectCategory.OTHER
}

function detectCircularDependencies(
  items: Array<{ id: string; dependencies: string[] }>
): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    recursionStack.add(nodeId)

    const node = items.find(item => item.id === nodeId)
    if (node) {
      for (const depId of node.dependencies) {
        if (hasCycle(depId)) return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const item of items) {
    if (hasCycle(item.id)) return true
  }

  return false
}

function calculateRecommendationScore(
  template: ProjectTemplate,
  userProfile: any
): number {
  let score = 0

  // Industry match
  if (userProfile.industry === template.industry) {
    score += 20
  }

  // Team size compatibility
  if (userProfile.teamSize) {
    const teamSizeRange = template.metadata.teamSize
    if (userProfile.teamSize >= teamSizeRange.min && userProfile.teamSize <= teamSizeRange.max) {
      score += 15
    }
  }

  // Experience level match
  if (userProfile.experience === template.metadata.complexity) {
    score += 10
  }

  // Category preference
  if (userProfile.previousCategories?.includes(template.category)) {
    score += 10
  }

  // Rating boost
  score += template.rating.average * 2

  // Usage popularity
  score += Math.min(template.usageCount / 10, 5)

  return score
}

interface CostBreakdown {
  personnel: number
  equipment: number
  software: number
  materials: number
  overhead: number
}