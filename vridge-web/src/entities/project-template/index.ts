/**
 * project-template Public API
 * FSD 경계: 프로젝트 템플릿 도메인 엔티티의 Public 인터페이스
 */

// 템플릿 타입들과 도메인 로직 export
export type {
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
} from './model/types'

export {
  createTemplate,
  updateTemplate,
  cloneTemplate,
  applyTemplateToProject,
  rateTemplate,
  validateTemplateStructure,
  getRecommendedTemplates,
  calculateTemplateComplexity,
  estimateProjectCost
} from './model/template'