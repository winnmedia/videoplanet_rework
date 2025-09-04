/**
 * 외부 API 모듈 MSW 핸들러 (간소화)
 */

import { http, HttpResponse, delay } from 'msw'

export const externalHandlers = [
  http.post('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', async () => {
    await delay(300)
    return HttpResponse.json({
      candidates: [{
        content: {
          parts: [{ text: 'Mock AI response' }]
        }
      }]
    })
  })
]

export const externalTestUtils = {
  clearCache: () => {}
}