/**
 * Mock System Tests
 * 공통 API 모킹 시스템의 모든 기능을 검증하는 테스트
 */

import {
  mockApiCall,
  updateMockConfig,
  getMockConfig,
  createPaginatedMockData,
  createSearchMockData,
  createSortedMockData,
  MockWebSocket,
  mockFileUpload,
  mockCache,
  cachedMockApiCall,
  type MockConfig
} from './mockSystem'

// 타이머 모킹
jest.useFakeTimers()

describe('mockApiCall', () => {
  beforeEach(() => {
    // 기본 설정으로 초기화
    updateMockConfig({
      baseDelay: 100,
      randomDelayRange: 50,
      errorRate: 0,
      enableLogging: false
    })
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
  })

  describe('성공 응답', () => {
    it('정적 데이터로 성공 응답을 반환해야 함', async () => {
      const mockData = { id: 1, name: 'Test' }
      
      const promise = mockApiCall(mockData)
      jest.advanceTimersByTime(200)
      const response = await promise

      expect(response).toEqual({
        data: mockData,
        status: 200,
        message: 'Success',
        timestamp: expect.any(String)
      })
    })

    it('함수 데이터로 성공 응답을 반환해야 함', async () => {
      const mockDataFn = () => ({ timestamp: Date.now() })
      
      const promise = mockApiCall(mockDataFn)
      jest.advanceTimersByTime(200)
      const response = await promise

      expect(response.data).toEqual({
        timestamp: expect.any(Number)
      })
    })

    it('커스텀 상태 코드를 설정할 수 있어야 함', async () => {
      const promise = mockApiCall({ created: true }, { successStatus: 201 })
      jest.advanceTimersByTime(200)
      const response = await promise

      expect(response.status).toBe(201)
    })
  })

  describe('지연 시뮬레이션', () => {
    it('기본 지연 시간을 사용해야 함', async () => {
      const promise = mockApiCall({ test: true })
      jest.advanceTimersByTime(150) // baseDelay + 평균 randomDelay
      await promise

      // 실제 시간이 아닌 설정된 시간만큼 지연되었는지 확인
      expect(jest.getTimerCount()).toBe(0)
    })

    it('커스텀 지연 시간을 사용해야 함', async () => {
      const promise = mockApiCall({ test: true }, { delay: 500 })
      
      // 500ms 전에는 완료되지 않음
      jest.advanceTimersByTime(400)
      expect(jest.getTimerCount()).toBe(1)
      
      // 500ms 후에 완료됨
      jest.advanceTimersByTime(100)
      await promise
    })
  })

  describe('에러 시뮬레이션', () => {
    it('에러율에 따라 에러를 발생시켜야 함', async () => {
      updateMockConfig({ errorRate: 1.0 }) // 100% 에러

      const promise = mockApiCall({ test: true })
      jest.advanceTimersByTime(200)

      await expect(promise).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        status: expect.any(Number),
        timestamp: expect.any(String)
      })
    })

    it('에러가 비활성화되면 에러를 발생시키지 않아야 함', async () => {
      updateMockConfig({ errorRate: 1.0 })

      const promise = mockApiCall({ test: true }, { disableErrors: true })
      jest.advanceTimersByTime(200)
      const response = await promise

      expect(response.status).toBe(200)
    })

    it('커스텀 에러를 사용해야 함', async () => {
      const customError = {
        code: 'CUSTOM_ERROR',
        message: '커스텀 에러 메시지',
        status: 422,
        timestamp: new Date().toISOString()
      }

      const promise = mockApiCall({ test: true }, { customError })
      jest.advanceTimersByTime(200)

      await expect(promise).rejects.toEqual(customError)
    })
  })

  describe('설정 관리', () => {
    it('설정을 업데이트할 수 있어야 함', () => {
      const newConfig: Partial<MockConfig> = {
        baseDelay: 1000,
        errorRate: 0.5
      }

      updateMockConfig(newConfig)
      const config = getMockConfig()

      expect(config.baseDelay).toBe(1000)
      expect(config.errorRate).toBe(0.5)
    })

    it('현재 설정을 조회할 수 있어야 함', () => {
      const config = getMockConfig()

      expect(config).toMatchObject({
        baseDelay: expect.any(Number),
        randomDelayRange: expect.any(Number),
        errorRate: expect.any(Number),
        simulateNetworkErrors: expect.any(Boolean),
        enableLogging: expect.any(Boolean)
      })
    })
  })
})

