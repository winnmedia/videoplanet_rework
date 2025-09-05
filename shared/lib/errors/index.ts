/**
 * Shared Error System - Public API
 * 에러 처리 시스템의 공개 인터페이스
 */

// Types
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  BaseError,
  NetworkError,
  APIError,
  ValidationError,
  BusinessLogicError,
  AppError,
  ErrorRecoveryAction,
  ErrorDisplayOptions,
  ErrorReportData,
} from './types';

// Core Error Handler
export { ErrorHandler, errorHandler } from './ErrorHandler';