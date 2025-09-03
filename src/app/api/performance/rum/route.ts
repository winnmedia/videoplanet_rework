/**
 * RUM Data Collection API Endpoint
 * Receives and processes Real User Monitoring data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

// Extract types from Zod schemas
type RUMPayload = z.infer<typeof RUMPayloadSchema>;
type PerformanceMetric = RUMPayload['metrics'][0];
type PerformanceEvent = RUMPayload['events'][0];

// RUM payload validation schema
const RUMPayloadSchema = z.object({
  session: z.object({
    sessionId: z.string(),
    userId: z.string().optional(),
    userAgent: z.string(),
    url: z.string().url(),
    referrer: z.string(),
    timestamp: z.number(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }),
    connection: z.object({
      effectiveType: z.string().optional(),
      downlink: z.number().optional(),
      rtt: z.number().optional(),
    }).optional(),
    device: z.object({
      type: z.enum(['mobile', 'tablet', 'desktop']),
      memory: z.number().optional(),
      cores: z.number().optional(),
    }),
  }),
  metrics: z.array(z.object({
    sessionId: z.string(),
    metricName: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    timestamp: z.number(),
    url: z.string().url(),
    attribution: z.record(z.any()).optional(),
  })),
  events: z.array(z.object({
    sessionId: z.string(),
    eventType: z.enum(['page-view', 'interaction', 'error', 'custom']),
    eventName: z.string(),
    timestamp: z.number(),
    data: z.record(z.any()).optional(),
  })),
  timestamp: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    const body = JSON.parse(rawBody);
    const validatedData = RUMPayloadSchema.parse(body);

    // Extract data
    const { session, metrics, events } = validatedData;

    // Log for development (in production, this would go to a proper analytics service)
    if (process.env.NODE_ENV === 'development') {
      console.log('[RUM API] Received data:', {
        sessionId: session.sessionId,
        metricsCount: metrics.length,
        eventsCount: events.length,
        deviceType: session.device.type,
        url: session.url,
      });

      // Log performance issues
      const poorMetrics = metrics.filter(m => m.rating === 'poor');
      if (poorMetrics.length > 0) {
        console.warn('[RUM API] Performance issues detected:', poorMetrics);
      }
    }

    // Process metrics for alerting
    await processPerformanceMetrics(metrics);

    // Process events for analysis
    await processPerformanceEvents(events);

    // Store session data (in production, this would go to a database)
    await storeSessionData(session, metrics, events);

    return NextResponse.json(
      { 
        success: true, 
        processed: {
          metrics: metrics.length,
          events: events.length,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[RUM API] Error processing RUM data:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid data format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process performance metrics for alerting
 */
async function processPerformanceMetrics(metrics: PerformanceMetric[]) {
  for (const metric of metrics) {
    // Check for critical performance issues
    if (metric.rating === 'poor') {
      await triggerPerformanceAlert(metric);
    }

    // Store metric for trend analysis
    await storeMetricForAnalysis(metric);
  }
}

/**
 * Process performance events
 */
async function processPerformanceEvents(events: PerformanceEvent[]) {
  for (const event of events) {
    // Process different event types
    switch (event.eventType) {
      case 'error':
        await processErrorEvent(event);
        break;
      case 'interaction':
        await processInteractionEvent(event);
        break;
      case 'page-view':
        await processPageViewEvent(event);
        break;
      case 'custom':
        await processCustomEvent(event);
        break;
    }
  }
}

/**
 * Trigger performance alert for critical issues
 */
async function triggerPerformanceAlert(metric: PerformanceMetric) {
  // In production, this would integrate with your alerting system
  // (Slack, PagerDuty, email, etc.)
  
  console.warn(`[RUM API] Performance alert triggered: ${metric.metricName} = ${metric.value}ms (${metric.rating})`);
  
  // Example: Send to webhook (Slack, Discord, etc.)
  const webhookUrl = process.env.PERFORMANCE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 VLANET 성능 알림`,
          attachments: [{
            color: 'danger',
            title: `${metric.metricName} 성능 이슈`,
            text: `값: ${metric.value}ms (${metric.rating})`,
            fields: [
              { title: 'URL', value: metric.url, short: false },
              { title: 'Session', value: metric.sessionId, short: true },
              { title: 'Timestamp', value: new Date(metric.timestamp).toISOString(), short: true },
            ],
          }],
        }),
      });
    } catch (error) {
      console.error('[RUM API] Failed to send webhook alert:', error);
    }
  }
}

/**
 * Store metric for trend analysis
 */
async function storeMetricForAnalysis(metric: PerformanceMetric) {
  // In production, this would store to a time-series database
  // (InfluxDB, TimescaleDB, CloudWatch, etc.)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RUM API] Storing metric: ${metric.metricName} = ${metric.value}ms`);
  }
  
  // Example: Store to file system for development
  if (process.env.NODE_ENV === 'development') {
    // fs and path are already imported at the top
    
    const metricsFile = path.join(process.cwd(), 'performance-metrics.jsonl');
    const logEntry = JSON.stringify({
      ...metric,
      storedAt: new Date().toISOString(),
    }) + '\\n';
    
    try {
      await fs.appendFile(metricsFile, logEntry);
    } catch (_error) {
      // Ignore file write errors in development
    }
  }
}

/**
 * Store session data
 */
async function storeSessionData(_session: RUMPayload['session'], _metrics: PerformanceMetric[], _events: PerformanceEvent[]) {
  // In production, this would store to your main database
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RUM API] Session data stored: ${session.sessionId}`);
  }
}

/**
 * Process error events
 */
async function processErrorEvent(event: PerformanceEvent) {
  console.error(`[RUM API] Error event: ${event.eventName}`, event.data);
  
  // In production, integrate with error tracking service
  // (Sentry, Bugsnag, Rollbar, etc.)
}

/**
 * Process interaction events
 */
async function processInteractionEvent(event: PerformanceEvent) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RUM API] Interaction: ${event.eventName}`, event.data);
  }
  
  // Analyze user interaction patterns
}

/**
 * Process page view events
 */
async function processPageViewEvent(event: PerformanceEvent) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RUM API] Page view: ${event.eventName}`, event.data);
  }
  
  // Track page navigation patterns
}

/**
 * Process custom events
 */
async function processCustomEvent(event: PerformanceEvent) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RUM API] Custom event: ${event.eventName}`, event.data);
  }
  
  // Process custom performance events
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RUM Data Collector',
  });
}