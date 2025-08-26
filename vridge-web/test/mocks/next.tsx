/**
 * Next.js Component Mocks
 * Provides test-friendly versions of Next.js components
 */

import React from 'react'

// Mock Next.js Image component
export const NextImageMock = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }
>(function Image({ priority, ...props }, ref) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img ref={ref} {...props} />
})

// Mock Next.js Link component
export const NextLinkMock = React.forwardRef<
  HTMLAnchorElement,
  React.PropsWithChildren<{ href: string; [key: string]: any }>
>(function Link({ children, href, ...props }, ref) {
  return (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  )
})