describe('페이지네이션 유틸리티', () => {
  const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  describe('createPaginatedMockData', () => {
    it('첫 번째 페이지를 올바르게 생성해야 함', () => {
      const result = createPaginatedMockData(mockData, 1, 10)

      expect(result.items).toHaveLength(10)
      expect(result.items[0]).toEqual({ id: 1, name: 'Item 1' })
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      })
    })

    it('마지막 페이지를 올바르게 생성해야 함', () => {
      const result = createPaginatedMockData(mockData, 3, 10)

      expect(result.items).toHaveLength(5)
      expect(result.pagination.hasNext).toBe(false)
      expect(result.pagination.hasPrev).toBe(true)
    })
  })

  describe('createSearchMockData', () => {
    it('검색어가 없으면 전체 데이터를 반환해야 함', () => {
      const result = createSearchMockData(mockData, '', ['name'])

      expect(result.items).toHaveLength(10) // 기본 limit
      expect(result.pagination.total).toBe(25)
    })

    it('검색어에 맞는 결과를 필터링해야 함', () => {
      const result = createSearchMockData(mockData, '1', ['name'])

      const expectedItems = mockData.filter(item => item.name.includes('1'))
      expect(result.pagination.total).toBe(expectedItems.length)
    })

    it('대소문자를 구분하지 않고 검색해야 함', () => {
      const testData = [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'banana' },
        { id: 3, name: 'Cherry' }
      ]

      const result = createSearchMockData(testData, 'apple', ['name'])

      expect(result.pagination.total).toBe(1)
      expect(result.items[0].name).toBe('Apple')
    })
  })

  describe('createSortedMockData', () => {
    const unsortedData = [
      { id: 3, name: 'Charlie' },
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]

    it('오름차순 정렬을 해야 함', () => {
      const result = createSortedMockData(unsortedData, 'name', 'asc')

      expect(result.map(item => item.name)).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('내림차순 정렬을 해야 함', () => {
      const result = createSortedMockData(unsortedData, 'name', 'desc')

      expect(result.map(item => item.name)).toEqual(['Charlie', 'Bob', 'Alice'])
    })

    it('원본 배열을 변경하지 않아야 함', () => {
      const original = [...unsortedData]
      createSortedMockData(unsortedData, 'name', 'asc')

      expect(unsortedData).toEqual(original)
    })
  })
})

describe('MockWebSocket', () => {
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWs = new MockWebSocket({ connectionDelay: 100 })
  })

  afterEach(() => {
    mockWs.disconnect()
  })

  describe('연결 관리', () => {
    it('연결을 설정할 수 있어야 함', async () => {
      const promise = mockWs.connect()
      jest.advanceTimersByTime(100)
      await promise

      expect(mockWs).toBeDefined()
    })

    it('연결 해제를 할 수 있어야 함', () => {
      mockWs.disconnect()
      expect(mockWs).toBeDefined()
    })
  })

  describe('이벤트 처리', () => {
    it('이벤트 리스너를 등록할 수 있어야 함', () => {
      const callback = jest.fn()
      mockWs.on('test', callback)

      mockWs.emit('test', { data: 'test' })

      expect(callback).toHaveBeenCalledWith({ data: 'test' })
    })

    it('이벤트 리스너를 제거할 수 있어야 함', () => {
      const callback = jest.fn()
      mockWs.on('test', callback)
      mockWs.off('test', callback)

      mockWs.emit('test', { data: 'test' })

      expect(callback).not.toHaveBeenCalled()
    })

    it('연결 시 connect 이벤트를 발생시켜야 함', async () => {
      const callback = jest.fn()
      mockWs.on('connect', callback)

      const promise = mockWs.connect()
      jest.advanceTimersByTime(100)
      await promise

      expect(callback).toHaveBeenCalledWith({
        timestamp: expect.any(String)
      })
    })
  })

  describe('메시지 전송', () => {
    it('메시지를 전송할 수 있어야 함', async () => {
      const callback = jest.fn()
      mockWs.on('message', callback)

      const promise = mockWs.connect()
      jest.advanceTimersByTime(100)
      await promise

      mockWs.send({ test: 'data' })
      jest.advanceTimersByTime(100)

      expect(callback).toHaveBeenCalledWith({
        type: 'echo',
        data: { test: 'data' },
        timestamp: expect.any(String)
      })
    })

    it('연결되지 않은 상태에서 메시지 전송 시 에러를 발생시켜야 함', () => {
      expect(() => mockWs.send({ test: 'data' })).toThrow('WebSocket is not connected')
    })
  })

  describe('주기적 업데이트', () => {
    it('주기적 업데이트를 시작할 수 있어야 함', async () => {
      const callback = jest.fn()
      mockWs.on('update', callback)

      const promise = mockWs.connect()
      jest.advanceTimersByTime(100)
      await promise

      const stopUpdates = mockWs.startPeriodicUpdates(1000)
      jest.advanceTimersByTime(1000)

      expect(callback).toHaveBeenCalledWith({
        type: 'periodic',
        data: {
          timestamp: expect.any(String),
          value: expect.any(Number)
        }
      })

      stopUpdates()
    })
  })
})

