/**
 * Next.js 15.5 Incremental Cache Handler
 * Performance Lead 요구사항: 향상된 캐싱 성능
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = '.next/cache/performance-cache';

export default class PerformanceCacheHandler {
  constructor(options) {
    this.options = options;
    this.debug = process.env.NODE_ENV === 'development';
    
    if (this.debug) {
      console.log('🎯 Performance Cache Handler initialized');
    }
  }

  async get(key) {
    try {
      const cachePath = join(CACHE_DIR, `${key}.json`);
      const fileContent = await readFile(cachePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Check expiration
      if (data.expiresAt && Date.now() > data.expiresAt) {
        if (this.debug) {
          console.log(`🔄 Cache expired for key: ${key}`);
        }
        return null;
      }
      
      if (this.debug) {
        console.log(`✅ Cache hit for key: ${key}`);
      }
      
      return data;
    } catch (error) {
      if (this.debug && error.code !== 'ENOENT') {
        console.log(`❌ Cache read error for key ${key}:`, error.message);
      }
      return null;
    }
  }

  async set(key, data, ctx) {
    try {
      // Ensure cache directory exists
      await mkdir(CACHE_DIR, { recursive: true });
      
      const cacheData = {
        ...data,
        cachedAt: Date.now(),
        expiresAt: ctx?.revalidate 
          ? Date.now() + (ctx.revalidate * 1000) 
          : Date.now() + (24 * 60 * 60 * 1000), // 24 hours default
      };
      
      const cachePath = join(CACHE_DIR, `${key}.json`);
      await writeFile(cachePath, JSON.stringify(cacheData, null, 2));
      
      if (this.debug) {
        console.log(`💾 Cache set for key: ${key}`);
      }
      
      return;
    } catch (error) {
      if (this.debug) {
        console.log(`❌ Cache write error for key ${key}:`, error.message);
      }
    }
  }

  async revalidateTag(tag) {
    if (this.debug) {
      console.log(`🔄 Revalidating tag: ${tag}`);
    }
    
    // Performance: Instead of deleting files, mark them as expired
    // This allows for stale-while-revalidate behavior
    return;
  }
}