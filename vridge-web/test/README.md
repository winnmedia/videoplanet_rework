# Testing Infrastructure

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Test Structure

```
test/
├── setup.ts           # Global test setup
├── mocks/            # Mock implementations
│   ├── server.ts     # MSW server configuration
│   ├── handlers.ts   # API mock handlers
│   └── next.tsx      # Next.js component mocks
├── utils/            # Test utilities
│   ├── test-utils.tsx      # Custom render functions
│   ├── fsd-test-helpers.ts # FSD architecture helpers
│   └── custom-matchers.ts  # Custom Vitest matchers
├── fixtures/         # Test data
│   └── index.ts      # Centralized test fixtures
└── e2e/             # End-to-end tests (future)
```

## Writing Tests

### 1. Unit Test Example (Shared Layer)

```typescript
// shared/ui/Button/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { Button } from './Button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### 2. Integration Test Example (Widget Layer)

```typescript
// widgets/Header/Header.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { Header } from './Header'

describe('Header Widget', () => {
  it('should integrate navigation and user menu', () => {
    render(<Header />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
})
```

### 3. API Mocking Example

```typescript
// features/auth/login.test.tsx
import { describe, it, expect } from 'vitest'
import { setup } from '@/test/utils/test-utils'
import { LoginForm } from './LoginForm'

describe('Login Feature', () => {
  it('should handle successful login', async () => {
    const { user } = setup(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    })
  })
})
```

## Test Coverage

Current thresholds (will increase as project matures):
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

Target thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## TDD Workflow

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

```bash
# TDD cycle
npm run test:watch  # Start watch mode
# 1. Write failing test
# 2. See test fail (red)
# 3. Write implementation
# 4. See test pass (green)
# 5. Refactor if needed
```

## FSD Testing Guidelines

### Shared Layer (90% coverage target)
- Test in complete isolation
- No external dependencies
- Focus on reusability

### Entities Layer (85% coverage target)
- Test business logic
- Validate data models
- Test serialization/deserialization

### Features Layer (80% coverage target)
- Test user interactions
- Validate state changes
- Mock external APIs

### Widgets Layer (75% coverage target)
- Test component composition
- Verify feature integration
- Test responsive behavior

### Processes Layer (70% coverage target)
- Test multi-step workflows
- Validate error handling
- Test async operations

### App Layer (70% coverage target)
- Test page rendering
- Validate routing
- Test SEO meta tags

## Custom Matchers

```typescript
// Available custom matchers
expect(value).toBeWithinRange(min, max)
expect(email).toBeValidEmail()
expect(url).toBeValidUrl()
expect(mock).toHaveBeenCalledWithError(error)
expect(component).toRenderWithoutErrors()
expect(element).toHaveNoAxeViolations()
```

## MSW Handlers

Add new API mocks in `test/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ])
  })
]
```

## Debugging Tests

```bash
# Run tests with detailed output
npm run test:run -- --reporter=verbose

# Run specific test file
npm run test:run -- path/to/test.tsx

# Run tests matching pattern
npm run test:run -- -t "should render"

# Debug in browser
npm run test:ui
```

## CI/CD Integration

Tests run automatically on:
- Pre-commit (unit tests)
- Pull request (all tests)
- Pre-deploy (including E2E)

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm run test:ci
```

## Common Issues

### 1. Module Resolution
If imports fail, check `vitest.config.ts` aliases match `tsconfig.json`

### 2. Async Tests
Always use `async/await` or return promises:
```typescript
it('should load data', async () => {
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

### 3. Cleanup
Tests automatically cleanup, but for manual cleanup:
```typescript
import { cleanup } from '@testing-library/react'
afterEach(() => cleanup())
```

## Best Practices

1. **Test behavior, not implementation**
2. **Keep tests simple and focused**
3. **Use descriptive test names**
4. **Avoid testing framework code**
5. **Mock at the boundaries**
6. **Prefer integration over unit tests**
7. **Test user journeys, not components**

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [MSW Documentation](https://mswjs.io)
- [FSD Testing Guide](https://feature-sliced.design/docs/guides/testing)