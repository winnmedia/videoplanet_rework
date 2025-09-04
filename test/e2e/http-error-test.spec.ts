import { test, expect } from '@playwright/test';

test.describe('HTTP Error and Page Health Check', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Define all routes to test
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/api/health', name: 'Health API', isApi: true },
  ];

  // Test non-existent routes for 404 handling
  const notFoundRoutes = [
    { path: '/non-existent-page', name: '404 Page' },
    { path: '/admin/dashboard', name: 'Non-existent Admin' },
    { path: '/api/non-existent', name: 'Non-existent API', isApi: true },
  ];

  test.beforeEach(async ({ page }) => {
    // Set up console error listener
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error on ${page.url()}: ${msg.text()}`);
      }
    });

    // Set up network request failure listener
    page.on('requestfailed', request => {
      console.error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test.describe('Existing Pages Health Check', () => {
    for (const route of routes) {
      test(`should load ${route.name} without errors`, async ({ page }) => {
        if (route.isApi) {
          // For API routes, check response directly
          const response = await page.request.get(`${baseUrl}${route.path}`);
          expect(response.status()).toBeLessThan(400);
          
          if (route.path === '/api/health') {
            const data = await response.json();
            expect(data).toHaveProperty('status');
            expect(data.status).toBe('healthy');
          }
        } else {
          // For pages, navigate and check
          const response = await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'networkidle',
          });
          
          // Check HTTP status
          expect(response?.status()).toBeLessThan(400);
          
          // Check for React error boundary
          const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
          expect(errorBoundary).toBe(0);
          
          // Check for Next.js error overlay
          const nextError = await page.locator('#__next-build-error').count();
          expect(nextError).toBe(0);
          
          // Check that main content is visible
          await expect(page.locator('main')).toBeVisible();
        }
      });
    }
  });

  test.describe('Interactive Elements Check', () => {
    test('should have functional navigation elements on homepage', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      // Check all links and buttons
      const links = await page.locator('a').all();
      const buttons = await page.locator('button').all();
      
      console.log(`Found ${links.length} links and ${buttons.length} buttons`);
      
      // Check each link has href and is not broken
      for (const link of links) {
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
        
        // Check if external link
        if (href && !href.startsWith('http')) {
          // Internal link - verify it doesn't 404
          const linkResponse = await page.request.head(`${baseUrl}${href}`).catch(() => null);
          if (linkResponse) {
            expect(linkResponse.status()).toBeLessThan(400);
          }
        }
      }
      
      // Check buttons are clickable
      for (const button of buttons) {
        await expect(button).toBeEnabled();
      }
    });

    test('should have functional header navigation', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      // Check header exists
      const header = page.locator('header');
      await expect(header).toBeVisible();
      
      // Check logo/brand
      const logo = header.locator('img').first();
      await expect(logo).toBeVisible();
      
      // Check profile section
      const profileSection = header.locator('.profile');
      await expect(profileSection).toBeVisible();
    });
  });

  test.describe('404 Error Handling', () => {
    for (const route of notFoundRoutes) {
      test(`should handle 404 for ${route.name}`, async ({ page }) => {
        if (route.isApi) {
          const response = await page.request.get(`${baseUrl}${route.path}`);
          expect(response.status()).toBe(404);
        } else {
          const response = await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'networkidle',
          });
          
          // Next.js returns 404 for non-existent routes
          expect(response?.status()).toBe(404);
        }
      });
    }
  });

  test.describe('Network and Resource Loading', () => {
    test('should load all resources without 4xx/5xx errors', async ({ page }) => {
      const failedRequests: string[] = [];
      
      // Monitor all network requests
      page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} - ${response.url()}`);
        }
      });
      
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      
      // Allow 404 for favicon if not present
      const allowedFailures = failedRequests.filter(req => 
        !req.includes('favicon.ico')
      );
      
      expect(allowedFailures).toHaveLength(0);
    });

    test('should load images without errors', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const src = await img.getAttribute('src');
        if (src) {
          // Check image is loaded
          await expect(img).toBeVisible();
          
          // Check natural dimensions to ensure image loaded
          const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
          expect(naturalWidth).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Performance and UX', () => {
    test('should load homepage within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      // Homepage should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have proper meta tags and SEO', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      // Check title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title).toContain('VRidge');
      
      // Check meta description
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      
      // Check viewport meta
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
    });

    test('should be responsive', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${baseUrl}/`);
      
      const main = page.locator('main');
      await expect(main).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await expect(main).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await expect(main).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      // Check main landmark
      const main = page.locator('main');
      await expect(main).toBeVisible();
      
      // Check header landmark
      const header = page.locator('header');
      await expect(header).toBeVisible();
      
      // Check all interactive elements have accessible names
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${baseUrl}/`);
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();
      
      // Continue tabbing and ensure focus moves
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(secondFocused).toBeTruthy();
    });
  });
});