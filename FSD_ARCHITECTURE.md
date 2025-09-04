# Feature-Sliced Design Architecture

This project follows the Feature-Sliced Design (FSD) methodology, a architectural approach that promotes scalability, maintainability, and clear separation of concerns.

## Layer Hierarchy

The application is organized into the following layers (from top to bottom):

### 1. App Layer (`/app`)
- **Purpose**: Application initialization and composition
- **Contains**: Next.js App Router pages, layouts, and global providers
- **Can import from**: All layers below
- **Cannot be imported by**: Any layer

### 2. Processes Layer (`/processes`)
- **Purpose**: Complex multi-page business scenarios
- **Contains**: Multi-step workflows, cross-page business logic
- **Can import from**: widgets, features, entities, shared
- **Cannot be imported by**: app

### 3. Widgets Layer (`/widgets`)
- **Purpose**: Compositional units combining features and entities
- **Contains**: Complex UI blocks used on pages
- **Can import from**: features, entities, shared
- **Cannot be imported by**: app, processes

### 4. Features Layer (`/features`)
- **Purpose**: User interactions and business features
- **Contains**: Interactive elements with business logic
- **Can import from**: entities, shared
- **Cannot be imported by**: app, processes, widgets

### 5. Entities Layer (`/entities`)
- **Purpose**: Business entities and domain models
- **Contains**: Core business logic and data models
- **Can import from**: shared
- **Cannot be imported by**: app, processes, widgets, features

### 6. Shared Layer (`/shared`)
- **Purpose**: Reusable utilities and components without business logic
- **Contains**: UI kit, helpers, API client, constants
- **Can import from**: Nothing (isolated layer)
- **Cannot be imported by**: None (can be imported by all)

## Segment Structure

Each layer (except app) is divided into segments:

- **ui/**: React components and their styles
- **api/**: API requests and data fetching logic
- **lib/**: Business logic and utilities
- **model/**: TypeScript types, interfaces, and stores
- **config/**: Configuration and constants (shared layer only)

## Import Rules

### ✅ Allowed Imports
```typescript
// In app layer
import { UserWidget } from '@widgets/user'
import { AuthFeature } from '@features/auth'

// In features layer
import { UserEntity } from '@entities/user'
import { Button } from '@shared/ui'

// In entities layer
import { api } from '@shared/api'
import { formatDate } from '@shared/lib'
```

### ❌ Forbidden Imports
```typescript
// In entities layer
import { LoginFeature } from '@features/auth' // ❌ Cannot import from features

// In features layer
import { UserWidget } from '@widgets/user' // ❌ Cannot import from widgets

// Cross-slice imports
import { userApi } from '@features/user/api' // ❌ Must use public API
```

## Public API Pattern

Each slice should expose only its public API through the index file:

```typescript
// features/auth/index.ts
export { LoginForm } from './ui/LoginForm'
export { useAuth } from './model/useAuth'
export type { AuthState } from './model/types'

// Don't export internal implementations
```

## ESLint Configuration

The project includes ESLint rules that enforce FSD architecture:

1. **Import ordering**: Enforces consistent import order
2. **Layer boundaries**: Prevents imports from higher layers
3. **Cross-slice imports**: Prevents direct imports between slices
4. **Public API enforcement**: Encourages using public exports

Run `npm run lint` to check for architecture violations.

## Best Practices

1. **Keep layers independent**: Each layer should be potentially extractable
2. **Use composition**: Build complex features by composing simpler ones
3. **Maintain clear boundaries**: Never bypass layer restrictions
4. **Document public APIs**: Clearly document what each slice exports
5. **Avoid circular dependencies**: Structure your code to prevent cycles

## Adding New Features

When adding a new feature:

1. Determine the appropriate layer based on its purpose
2. Create the feature folder with segment structure
3. Implement the feature following layer restrictions
4. Export public API through index file
5. Import in higher layers as needed

## Example Structure

```
features/
└── user-profile/
    ├── index.ts          # Public API
    ├── ui/
    │   ├── ProfileCard.tsx
    │   └── ProfileCard.module.css
    ├── api/
    │   └── profileApi.ts
    ├── lib/
    │   └── validateProfile.ts
    └── model/
        ├── types.ts
        └── useProfile.ts
```