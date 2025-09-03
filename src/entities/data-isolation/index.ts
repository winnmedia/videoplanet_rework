// Public API for Data Isolation Domain Entity
export {
  ResourceType,
  DataAction,
  DataClassification,
  GdprRequestType,
  GdprRequestStatus,
  DataType,
  type DataOwnership,
  type DataAccessLog,
  type GdprDataRequest,
  type DataIsolationPolicy,
  type IsolationRule,
  type AccessRule,
  type RetentionRule,
  type DataShare,
  type ShareRestrictions,
  type GdprConsentStatus,
  type AccessContext,
  type DeviceInfo,
  type GeoLocation,
  validateDataOwnership,
  validateDataAccessLog,
  validateGdprDataRequest
} from './model/types'

export {
  DataOwnershipService,
  DataAccessLogger,
  GdprComplianceService
} from './model/dataIsolation'