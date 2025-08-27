/**
 * Test Fixtures
 * Centralized test data for consistent testing
 */

export const fixtures = {
  // User fixtures
  users: {
    validUser: {
      id: '1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'user',
      avatar: '/avatars/john.jpg',
      createdAt: '2024-01-01T00:00:00Z',
    },
    adminUser: {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      avatar: '/avatars/admin.jpg',
      createdAt: '2024-01-01T00:00:00Z',
    },
    invalidUser: {
      id: '',
      email: 'invalid-email',
      name: '',
      role: 'unknown',
    },
  },
  
  // API responses
  apiResponses: {
    success: {
      status: 200,
      data: { message: 'Success' },
    },
    error: {
      status: 500,
      error: 'Internal Server Error',
    },
    unauthorized: {
      status: 401,
      error: 'Unauthorized',
    },
    notFound: {
      status: 404,
      error: 'Not Found',
    },
  },
  
  // Form data
  forms: {
    loginForm: {
      valid: {
        email: 'test@example.com',
        password: 'Password123!',
      },
      invalid: {
        email: 'invalid-email',
        password: '123',
      },
      empty: {
        email: '',
        password: '',
      },
    },
    registrationForm: {
      valid: {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        name: 'New User',
        terms: true,
      },
      passwordMismatch: {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        name: 'New User',
        terms: true,
      },
    },
  },
  
  // Navigation fixtures
  navigation: {
    mainMenu: [
      { id: '1', label: 'Home', href: '/' },
      { id: '2', label: 'About', href: '/about' },
      { id: '3', label: 'Products', href: '/products' },
      { id: '4', label: 'Contact', href: '/contact' },
    ],
    userMenu: [
      { id: '1', label: 'Profile', href: '/profile' },
      { id: '2', label: 'Settings', href: '/settings' },
      { id: '3', label: 'Logout', href: '/logout' },
    ],
  },
  
  // Product fixtures
  products: {
    singleProduct: {
      id: '1',
      title: 'Test Product',
      description: 'This is a test product description',
      price: 99.99,
      currency: 'USD',
      image: '/products/test-product.jpg',
      category: 'Electronics',
      stock: 10,
      rating: 4.5,
      reviews: 42,
    },
    productList: Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Product ${i + 1}`,
      description: `Description for product ${i + 1}`,
      price: (i + 1) * 10,
      currency: 'USD',
      image: `/products/product-${i + 1}.jpg`,
      category: i % 2 === 0 ? 'Electronics' : 'Clothing',
      stock: i + 5,
      rating: 3 + (i % 3),
      reviews: i * 5,
    })),
  },
  
  // Error scenarios
  errors: {
    networkError: new Error('Network request failed'),
    validationError: {
      field: 'email',
      message: 'Invalid email format',
    },
    serverError: {
      status: 500,
      message: 'Internal server error occurred',
      timestamp: new Date().toISOString(),
    },
  },
  
  // Date fixtures
  dates: {
    past: '2023-01-01T00:00:00Z',
    present: new Date().toISOString(),
    future: '2025-12-31T23:59:59Z',
    invalid: 'not-a-date',
  },
  
  // Pagination fixtures
  pagination: {
    firstPage: {
      page: 1,
      limit: 10,
      total: 100,
      hasNext: true,
      hasPrev: false,
    },
    middlePage: {
      page: 5,
      limit: 10,
      total: 100,
      hasNext: true,
      hasPrev: true,
    },
    lastPage: {
      page: 10,
      limit: 10,
      total: 100,
      hasNext: false,
      hasPrev: true,
    },
  },
}

/**
 * Factory functions for generating dynamic fixtures
 */
export const factories = {
  createUser: (overrides: Record<string, unknown> = {}) => ({
    ...fixtures.users.validUser,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
  
  createProduct: (overrides: Record<string, unknown> = {}) => ({
    ...fixtures.products.singleProduct,
    id: Math.random().toString(36).substr(2, 9),
    ...overrides,
  }),
  
  createApiResponse: (data: unknown, status = 200) => ({
    status,
    data,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  
  createError: (message: string, code?: string) => ({
    message,
    code: code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  }),
  
  createList: <T>(factory: () => T, count: number): T[] => {
    return Array.from({ length: count }, factory)
  },
}