/**
 * Planning API Integration Test
 * MSW를 활용한 RTK Query 테스트
 */
import { configureStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { planningApi } from './planningApi'
import { planningHandlers } from '@/shared/api/mocks/planning-handlers'

// MSW 서버 설정
const server = setupServer(...planningHandlers)

// 테스트용 스토어 설정
const createTestStore = () => {
  return configureStore({
    reducer: {
      [planningApi.reducerPath]: planningApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(planningApi.middleware),
  })
}

describe('Planning API', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  test('generateStory mutation should work with valid data', async () => {
    const store = createTestStore()
    
    const result = await store.dispatch(
      planningApi.endpoints.generateStory.initiate({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        outline: '젊은 탐험가가 잃어버린 고대 도시를 찾는 모험 이야기',
        genre: 'adventure',
        targetLength: '5-10분'
      })
    )
    
    expect(result.isSuccess).toBe(true)
    expect(result.data).toHaveProperty('story')
    expect(result.data).toHaveProperty('themes')
    expect(result.data).toHaveProperty('characters')
    expect(result.data?.themes).toBeInstanceOf(Array)
    expect(result.data?.characters).toBeInstanceOf(Array)
  })

  test('generateStory should fail with invalid data', async () => {
    const store = createTestStore()
    
    const result = await store.dispatch(
      planningApi.endpoints.generateStory.initiate({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        outline: 'short', // Too short
        genre: 'adventure',
        targetLength: '5-10분'
      })
    )
    
    expect(result.isError).toBe(true)
    expect(result.error).toHaveProperty('data')
  })

  test('generate4Act mutation should work with story data', async () => {
    const store = createTestStore()
    
    const result = await store.dispatch(
      planningApi.endpoints.generate4Act.initiate({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        story: '젊은 탐험가 알렉스는 잃어버린 고대 도시를 찾아 아마존 정글 깊숙이 들어간다.',
        themes: ['모험', '용기'],
        characters: ['알렉스', '마리아']
      })
    )
    
    expect(result.isSuccess).toBe(true)
    expect(result.data).toHaveProperty('act1')
    expect(result.data).toHaveProperty('act2')
    expect(result.data).toHaveProperty('act3')
    expect(result.data).toHaveProperty('act4')
    
    // Each act should have required fields
    Object.values(result.data!).forEach(act => {
      expect(act).toHaveProperty('title')
      expect(act).toHaveProperty('description')
      expect(act).toHaveProperty('duration')
    })
  })

  test('generate12Shot mutation should work with act data', async () => {
    const store = createTestStore()
    
    const actData = {
      act1: { title: 'Act 1', description: 'Description 1', duration: '25%' },
      act2: { title: 'Act 2', description: 'Description 2', duration: '25%' },
      act3: { title: 'Act 3', description: 'Description 3', duration: '25%' },
      act4: { title: 'Act 4', description: 'Description 4', duration: '25%' }
    }
    
    const result = await store.dispatch(
      planningApi.endpoints.generate12Shot.initiate({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        story: '젊은 탐험가 알렉스는 잃어버린 고대 도시를 찾아 아마존 정글 깊숙이 들어간다.',
        acts: actData
      })
    )
    
    expect(result.isSuccess).toBe(true)
    expect(result.data).toHaveProperty('shots')
    expect(result.data?.shots).toHaveLength(12)
    
    // Each shot should have required fields
    result.data?.shots.forEach(shot => {
      expect(shot).toHaveProperty('shotNumber')
      expect(shot).toHaveProperty('type')
      expect(shot).toHaveProperty('description')
      expect(shot).toHaveProperty('duration')
      expect(shot).toHaveProperty('location')
    })
  })

  test('exportToPDF mutation should work with complete data', async () => {
    const store = createTestStore()
    
    const completeData = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      story: '젊은 탐험가 알렉스는 잃어버린 고대 도시를 찾아 아마존 정글 깊숙이 들어간다.',
      acts: {
        act1: { title: 'Act 1', description: 'Description 1', duration: '25%' },
        act2: { title: 'Act 2', description: 'Description 2', duration: '25%' },
        act3: { title: 'Act 3', description: 'Description 3', duration: '25%' },
        act4: { title: 'Act 4', description: 'Description 4', duration: '25%' }
      },
      shots: {
        shots: Array.from({ length: 12 }, (_, i) => ({
          shotNumber: i + 1,
          type: 'Wide Shot',
          description: `Shot ${i + 1} description`,
          duration: '10초',
          location: 'Location',
          notes: 'Notes'
        }))
      }
    }
    
    const result = await store.dispatch(
      planningApi.endpoints.exportToPDF.initiate(completeData)
    )
    
    expect(result.isSuccess).toBe(true)
    expect(result.data).toHaveProperty('url')
    expect(result.data).toHaveProperty('fileName')
    expect(result.data?.fileName).toContain('.pdf')
  })
})