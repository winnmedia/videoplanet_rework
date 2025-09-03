const { TextEncoder, TextDecoder } = require('util')

// Polyfill TextEncoder/TextDecoder for Node.js test environment FIRST
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill fetch API for MSW compatibility
const { ReadableStream } = require('stream/web')

// Comprehensive fetch API polyfill for MSW
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

global.Headers = class Headers {
  constructor(init) {
    this.map = new Map()
    if (init) {
      if (init instanceof Headers) {
        init.map.forEach((value, key) => this.map.set(key, value))
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.map.set(key, value))
      } else if (typeof init === 'object' && init !== null) {
        Object.entries(init).forEach(([key, value]) => this.map.set(key, value))
      }
    }
  }
  
  get(name) { return this.map.get(String(name).toLowerCase()) || null }
  set(name, value) { 
    this.map.set(String(name).toLowerCase(), String(value))
    return this
  }
  has(name) { return this.map.has(String(name).toLowerCase()) }
  delete(name) { 
    const deleted = this.map.delete(String(name).toLowerCase())
    return deleted
  }
  append(name, value) {
    const existing = this.get(name)
    if (existing) {
      this.set(name, existing + ', ' + value)
    } else {
      this.set(name, value)
    }
  }
  forEach(callback, thisArg) { 
    for (const [key, value] of this.map) {
      callback.call(thisArg, value, key, this)
    }
  }
  keys() { return this.map.keys() }
  values() { return this.map.values() }
  entries() { return this.map.entries() }
  *[Symbol.iterator]() { 
    for (const [key, value] of this.map) {
      yield [key, value]
    }
  }
}

global.Request = class Request {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Headers(init.headers)
    this.body = init.body
  }
  
  async json() { return JSON.parse(this.body || '{}') }
  async text() { return this.body || '' }
}

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Headers(init.headers)
    this.ok = this.status >= 200 && this.status < 300
  }
  
  async json() { 
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body 
  }
  async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body) }
}

global.ReadableStream = ReadableStream

// TransformStream polyfill for MSW
global.TransformStream = class TransformStream {
  constructor() {
    // Mock implementation for testing
  }
}

// BroadcastChannel polyfill for MSW
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name
  }
  
  postMessage(message) {
    // Mock implementation - do nothing in tests
  }
  
  close() {
    // Mock implementation - do nothing in tests
  }
  
  addEventListener() {}
  removeEventListener() {}
}

// Now require everything else
require('@testing-library/jest-dom')
require('jest-axe/extend-expect')

// MSW 서버 설정은 별도 파일에서 처리하도록 변경
// MSW 서버는 테스트 파일에서 직접 설정

// MSW 서버 설정은 각 테스트 파일에서 개별적으로 처리

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock HTMLCanvasElement for OptimizedImage tests
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test')
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4)
  })),
  canvas: {
    width: 100,
    height: 100
  }
}))

// Mock Image constructor
global.Image = class {
  constructor() {
    this.onload = null
    this.onerror = null
    this.src = ''
    this.width = 0
    this.height = 0
  }
  
  set src(value) {
    this._src = value
    // Simulate successful image load
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
  
  get src() {
    return this._src
  }
}

// Mock window.matchMedia
global.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}))

// Custom Jest matchers
expect.extend({
  toHaveBeenCalledBefore(firstMock, secondMock) {
    if (!jest.isMockFunction(firstMock)) {
      throw new Error('toHaveBeenCalledBefore expects first argument to be a mock function')
    }
    if (!jest.isMockFunction(secondMock)) {
      throw new Error('toHaveBeenCalledBefore expects second argument to be a mock function')
    }

    const firstCalls = firstMock.mock.calls
    const secondCalls = secondMock.mock.calls
    
    if (firstCalls.length === 0) {
      return {
        message: () => `Expected ${firstMock.getMockName() || 'mock function'} to have been called before ${secondMock.getMockName() || 'mock function'}, but it was not called`,
        pass: false,
      }
    }
    
    if (secondCalls.length === 0) {
      return {
        message: () => `Expected ${secondMock.getMockName() || 'mock function'} to have been called after ${firstMock.getMockName() || 'mock function'}, but it was not called`,
        pass: false,
      }
    }

    // Jest mock invocationCallOrder 사용 (Jest 29+에서 지원)
    const firstCallTime = firstMock.mock.invocationCallOrder[0]
    const secondCallTime = secondMock.mock.invocationCallOrder[0]
    
    const pass = firstCallTime && secondCallTime && firstCallTime < secondCallTime
    
    if (pass) {
      return {
        message: () => `Expected ${firstMock.getMockName() || 'mock function'} not to be called before ${secondMock.getMockName() || 'mock function'}`,
        pass: true,
      }
    } else {
      return {
        message: () => `Expected ${firstMock.getMockName() || 'mock function'} to be called before ${secondMock.getMockName() || 'mock function'}`,
        pass: false,
      }
    }
  }
})