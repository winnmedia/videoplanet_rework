#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test
 * Tests the integration between Next.js frontend and Django backend
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Test results
const results = {
  frontend: { passed: 0, failed: 0, tests: [] },
  backend: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] },
};

// Helper function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'VRidge-Integration-Test/1.0',
      },
      timeout: 5000,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

// Test Frontend
async function testFrontend() {
  console.log(`\n${colors.blue}${colors.bold}=== Frontend Tests ===${colors.reset}\n`);
  
  const tests = [
    { name: 'Homepage', url: `${FRONTEND_URL}/`, expectedStatus: 200 },
    { name: 'Health API', url: `${FRONTEND_URL}/api/health`, expectedStatus: 200 },
    { name: 'Static Assets', url: `${FRONTEND_URL}/logo.svg`, expectedStatus: 200 },
  ];
  
  for (const test of tests) {
    const response = await makeRequest(test.url);
    const passed = response.status === test.expectedStatus;
    
    if (passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${test.name}: ${response.status}`);
      results.frontend.passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${test.name}: Expected ${test.expectedStatus}, got ${response.status || 'error'}`);
      if (response.error) console.log(`    Error: ${response.error}`);
      results.frontend.failed++;
    }
    
    results.frontend.tests.push({
      ...test,
      actualStatus: response.status,
      passed,
      error: response.error,
    });
  }
}

// Test Backend
async function testBackend() {
  console.log(`\n${colors.blue}${colors.bold}=== Backend Tests ===${colors.reset}\n`);
  
  const backendCheck = await makeRequest(`${BACKEND_URL}/health/`);
  
  if (backendCheck.error || backendCheck.status === 0) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Backend is not running at ${BACKEND_URL}`);
    console.log(`  ${colors.yellow}⚠${colors.reset} Skipping backend tests`);
    results.backend.skipped = true;
    return false;
  }
  
  const tests = [
    { name: 'Health Check', url: `${BACKEND_URL}/health/`, expectedStatus: 200 },
    { name: 'Admin Panel', url: `${BACKEND_URL}/admin/`, expectedStatus: [200, 302] },
    { name: 'API Root', url: `${BACKEND_URL}/api/`, expectedStatus: [200, 404] },
  ];
  
  for (const test of tests) {
    const response = await makeRequest(test.url);
    const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
    const passed = expectedStatuses.includes(response.status);
    
    if (passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${test.name}: ${response.status}`);
      results.backend.passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${test.name}: Expected ${expectedStatuses.join(' or ')}, got ${response.status || 'error'}`);
      if (response.error) console.log(`    Error: ${response.error}`);
      results.backend.failed++;
    }
    
    results.backend.tests.push({
      ...test,
      actualStatus: response.status,
      passed,
      error: response.error,
    });
  }
  
  return true;
}

// Test Integration
async function testIntegration(backendAvailable) {
  console.log(`\n${colors.blue}${colors.bold}=== Integration Tests ===${colors.reset}\n`);
  
  if (!backendAvailable) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Backend unavailable, testing frontend resilience`);
    
    // Test frontend's ability to handle backend unavailability
    const healthResponse = await makeRequest(`${FRONTEND_URL}/api/health`);
    
    if (healthResponse.status === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Frontend health check works without backend`);
      results.integration.passed++;
      
      try {
        const healthData = JSON.parse(healthResponse.body);
        if (healthData.checks && healthData.checks.api) {
          console.log(`  ${colors.cyan}ℹ${colors.reset} API status: ${healthData.checks.api.status}`);
          if (healthData.checks.api.message) {
            console.log(`  ${colors.cyan}ℹ${colors.reset} Message: ${healthData.checks.api.message}`);
          }
        }
      } catch (e) {
        // JSON parse error, ignore
      }
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Frontend health check failed`);
      results.integration.failed++;
    }
    
    results.integration.tests.push({
      name: 'Frontend Resilience',
      passed: healthResponse.status === 200,
      actualStatus: healthResponse.status,
    });
    
    return;
  }
  
  // Full integration tests when backend is available
  const tests = [
    {
      name: 'CORS Configuration',
      test: async () => {
        const response = await makeRequest(`${BACKEND_URL}/health/`);
        const corsHeader = response.headers['access-control-allow-origin'];
        const passed = corsHeader && (corsHeader === '*' || corsHeader.includes('localhost:3000'));
        return { passed, message: corsHeader ? `CORS: ${corsHeader}` : 'No CORS header' };
      },
    },
    {
      name: 'API Connectivity',
      test: async () => {
        const frontendHealth = await makeRequest(`${FRONTEND_URL}/api/health`);
        if (frontendHealth.status !== 200) return { passed: false, message: 'Frontend health check failed' };
        
        try {
          const data = JSON.parse(frontendHealth.body);
          const apiCheck = data.checks?.api;
          const passed = apiCheck?.status === 'ok';
          return { passed, message: apiCheck?.message || 'API check status' };
        } catch (e) {
          return { passed: false, message: 'Invalid JSON response' };
        }
      },
    },
  ];
  
  for (const test of tests) {
    const result = await test.test();
    
    if (result.passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${test.name}`);
      if (result.message) console.log(`    ${colors.cyan}ℹ${colors.reset} ${result.message}`);
      results.integration.passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${test.name}`);
      if (result.message) console.log(`    ${colors.red}→${colors.reset} ${result.message}`);
      results.integration.failed++;
    }
    
    results.integration.tests.push({
      name: test.name,
      ...result,
    });
  }
}

