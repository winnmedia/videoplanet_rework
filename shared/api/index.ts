// Shared API utilities and configurations
// FSD Architecture: Centralized API exports

// RTK Query API Slice for state management
export { apiSlice } from './apiSlice';

// Custom API Client for direct HTTP calls
export { apiClient } from './client';
export { default as apiClientDefault } from './client';

// API Types and Interfaces
export type { ApiConfig, ApiResponse } from './client';