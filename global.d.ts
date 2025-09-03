declare module 'jest-axe' {
  import { AxeResults } from 'axe-core'
  export function axe(element: Element | Document): Promise<AxeResults>
  export const toHaveNoViolations: (received: AxeResults) => { pass: boolean; message: () => string }
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
    
    interface Expect {
      extend(matchers: Record<string, unknown>): void
    }
  }
}