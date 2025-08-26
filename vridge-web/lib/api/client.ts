/**
 * API Client for frontend-backend communication
 * Handles all HTTP requests with proper error handling and configuration
 */

import { config } from '@/lib/config/env';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface ApiRequestConfig extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
  withAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: HeadersInit;
  
  private constructor() {
    this.baseUrl = config.get('apiUrl');
    this.defaultTimeout = config.get('apiTimeout');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
  
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  /**
   * Create a promise that rejects after a timeout
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(config.getApiEndpoint(endpoint));
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }
  
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
    
    // For server-side, you might get the token from cookies
    // This would require passing the request context
    const apiKey = config.get('backendApiKey');
    if (apiKey) {
      return { 'X-API-Key': apiKey };
    }
    
    return {};
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: any, status?: number): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        status: status || 500,
        details: error.stack,
      };
    }
    
    if (typeof error === 'object' && error !== null) {
      return {
        message: error.message || 'An error occurred',
        status: error.status || status || 500,
        code: error.code,
        details: error.details || error,
      };
    }
    
    return {
      message: String(error),
      status: status || 500,
    };
  }
  
  /**
   * Main request method
   */
  private async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      timeout = this.defaultTimeout,
      withAuth = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = config;
    
    // Build URL
    const url = this.buildUrl(endpoint, params);
    
    // Prepare headers
    const authHeaders = withAuth ? await this.getAuthHeaders() : {};
    const headers = {
      ...this.defaultHeaders,
      ...authHeaders,
      ...customHeaders,
    };
    
    // Create fetch promise
    const fetchPromise = fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    try {
      // Race between fetch and timeout
      const response = await Promise.race([
        fetchPromise,
        this.createTimeoutPromise(timeout),
      ]) as Response;
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleError(errorData, response.status);
      }
      
      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text() as T;
      } else {
        data = await response.blob() as T;
      }
      
      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw this.handleError(error, 408);
      }
      throw error;
    }
  }
  
  /**
   * GET request
   */
  public async get<T = any>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
  }
  
  /**
   * POST request
   */
  public async post<T = any>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PUT request
   */
  public async put<T = any>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PATCH request
   */
  public async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * DELETE request
   */
  public async delete<T = any>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }
  
  /**
   * Upload file
   */
  public async upload<T = any>(
    endpoint: string,
    file: File | Blob,
    additionalData?: Record<string, any>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {
        ...config?.headers,
        // Remove Content-Type to let browser set it with boundary
        'Content-Type': undefined as any,
      },
    });
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();

// Export convenience functions
export const api = {
  get: <T = any>(endpoint: string, config?: ApiRequestConfig) => 
    apiClient.get<T>(endpoint, config),
  
  post: <T = any>(endpoint: string, data?: any, config?: ApiRequestConfig) => 
    apiClient.post<T>(endpoint, data, config),
  
  put: <T = any>(endpoint: string, data?: any, config?: ApiRequestConfig) => 
    apiClient.put<T>(endpoint, data, config),
  
  patch: <T = any>(endpoint: string, data?: any, config?: ApiRequestConfig) => 
    apiClient.patch<T>(endpoint, data, config),
  
  delete: <T = any>(endpoint: string, config?: ApiRequestConfig) => 
    apiClient.delete<T>(endpoint, config),
  
  upload: <T = any>(
    endpoint: string, 
    file: File | Blob, 
    additionalData?: Record<string, any>,
    config?: ApiRequestConfig
  ) => apiClient.upload<T>(endpoint, file, additionalData, config),
};

export default api;