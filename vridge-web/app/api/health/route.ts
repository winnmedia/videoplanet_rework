/**
 * Health check endpoint for monitoring service status
 * Used by deployment platforms and monitoring tools
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config/env';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database?: {
      status: 'ok' | 'error';
      message?: string;
    };
    redis?: {
      status: 'ok' | 'error';
      message?: string;
    };
    api?: {
      status: 'ok' | 'error';
      responseTime?: number;
      message?: string;
    };
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ status: 'ok' | 'error'; message?: string }> {
  try {
    // If database URL is configured, attempt to connect
    const databaseUrl = config.get('databaseUrl');
    if (!databaseUrl) {
      return { status: 'ok', message: 'Database not configured' };
    }
    
    // TODO: Implement actual database ping
    // For now, just check if URL is present
    return { status: 'ok' };
  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<{ status: 'ok' | 'error'; message?: string }> {
  try {
    const redisUrl = config.get('redisUrl');
    if (!redisUrl) {
      return { status: 'ok', message: 'Redis not configured' };
    }
    
    // TODO: Implement actual Redis ping
    // For now, just check if URL is present
    return { status: 'ok' };
  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Redis connection failed' 
    };
  }
}

/**
 * Check API connectivity
 */
async function checkApi(): Promise<{ status: 'ok' | 'error'; responseTime?: number; message?: string }> {
  try {
    const apiUrl = config.get('apiUrl');
    
    // In development, if backend is not running, just mark as ok but with a note
    if (config.isDevelopment()) {
      return { 
        status: 'ok', 
        message: 'Backend check skipped in development' 
      };
    }
    
    const startTime = Date.now();
    
    // Attempt to reach the API health endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { status: 'ok', responseTime };
      } else {
        return { 
          status: 'error', 
          responseTime,
          message: `API returned status ${response.status}` 
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // If it's a timeout or network error, still calculate response time
      const responseTime = Date.now() - startTime;
      
      // In development, backend might not be running, so don't treat as critical error
      if (config.isDevelopment()) {
        return { 
          status: 'ok', 
          responseTime,
          message: 'Backend not available (development mode)' 
        };
      }
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return { 
            status: 'error', 
            responseTime,
            message: 'API request timed out' 
          };
        }
        return { 
          status: 'error', 
          responseTime,
          message: fetchError.message 
        };
      }
      
      return { 
        status: 'error', 
        responseTime,
        message: 'API connection failed' 
      };
    }
  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'API check failed' 
    };
  }
}

/**
 * GET /api/health
 * Returns the health status of the application
 */
export async function GET(request: NextRequest) {
  const startTime = process.uptime();
  
  // Run health checks in parallel
  const [dbCheck, redisCheck, apiCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkApi(),
  ]);
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (dbCheck.status === 'error' || redisCheck.status === 'error') {
    overallStatus = 'degraded';
  }
  
  if (apiCheck.status === 'error') {
    overallStatus = 'unhealthy';
  }
  
  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: config.get('appVersion'),
    environment: config.get('env'),
    uptime: Math.floor(startTime),
    checks: {
      database: dbCheck,
      redis: redisCheck,
      api: apiCheck,
    },
  };
  
  // Set appropriate status code based on health
  const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;
  
  return NextResponse.json(healthStatus, { status: statusCode });
}

/**
 * HEAD /api/health
 * Simple health check that returns 200 if service is up
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}