describe('파일 업로드 모킹', () => {
  beforeEach(() => {
    updateMockConfig({ enableLogging: false })
  })

  it('파일 업로드를 시뮬레이션해야 함', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const onProgress = jest.fn()

    const promise = mockFileUpload(file, onProgress)
    jest.advanceTimersByTime(1000) // 충분한 시간으로 업로드 완료
    const response = await promise

    expect(response.data).toMatchObject({
      fileId: expect.any(String),
      url: expect.stringContaining('test.txt')
    })
    expect(onProgress).toHaveBeenCalled()
  })

  it('업로드 진행률을 보고해야 함', async () => {
    const file = new File(['x'.repeat(50000)], 'large.txt') // 50KB 파일
    const onProgress = jest.fn()

    const promise = mockFileUpload(file, onProgress)
    jest.advanceTimersByTime(1000)
    await promise

    expect(onProgress).toHaveBeenCalledWith({
      loaded: expect.any(Number),
      total: 50000,
      percentage: expect.any(Number),
      speed: expect.any(Number)
    })
  })
})

describe('캐시 시스템', () => {
  beforeEach(() => {
    mockCache.clear()
  })

  describe('mockCache', () => {
    it('데이터를 캐시할 수 있어야 함', () => {
      const data = { test: 'data' }
      mockCache.set('test-key', data)

      const cached = mockCache.get('test-key')
      expect(cached).toEqual(data)
    })

    it('TTL 이후 캐시가 만료되어야 함', () => {
      const data = { test: 'data' }
      mockCache.set('test-key', data, 100) // 100ms TTL

      jest.advanceTimersByTime(150)

      const cached = mockCache.get('test-key')
      expect(cached).toBeNull()
    })

    it('캐시를 삭제할 수 있어야 함', () => {
      mockCache.set('test-key', { test: 'data' })
      
      const deleted = mockCache.delete('test-key')
      const cached = mockCache.get('test-key')

      expect(deleted).toBe(true)
      expect(cached).toBeNull()
    })

    it('전체 캐시를 지울 수 있어야 함', () => {
      mockCache.set('key1', 'data1')
      mockCache.set('key2', 'data2')

      mockCache.clear()

      expect(mockCache.get('key1')).toBeNull()
      expect(mockCache.get('key2')).toBeNull()
    })
  })

  describe('cachedMockApiCall', () => {
    beforeEach(() => {
      updateMockConfig({ errorRate: 0, enableLogging: false })
    })

    it('첫 번째 호출에서는 API를 호출하고 캐시해야 함', async () => {
      const promise = cachedMockApiCall('cache-key', { data: 'test' })
      jest.advanceTimersByTime(200)
      const response = await promise

      expect(response.data).toEqual({ data: 'test' })
    })

    it('두 번째 호출에서는 캐시된 데이터를 반환해야 함', async () => {
      // 첫 번째 호출
      const promise1 = cachedMockApiCall('cache-key', { data: 'test' })
      jest.advanceTimersByTime(200)
      await promise1

      // 두 번째 호출 (즉시 완료되어야 함)
      const response2 = await cachedMockApiCall('cache-key', { data: 'different' })

      expect(response2.data).toEqual({ data: 'test' }) // 캐시된 데이터
    })
  })
})