/**
 * Comprehensive Error Handling Types
 * 종합적인 에러 처리를 위한 타입 시스템
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api', 
  UI = 'ui',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

export interface BaseError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  stack?: string;
  cause?: Error;
}

export interface NetworkError extends BaseError {
  category: ErrorCategory.NETWORK;
  status?: number;
  endpoint?: string;
  timeout?: boolean;
  retryCount?: number;
}

export interface APIError extends BaseError {
  category: ErrorCategory.API;
  status: number;
  endpoint: string;
  method: string;
  responseBody?: unknown;
}

export interface ValidationError extends BaseError {
  category: ErrorCategory.VALIDATION;
  field?: string;
  value?: unknown;
  constraint?: string;
}

export interface BusinessLogicError extends BaseError {
  category: ErrorCategory.BUSINESS_LOGIC;
  businessRule: string;
  violationType: string;
}

export type AppError = NetworkError | APIError | ValidationError | BusinessLogicError | BaseError;

export interface ErrorRecoveryAction {
  type: 'retry' | 'redirect' | 'fallback' | 'ignore' | 'refresh';
  label: string;
  action: () => void | Promise<void>;
}

export interface ErrorDisplayOptions {
  title?: string;
  message?: string;
  recoveryActions?: ErrorRecoveryAction[];
  showDetails?: boolean;
  persistent?: boolean;
  dismissible?: boolean;
}

export interface ErrorReportData {
  error: AppError;
  reportedAt: string;
  userFeedback?: string;
  resolved?: boolean;
  resolvedAt?: string;
}