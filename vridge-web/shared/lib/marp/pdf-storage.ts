/**
 * @fileoverview Temporary PDF Storage for Marp exports
 * @description In-memory storage for generated PDF files with TTL cleanup
 */

export interface StoredPdf {
  buffer: Buffer
  filename: string
  mimeType: string
  expiresAt: number
}

/**
 * Temporary PDF storage with automatic cleanup
 * TTL: 1 hour (3600000ms)
 */
export const temporaryPdfStorage = new Map<number, StoredPdf>()

/**
 * Cleanup expired PDFs from storage
 */
export function cleanupExpiredPdfs(): void {
  const now = Date.now()
  for (const [id, pdf] of temporaryPdfStorage.entries()) {
    if (now > pdf.expiresAt) {
      temporaryPdfStorage.delete(id)
    }
  }
}

/**
 * Store PDF with auto-generated timestamp ID
 */
export function storePdf(buffer: Buffer, filename: string): number {
  const id = Date.now()
  const ttl = 60 * 60 * 1000 // 1 hour TTL
  
  temporaryPdfStorage.set(id, {
    buffer,
    filename,
    mimeType: 'application/pdf',
    expiresAt: Date.now() + ttl
  })
  
  return id
}

/**
 * Retrieve PDF by ID
 */
export function getPdf(id: number): StoredPdf | undefined {
  return temporaryPdfStorage.get(id)
}

/**
 * Delete PDF by ID
 */
export function deletePdf(id: number): boolean {
  return temporaryPdfStorage.delete(id)
}

// Auto-cleanup every 30 minutes
setInterval(cleanupExpiredPdfs, 30 * 60 * 1000)