// Generate Summary Report
function generateReport() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`\n${colors.blue}${colors.bold}=== Integration Test Summary ===${colors.reset}\n`);
  
  // Frontend Summary
  console.log(`${colors.bold}Frontend:${colors.reset}`);
  console.log(`  ${colors.green}Passed:${colors.reset} ${results.frontend.passed}`);
  console.log(`  ${colors.red}Failed:${colors.reset} ${results.frontend.failed}`);
  console.log(`  Total: ${results.frontend.passed + results.frontend.failed}`);
  
  // Backend Summary
  console.log(`\n${colors.bold}Backend:${colors.reset}`);
  if (results.backend.skipped) {
    console.log(`  ${colors.yellow}Status: Not Available${colors.reset}`);
    console.log(`  ${colors.cyan}ℹ${colors.reset} Backend tests were skipped`);
  } else {
    console.log(`  ${colors.green}Passed:${colors.reset} ${results.backend.passed}`);
    console.log(`  ${colors.red}Failed:${colors.reset} ${results.backend.failed}`);
    console.log(`  Total: ${results.backend.passed + results.backend.failed}`);
  }
  
  // Integration Summary
  console.log(`\n${colors.bold}Integration:${colors.reset}`);
  console.log(`  ${colors.green}Passed:${colors.reset} ${results.integration.passed}`);
  console.log(`  ${colors.red}Failed:${colors.reset} ${results.integration.failed}`);
  console.log(`  Total: ${results.integration.passed + results.integration.failed}`);
  
  // Overall Result
  const totalPassed = results.frontend.passed + results.backend.passed + results.integration.passed;
  const totalFailed = results.frontend.failed + results.backend.failed + results.integration.failed;
  const totalTests = totalPassed + totalFailed;
  
  console.log(`\n${colors.bold}Overall:${colors.reset}`);
  console.log(`  Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
  console.log(`  Total Tests: ${totalTests}`);
  
  // Save JSON report
  const fs = require('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    frontend_url: FRONTEND_URL,
    backend_url: BACKEND_URL,
    results,
    summary: {
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      success_rate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%',
      backend_available: !results.backend.skipped,
    },
  };
  
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results', { recursive: true });
  }
  
  fs.writeFileSync('./test-results/integration-test-report.json', JSON.stringify(reportData, null, 2));
  console.log(`\n${colors.cyan}Report saved:${colors.reset} ./test-results/integration-test-report.json`);
  
  // Exit code
  if (totalFailed > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Some tests failed${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All tests passed!${colors.reset}`);
    process.exit(0);
  }
}

// Main Test Runner
async function runIntegrationTests() {
  console.log(`${colors.bold}${colors.blue}=== VRidge Integration Test Suite ===${colors.reset}\n`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Run tests
  await testFrontend();
  const backendAvailable = await testBackend();
  await testIntegration(backendAvailable);
  
  // Generate report
  generateReport();
}

// Run tests
runIntegrationTests().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});