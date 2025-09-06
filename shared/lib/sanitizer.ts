/**
 * XSS Prevention Utility
 * Provides safe sanitization for various input types
 */

// DOMPurify는 브라우저에서만 동작하므로 동적 import 사용

// Sanitization configuration for different contexts
const SANITIZE_CONFIG = {
  // Strict HTML sanitization - only safe tags
  html: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  },
  // Rich text sanitization - more permissive
  richText: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
                   'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                   'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  }
}

/**
 * Escape HTML entities for plain text display
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate and sanitize URLs
 */
function sanitizeUrl(url: string): string {
  // Remove leading/trailing whitespace
  const trimmedUrl = url.trim()
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'chrome:',
    'ms-',
  ]
  
  const lowerUrl = trimmedUrl.toLowerCase()
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '#' // Return safe fallback
    }
  }
  
  // Ensure URL starts with http/https or is relative
  if (!lowerUrl.startsWith('http://') && 
      !lowerUrl.startsWith('https://') && 
      !lowerUrl.startsWith('/') &&
      !lowerUrl.startsWith('#')) {
    return `https://${trimmedUrl}`
  }
  
  // Additional URL encoding for special characters
  try {
    const url = new URL(trimmedUrl, window?.location?.origin || 'https://example.com')
    return url.toString()
  } catch {
    // If URL parsing fails, return safe fallback
    return '#'
  }
}

/**
 * Main sanitization function
 */
export async function sanitizeInput(
  input: string, 
  type: 'html' | 'text' | 'url' | 'richText' = 'text'
): Promise<string> {
  if (!input || typeof input !== 'string') {
    return ''
  }

  switch (type) {
    case 'html':
    case 'richText':
      // 긴급 배포를 위해 DOMPurify 사용 중단, HTML escape만 사용
      // TODO: DOMPurify SSR 문제 해결 후 다시 적용
      return escapeHtml(input)
      
    case 'text':
      return escapeHtml(input)
      
    case 'url':
      return sanitizeUrl(input)
      
    default:
      return escapeHtml(input)
  }
}

/**
 * Sanitize an object's string properties
 */
export async function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  config: Partial<Record<keyof T, 'html' | 'text' | 'url' | 'richText'>> = {}
): Promise<T> {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      const sanitizeType = config[key] || 'text'
      sanitized[key] = await sanitizeInput(sanitized[key], sanitizeType) as T[Extract<keyof T, string>]
    }
  }
  
  return sanitized
}

/**
 * Check if content contains potentially dangerous patterns
 */
export function containsDangerousContent(content: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
    /import\s+/i,
    /require\(/i,
  ]
  
  return dangerousPatterns.some(pattern => pattern.test(content))
}

/**
 * Sanitize file names for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let safe = fileName.replace(/\.\./g, '')
  
  // Remove special characters except dots, dashes, and underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Limit length
  if (safe.length > 255) {
    const ext = safe.split('.').pop()
    safe = safe.substring(0, 240) + (ext ? `.${ext}` : '')
  }
  
  return safe || 'unnamed_file'
}

/**
 * Create safe HTML from markdown
 */
export async function markdownToSafeHtml(markdown: string): Promise<string> {
  // First escape HTML to prevent injection
  const escaped = escapeHtml(markdown)
  
  // Simple markdown to HTML conversion (very basic)
  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (match, text, url) => {
      const safeUrl = sanitizeUrl(url)
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`
    })
    .replace(/\n/g, '<br>')
  
  // Final sanitization pass
  return await sanitizeInput(html, 'html')
}

// Browser-only initialization - 긴급 배포를 위해 DOMPurify 비활성화
// TODO: DOMPurify SSR 문제 해결 후 다시 활성화

export default {
  sanitizeInput,
  sanitizeObject,
  sanitizeUrl,
  sanitizeFileName,
  escapeHtml,
  markdownToSafeHtml,
  containsDangerousContent,
}