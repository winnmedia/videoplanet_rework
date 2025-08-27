import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import apiClient from './client';

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiClient.get('/api/test');

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(200);
      expect(result.error).toBeUndefined();
    });

    it('should handle GET request errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      const result = await apiClient.get('/api/test');

      expect(result.data).toBeUndefined();
      expect(result.status).toBe(404);
      expect(result.error?.message).toBe('Not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await apiClient.get('/api/test');

      expect(result.data).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with body', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: 1, ...requestBody };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await apiClient.post('/api/items', requestBody);

      expect(result.data).toEqual(responseData);
      expect(result.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('Timeout handling', () => {
    it('should handle timeout errors', async () => {
      // Mock fetch to throw an AbortError - note it's not an Error but a DOMException
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValueOnce(abortError);

      const result = await apiClient.get('/api/slow');

      expect(result.error?.message).toBe('Request timeout');
      expect(result.status).toBe(408);
    });
  });
});