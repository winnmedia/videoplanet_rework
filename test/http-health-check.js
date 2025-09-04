#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Define all routes to test
const routes = [
  { path: '/', name: 'Homepage', expectedStatus: 200 },
  { path: '/api/health', name: 'Health API', expectedStatus: 200, isApi: true },
  { path: '/favicon.ico', name: 'Favicon', expectedStatus: [200, 404] }, // May not exist
  { path: '/logo.svg', name: 'Logo SVG', expectedStatus: 200 },
  { path: '/w_logo.svg', name: 'White Logo SVG', expectedStatus: 200 },
];

// Test non-existent routes for 404 handling
const notFoundRoutes = [
  { path: '/non-existent-page', name: '404 Page Test', expectedStatus: 404 },
  { path: '/admin/dashboard', name: 'Non-existent Admin', expectedStatus: 404 },
  { path: '/api/non-existent', name: 'Non-existent API', expectedStatus: 404, isApi: true },
];

const allRoutes = [...routes, ...notFoundRoutes];

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
let passedTests = 0;
let failedTests = 0;
const errors = [];

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
        'User-Agent': 'VRidge-HTTP-Health-Check/1.0',
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

// Test a single route
async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`\n${colors.cyan}Testing:${colors.reset} ${route.name}`);
  console.log(`  URL: ${url}`);
  
  const startTime = Date.now();
  const response = await makeRequest(url);
  const responseTime = Date.now() - startTime;
  
  console.log(`  Response Time: ${responseTime}ms`);
  console.log(`  Status: ${response.status}`);
  
  // Check if status matches expected
  const expectedStatuses = Array.isArray(route.expectedStatus) 
    ? route.expectedStatus 
    : [route.expectedStatus];
  
  if (response.error) {
    console.log(`  ${colors.red}✗ ERROR:${colors.reset} ${response.error}`);
    failedTests++;
    errors.push({
      route: route.name,
      url,
      error: response.error,
    });
    return false;
  }
  
  if (expectedStatuses.includes(response.status)) {
    console.log(`  ${colors.green}✓ PASS${colors.reset} - Status matches expected (${expectedStatuses.join(' or ')})`);
    
    // Additional checks for specific routes
    if (route.isApi && response.status === 200) {
      try {
        const json = JSON.parse(response.body);
        console.log(`  API Response: ${JSON.stringify(json)}`);
        
        if (route.path === '/api/health' && json.status !== 'healthy') {
          console.log(`  ${colors.yellow}⚠ WARNING:${colors.reset} Health status is not 'healthy'`);
        }
      } catch (e) {
        console.log(`  ${colors.yellow}⚠ WARNING:${colors.reset} API returned non-JSON response`);
      }
    }
    
    // Check response time
    if (responseTime > 3000) {
      console.log(`  ${colors.yellow}⚠ WARNING:${colors.reset} Slow response (>3s)`);
    }
    
    passedTests++;
    return true;
  } else {
    console.log(`  ${colors.red}✗ FAIL${colors.reset} - Expected ${expectedStatuses.join(' or ')}, got ${response.status}`);
    failedTests++;
    errors.push({
      route: route.name,
      url,
      expected: expectedStatuses,
      actual: response.status,
    });
    return false;
  }
}

// Check if server is running
async function checkServerHealth() {
  console.log(`${colors.bold}${colors.blue}=== VRidge HTTP Health Check ===${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Testing ${allRoutes.length} routes...\n`);
  
  // First check if server is reachable
  const serverCheck = await makeRequest(BASE_URL);
  if (serverCheck.error) {
    console.log(`${colors.red}${colors.bold}ERROR: Server is not reachable at ${BASE_URL}${colors.reset}`);
    console.log(`Error: ${serverCheck.error}`);
    console.log('\nPlease ensure the development server is running:');
    console.log('  npm run dev');
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ Server is running${colors.reset}\n`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
}

// Main test runner
async function runTests() {
  await checkServerHealth();
  
  // Test all routes
  for (const route of allRoutes) {
    await testRoute(route);
  }
  
  // Print summary
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`\n${colors.bold}${colors.blue}=== Test Summary ===${colors.reset}\n`);
  console.log(`${colors.green}Passed:${colors.reset} ${passedTests}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}`);
  
  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    errors.forEach(error => {
      console.log(`  - ${error.route}: ${error.url}`);
      if (error.error) {
        console.log(`    Error: ${error.error}`);
      } else {
        console.log(`    Expected: ${error.expected}, Got: ${error.actual}`);
      }
    });
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: passedTests + failedTests,
      passed: passedTests,
      failed: failedTests,
      successRate: `${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`,
    },
    testedRoutes: allRoutes.map(route => ({
      ...route,
      url: `${BASE_URL}${route.path}`,
    })),
    errors,
  };
  
  // Write report to file
  const fs = require('fs');
  const reportPath = './test-results/http-health-report.json';
  
  // Create directory if it doesn't exist
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results', { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.cyan}Report saved to:${colors.reset} ${reportPath}`);
  
  // Exit with appropriate code
  if (failedTests > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Tests failed${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All tests passed!${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});