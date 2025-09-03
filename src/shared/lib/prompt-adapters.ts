/**
 * 프롬프트 어댑터 시스템
 * 
 * VideoPlanet 프롬프트를 다양한 외부 AI 도구 형식으로 변환하고
 * 역변환하는 시스템입니다. 각 플랫폼의 특성과 제약사항을 고려하여
 * 최적화된 변환을 제공합니다.
 */

import { z } from 'zod'
import {
  VideoPlanetPrompt,
  OpenAiPrompt,
  AnthropicPrompt,
  HuggingFacePrompt,
  PromptDataValidator,
  openAiPromptSchema,
  anthropicPromptSchema,
  huggingFacePromptSchema
} from './prompt-contracts'

// =============================================================================
// 어댑터 인터페이스 및 타입
// =============================================================================

export interface AdapterOptions {
  preserveMetadata?: boolean
  optimizeForTarget?: boolean
  includeDebugInfo?: boolean
}

export interface ConversionResult<T> {
  data: T
  metadata: {
    sourceFormat: string
    targetFormat: string
    conversionTime: number
    dataLoss: Array<{
      field: string
      reason: string
      severity: 'low' | 'medium' | 'high'
    }>
    optimizations: string[]
  }
}

export interface CompatibilityCheck {
  supported: boolean
  limitations: string[]
  recommendedSplitting?: boolean
  maxBatchSize?: number
  estimatedCost?: number
  qualityImpact?: 'none' | 'low' | 'medium' | 'high'
}

// =============================================================================
// 기본 프롬프트 어댑터 클래스
// =============================================================================

export class PromptAdapter {
  /**
   * 플랫폼별 호환성 확인
   */
  checkCompatibility(
    prompt: VideoPlanetPrompt,
    targetPlatforms: string[]
  ): Record<string, CompatibilityCheck> {
    const results: Record<string, CompatibilityCheck> = {}

    targetPlatforms.forEach(platform => {
      switch (platform) {
        case 'openai':
          results.openai = this.checkOpenAiCompatibility(prompt)
          break
        case 'anthropic':
          results.anthropic = this.checkAnthropicCompatibility(prompt)
          break
        case 'huggingface':
          results.huggingface = this.checkHuggingFaceCompatibility(prompt)
          break
        case 'midjourney':
          results.midjourney = this.checkMidjourneyCompatibility(prompt)
          break
      }
    })

    return results
  }

  private checkOpenAiCompatibility(prompt: VideoPlanetPrompt): CompatibilityCheck {
    const limitations: string[] = []
    let qualityImpact: 'none' | 'low' | 'medium' | 'high' = 'none'

    // DALL-E 프롬프트 길이 제한 (4000자)
    const totalPromptLength = this.estimatePromptLength(prompt)
    if (totalPromptLength > 4000) {
      limitations.push('prompt_length_limit')
      qualityImpact = 'medium'
    }

    // 배치 크기 제한 (DALL-E는 단일 이미지 생성)
    const batchSize = prompt.generationSettings?.batchSettings?.batchSize || 1
    if (batchSize > 1) {
      limitations.push('batch_size_limit')
    }

    // 캐릭터 일관성 제한
    if (prompt.promptStructure?.styleGuide?.characterConsistency?.enabled) {
      limitations.push('character_consistency')
      qualityImpact = qualityImpact === 'none' ? 'low' : 'medium'
    }

    // 비용 추정 (DALL-E-3 HD 기준)
    const shotCount = prompt.promptStructure?.shotBreakdown?.length || 1
    const estimatedCost = shotCount * 0.08 // $0.08 per HD image

    return {
      supported: true,
      limitations,
      recommendedSplitting: batchSize > 10,
      maxBatchSize: 1,
      estimatedCost,
      qualityImpact
    }
  }

  private checkAnthropicCompatibility(prompt: VideoPlanetPrompt): CompatibilityCheck {
    const limitations: string[] = []
    
    // Claude는 이미지 생성이 아닌 텍스트 기반 분석
    limitations.push('text_only_output')
    limitations.push('no_direct_image_generation')
    
    // 배치 생성 제한
    if (prompt.promptStructure?.shotBreakdown && prompt.promptStructure.shotBreakdown.length > 1) {
      limitations.push('batch_generation')
    }

    return {
      supported: true,
      limitations,
      qualityImpact: 'none' // 텍스트 설명 생성에는 영향 없음
    }
  }

  private checkHuggingFaceCompatibility(prompt: VideoPlanetPrompt): CompatibilityCheck {
    const limitations: string[] = []
    let qualityImpact: 'none' | 'low' | 'medium' | 'high' = 'none'

    // 무료 tier 제한
    const batchSize = prompt.generationSettings?.batchSettings?.batchSize || 1
    if (batchSize > 10) {
      limitations.push('rate_limiting')
      qualityImpact = 'low'
    }

    // 모델별 품질 차이
    const qualitySettings = prompt.generationSettings?.parameters?.quality
    if (qualitySettings === 'ultra') {
      limitations.push('quality_downgrade')
      qualityImpact = 'medium'
    }

    return {
      supported: true,
      limitations,
      maxBatchSize: 10,
      estimatedCost: 0, // 대부분 무료
      qualityImpact
    }
  }

  private checkMidjourneyCompatibility(prompt: VideoPlanetPrompt): CompatibilityCheck {
    const limitations: string[] = []
    let qualityImpact: 'none' | 'low' | 'medium' | 'high' = 'none'

    // Discord 기반 인터페이스 제한
    limitations.push('manual_discord_interface')
    limitations.push('no_api_access')

    // 배치 처리 제한
    const shotCount = prompt.promptStructure?.shotBreakdown?.length || 1
    if (shotCount > 4) {
      limitations.push('batch_processing')
      qualityImpact = 'low'
    }

    return {
      supported: false, // API가 없어 자동 처리 불가
      limitations,
      qualityImpact
    }
  }

  private estimatePromptLength(prompt: VideoPlanetPrompt): number {
    let totalLength = 0
    
    if (prompt.promptStructure?.shotBreakdown) {
      prompt.promptStructure.shotBreakdown.forEach(shot => {
        totalLength += shot.generationPrompt.length
        totalLength += shot.description.length
      })
    }

    // 스타일 가이드 추가 길이
    if (prompt.promptStructure?.styleGuide) {
      totalLength += 100 // 스타일 지시사항 추가 길이
    }

    return totalLength
  }

  /**
   * 다중 형식 배치 변환
   */
  convertBatchToMultipleFormats(
    prompts: VideoPlanetPrompt[],
    targetFormats: string[]
  ): Record<string, any[]> {
    const results: Record<string, any[]> = {}

    targetFormats.forEach(format => {
      results[format] = []
      
      prompts.forEach(prompt => {
        try {
          let converted: any
          
          switch (format) {
            case 'openai':
              const openAiAdapter = new OpenAiAdapter()
              converted = openAiAdapter.convertFromVideoPlanet(prompt)
              break
            case 'anthropic':
              const anthropicAdapter = new AnthropicAdapter()
              converted = anthropicAdapter.convertFromVideoPlanet(prompt)
              break
            case 'huggingface':
              const huggingFaceAdapter = new HuggingFaceAdapter()
              converted = huggingFaceAdapter.convertFromVideoPlanet(prompt)
              break
            default:
              throw new Error(`Unsupported format: ${format}`)
          }
          
          results[format].push(converted)
        } catch (error) {
          console.error(`Failed to convert prompt ${prompt.id} to ${format}:`, error)
          results[format].push(null)
        }
      })
    })

    return results
  }
}

// =============================================================================
// OpenAI DALL-E 어댑터
// =============================================================================

export class OpenAiAdapter {
  /**
   * VideoPlanet -> OpenAI DALL-E 변환
   */
  convertFromVideoPlanet(
    prompt: VideoPlanetPrompt,
    options?: {
      targetModel?: 'dall-e-3' | 'dall-e-2'
      includeStyleInstructions?: boolean
      maxPromptLength?: number
      combineShots?: boolean
    }
  ): OpenAiPrompt {
    const model = options?.targetModel || 'dall-e-3'
    const maxLength = options?.maxPromptLength || 4000

    // 프롬프트 조합
    let combinedPrompt = ''
    
    if (prompt.promptStructure?.shotBreakdown) {
      if (options?.combineShots !== false && prompt.promptStructure.shotBreakdown.length > 1) {
        // 여러 샷을 하나의 프롬프트로 조합
        const descriptions = prompt.promptStructure.shotBreakdown.map(shot => shot.generationPrompt)
        combinedPrompt = descriptions.join(', ')
      } else {
        // 첫 번째 샷만 사용
        combinedPrompt = prompt.promptStructure.shotBreakdown[0].generationPrompt
      }
    }

    // 스타일 지시사항 추가
    if (options?.includeStyleInstructions !== false && prompt.promptStructure?.styleGuide) {
      const styleGuide = prompt.promptStructure.styleGuide
      const styleInstructions = [
        `${styleGuide.artStyle} style`,
        `${styleGuide.colorPalette} color palette`,
        `${styleGuide.visualMood} mood`
      ].join(', ')
      
      combinedPrompt = `${combinedPrompt}, ${styleInstructions}`
    }

    // 길이 제한 적용
    if (combinedPrompt.length > maxLength) {
      combinedPrompt = combinedPrompt.substring(0, maxLength - 3) + '...'
    }

    // 종횡비 결정
    const aspectRatio = prompt.generationSettings?.parameters?.aspectRatio || '16:9'
    let size: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'
    
    if (model === 'dall-e-3') {
      size = aspectRatio === '16:9' ? '1792x1024' : 
             aspectRatio === '9:16' ? '1024x1792' : '1024x1024'
    } else {
      size = '1024x1024' // DALL-E 2는 정사각형만 지원
    }

    // 품질 설정
    const quality = prompt.generationSettings?.parameters?.quality === 'ultra' ? 'hd' : 'standard'

    return {
      model,
      prompt: combinedPrompt,
      size,
      quality: model === 'dall-e-3' ? quality : undefined,
      style: model === 'dall-e-3' ? 'vivid' : undefined,
      response_format: 'url'
    }
  }

  /**
   * 배치 변환 (개별 샷별)
   */
  convertBatch(
    prompt: VideoPlanetPrompt,
    options?: {
      targetModel?: 'dall-e-3' | 'dall-e-2'
      individualShots?: boolean
    }
  ): OpenAiPrompt[] {
    if (!options?.individualShots || !prompt.promptStructure?.shotBreakdown) {
      return [this.convertFromVideoPlanet(prompt, options)]
    }

    return prompt.promptStructure.shotBreakdown.map(shot => {
      const shotPrompt: VideoPlanetPrompt = {
        ...prompt,
        promptStructure: {
          ...prompt.promptStructure!,
          shotBreakdown: [shot]
        }
      }
      
      return this.convertFromVideoPlanet(shotPrompt, options)
    })
  }

  /**
   * OpenAI -> VideoPlanet 역변환
   */
  convertToVideoPlanet(
    openAiPrompt: OpenAiPrompt,
    options?: {
      generateMetadata?: boolean
      inferStructure?: boolean
      preserveOriginalData?: boolean
    }
  ): VideoPlanetPrompt {
    // 기본 메타데이터 생성
    const metadata = options?.generateMetadata ? {
      title: this.inferTitleFromPrompt(openAiPrompt.prompt),
      category: 'storyboard' as const,
      tags: this.extractTagsFromPrompt(openAiPrompt.prompt),
      difficulty: 'medium' as const,
      estimatedTokens: Math.ceil(openAiPrompt.prompt.split(' ').length * 1.3)
    } : {
      title: 'Imported from OpenAI',
      category: 'storyboard' as const,
      tags: [],
      difficulty: 'medium' as const,
      estimatedTokens: 100
    }

    // 종횡비 역추론
    let aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '1:1'
    if (openAiPrompt.size === '1792x1024') aspectRatio = '16:9'
    else if (openAiPrompt.size === '1024x1792') aspectRatio = '9:16'

    // 스타일 가이드 추론
    const inferredStyle = options?.inferStructure ? {
      artStyle: this.inferArtStyle(openAiPrompt.prompt),
      colorPalette: this.inferColorPalette(openAiPrompt.prompt),
      visualMood: this.inferVisualMood(openAiPrompt.prompt)
    } : undefined

    return {
      id: `prompt_imported_${Date.now()}`,
      projectId: `project_imported_${Date.now()}`,
      version: '1.0.0',
      metadata,
      promptStructure: options?.inferStructure ? {
        shotBreakdown: [{
          shotNumber: 1,
          description: openAiPrompt.prompt,
          cameraAngle: 'medium',
          duration: 5,
          visualElements: [],
          generationPrompt: openAiPrompt.prompt
        }],
        styleGuide: inferredStyle ? {
          artStyle: inferredStyle.artStyle as any,
          colorPalette: inferredStyle.colorPalette as any,
          visualMood: inferredStyle.visualMood as any
        } : {
          artStyle: 'photorealistic',
          colorPalette: 'natural',
          visualMood: 'happy'
        }
      } : undefined,
      generationSettings: {
        provider: 'openai',
        model: openAiPrompt.model,
        parameters: {
          aspectRatio,
          quality: openAiPrompt.quality === 'hd' ? 'high' : 'standard',
          stylization: 0.7,
          coherence: 0.8
        },
        batchSettings: {
          enabled: false,
          batchSize: 1,
          maxRetries: 3,
          timeoutMs: 30000
        }
      }
    }
  }

  /**
   * 배치 변환 (VideoPlanet -> OpenAI)
   */
  convertBatchFromVideoPlanet(prompts: VideoPlanetPrompt[]): OpenAiPrompt[] {
    return prompts.map(prompt => this.convertFromVideoPlanet(prompt))
  }

  private inferTitleFromPrompt(prompt: string): string {
    const words = prompt.split(' ').slice(0, 5)
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  private extractTagsFromPrompt(prompt: string): string[] {
    const commonTags = ['cinematic', 'portrait', 'landscape', 'abstract', 'realistic', 'artistic']
    return commonTags.filter(tag => prompt.toLowerCase().includes(tag)).slice(0, 5)
  }

  private inferArtStyle(prompt: string): string {
    if (prompt.includes('photorealistic') || prompt.includes('realistic')) return 'photorealistic'
    if (prompt.includes('cinematic')) return 'cinematic'
    if (prompt.includes('anime') || prompt.includes('manga')) return 'anime'
    if (prompt.includes('cartoon')) return 'cartoon'
    if (prompt.includes('painting')) return 'oil_painting'
    return 'photorealistic'
  }

  private inferColorPalette(prompt: string): string {
    if (prompt.includes('warm') || prompt.includes('golden')) return 'warm_tones'
    if (prompt.includes('cool') || prompt.includes('blue')) return 'cool_tones'
    if (prompt.includes('vibrant') || prompt.includes('colorful')) return 'vibrant'
    if (prompt.includes('muted') || prompt.includes('subtle')) return 'muted'
    return 'natural'
  }

  private inferVisualMood(prompt: string): string {
    if (prompt.includes('happy') || prompt.includes('joyful')) return 'happy'
    if (prompt.includes('dramatic') || prompt.includes('intense')) return 'dramatic'
    if (prompt.includes('romantic') || prompt.includes('love')) return 'romantic'
    if (prompt.includes('mysterious') || prompt.includes('dark')) return 'mysterious'
    return 'happy'
  }
}

// =============================================================================
// Anthropic Claude 어댑터
// =============================================================================

export class AnthropicAdapter {
  /**
   * VideoPlanet -> Anthropic Claude 변환
   */
  convertFromVideoPlanet(
    prompt: VideoPlanetPrompt,
    options?: {
      targetModel?: string
      includeAnalysis?: boolean
      responseFormat?: 'description' | 'detailed_description' | 'technical_specs'
      includeSystemPrompt?: boolean
      systemRole?: 'creative_writer' | 'technical_analyst' | 'expert_cinematographer'
    }
  ): AnthropicPrompt {
    const model = options?.targetModel || 'claude-3-sonnet-20240229'
    
    // 시스템 프롬프트 생성
    let systemPrompt: string | undefined
    if (options?.includeSystemPrompt) {
      systemPrompt = this.generateSystemPrompt(options.systemRole || 'creative_writer')
    }

    // 사용자 메시지 생성
    let userContent = ''
    
    if (options?.responseFormat === 'technical_specs') {
      userContent = this.generateTechnicalAnalysisPrompt(prompt)
    } else if (options?.responseFormat === 'detailed_description') {
      userContent = this.generateDetailedDescriptionPrompt(prompt)
    } else {
      userContent = this.generateBasicDescriptionPrompt(prompt)
    }

    // 토큰 수 추정
    const estimatedTokens = Math.ceil(userContent.split(' ').length * 1.3)
    const maxTokens = Math.min(8192, Math.max(500, estimatedTokens * 2))

    return {
      model,
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      system: systemPrompt
    }
  }

  private generateSystemPrompt(role: string): string {
    const prompts = {
      creative_writer: `You are an expert creative writer specializing in visual storytelling and scene descriptions. Your role is to help create vivid, engaging descriptions that capture both the visual and emotional elements of scenes. Focus on narrative flow, character development, and atmospheric details.`,
      
      technical_analyst: `You are a technical analyst for video production and cinematography. Your role is to provide detailed technical specifications, camera angles, lighting setups, and production requirements. Focus on practical, actionable technical details.`,
      
      expert_cinematographer: `You are a master cinematographer with decades of experience in visual storytelling. Your expertise includes composition, lighting, camera movement, and creating visual narratives that support the story's emotional arc. Provide insights that balance artistic vision with technical execution.`
    }
    
    return prompts[role as keyof typeof prompts] || prompts.creative_writer
  }

  private generateBasicDescriptionPrompt(prompt: VideoPlanetPrompt): string {
    let content = 'Generate detailed image descriptions for the following storyboard:\n\n'
    
    if (prompt.metadata.title) {
      content += `Project: ${prompt.metadata.title}\n`
    }
    
    if (prompt.metadata.description) {
      content += `Context: ${prompt.metadata.description}\n`
    }

    if (prompt.promptStructure?.shotBreakdown) {
      content += '\nShots to describe:\n'
      prompt.promptStructure.shotBreakdown.forEach((shot, index) => {
        content += `${index + 1}. ${shot.description}\n`
        content += `   Camera: ${shot.cameraAngle}\n`
        content += `   Duration: ${shot.duration}s\n\n`
      })
    }

    if (prompt.promptStructure?.styleGuide) {
      const style = prompt.promptStructure.styleGuide
      content += `\nStyle Requirements:\n`
      content += `- Art Style: ${style.artStyle}\n`
      content += `- Color Palette: ${style.colorPalette}\n`
      content += `- Visual Mood: ${style.visualMood}\n`
    }

    content += '\nPlease provide detailed, vivid descriptions that could be used for image generation or as reference for visual artists.'

    return content
  }

  private generateDetailedDescriptionPrompt(prompt: VideoPlanetPrompt): string {
    let content = this.generateBasicDescriptionPrompt(prompt)
    
    content += '\n\nFor each shot, please include:\n'
    content += '- Detailed visual composition\n'
    content += '- Lighting and atmosphere\n'
    content += '- Character positioning and expressions\n'
    content += '- Environmental details\n'
    content += '- Color and texture descriptions\n'
    content += '- Emotional tone and mood indicators\n'
    
    return content
  }

  private generateTechnicalAnalysisPrompt(prompt: VideoPlanetPrompt): string {
    let content = 'Provide technical analysis and specifications for this storyboard project:\n\n'
    
    content += this.generateBasicDescriptionPrompt(prompt)
    
    content += '\n\nPlease provide technical specifications including:\n'
    content += '- Camera equipment recommendations\n'
    content += '- Lighting setup requirements\n'
    content += '- Location/set requirements\n'
    content += '- Post-production considerations\n'
    content += '- Budget estimates for each shot\n'
    content += '- Timeline and scheduling recommendations\n'
    
    return content
  }

  /**
   * Anthropic -> VideoPlanet 역변환
   */
  convertToVideoPlanet(
    anthropicPrompt: AnthropicPrompt,
    options?: {
      inferStructure?: boolean
      extractMetadata?: boolean
    }
  ): VideoPlanetPrompt {
    const userMessage = anthropicPrompt.messages.find(msg => msg.role === 'user')?.content || ''
    
    return {
      id: `prompt_anthropic_${Date.now()}`,
      projectId: `project_anthropic_${Date.now()}`,
      version: '1.0.0',
      metadata: {
        title: 'Imported from Anthropic',
        description: userMessage.substring(0, 200) + '...',
        category: 'storyboard',
        tags: ['anthropic', 'imported'],
        difficulty: 'medium',
        estimatedTokens: Math.ceil(userMessage.split(' ').length * 1.3)
      },
      generationSettings: {
        provider: 'anthropic',
        model: anthropicPrompt.model,
        parameters: {
          aspectRatio: '16:9',
          quality: 'standard',
          stylization: anthropicPrompt.temperature || 0.7,
          coherence: 0.8
        },
        batchSettings: {
          enabled: false,
          batchSize: 1,
          maxRetries: 3,
          timeoutMs: 30000
        }
      }
    }
  }
}

// =============================================================================
// HuggingFace 어댑터
// =============================================================================

export class HuggingFaceAdapter {
  /**
   * VideoPlanet -> HuggingFace 변환
   */
  convertFromVideoPlanet(
    prompt: VideoPlanetPrompt,
    options?: {
      targetModel?: string
      optimizeForModel?: boolean
      includeNegativePrompt?: boolean
      enhancePrompt?: boolean
    }
  ): HuggingFacePrompt {
    const model = options?.targetModel || 'stabilityai/stable-diffusion-xl-base-1.0'
    
    // 프롬프트 조합 및 최적화
    let combinedPrompt = ''
    if (prompt.promptStructure?.shotBreakdown) {
      const prompts = prompt.promptStructure.shotBreakdown.map(shot => shot.generationPrompt)
      combinedPrompt = prompts.join(', ')
    }

    // 스타일 향상
    if (prompt.promptStructure?.styleGuide) {
      const style = prompt.promptStructure.styleGuide
      combinedPrompt += `, ${style.artStyle} style, ${style.colorPalette} colors, ${style.visualMood} mood`
    }

    // 프롬프트 향상
    if (options?.enhancePrompt) {
      combinedPrompt = this.enhancePromptForModel(combinedPrompt, model)
    }

    // 모델별 파라미터 최적화
    const parameters = options?.optimizeForModel ? 
      this.getOptimizedParameters(prompt, model) : 
      this.getDefaultParameters(prompt)

    // 네거티브 프롬프트 생성
    if (options?.includeNegativePrompt) {
      parameters.negative_prompt = this.generateNegativePrompt(prompt)
    }

    return {
      inputs: combinedPrompt,
      parameters,
      options: {
        wait_for_model: true,
        use_cache: false
      }
    }
  }

  private enhancePromptForModel(prompt: string, model: string): string {
    let enhanced = prompt

    if (model.includes('stable-diffusion-xl')) {
      enhanced += ', high quality, detailed, masterpiece, best quality'
    } else if (model.includes('stable-diffusion-2')) {
      enhanced += ', highly detailed, sharp focus, professional'
    }

    return enhanced
  }

  private getOptimizedParameters(prompt: VideoPlanetPrompt, model: string): Record<string, any> {
    const baseParams = this.getDefaultParameters(prompt)

    // 모델별 최적화
    if (model.includes('stable-diffusion-xl')) {
      return {
        ...baseParams,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        width: 1344, // SDXL 최적 해상도
        height: 768
      }
    } else if (model.includes('stable-diffusion-2-1')) {
      return {
        ...baseParams,
        num_inference_steps: 20,
        guidance_scale: 10.0,
        width: 768,
        height: 768
      }
    } else if (model.includes('kandinsky')) {
      return {
        ...baseParams,
        num_inference_steps: 30,
        guidance_scale: 8.0
      }
    }

    return baseParams
  }

  private getDefaultParameters(prompt: VideoPlanetPrompt): Record<string, any> {
    const aspectRatio = prompt.generationSettings?.parameters?.aspectRatio || '16:9'
    const quality = prompt.generationSettings?.parameters?.quality || 'standard'

    // 해상도 설정
    let width = 768, height = 768
    if (aspectRatio === '16:9') {
      width = 1024
      height = 576
    } else if (aspectRatio === '9:16') {
      width = 576
      height = 1024
    } else if (aspectRatio === '4:3') {
      width = 896
      height = 672
    }

    // 품질에 따른 파라미터 조정
    const numSteps = quality === 'ultra' ? 50 : quality === 'high' ? 30 : 20
    const guidanceScale = quality === 'ultra' ? 9.0 : 7.5

    return {
      width,
      height,
      num_inference_steps: numSteps,
      guidance_scale: guidanceScale,
      seed: prompt.generationSettings?.parameters?.seed || Math.floor(Math.random() * 1000000)
    }
  }

  private generateNegativePrompt(prompt: VideoPlanetPrompt): string {
    const baseNegative = 'low quality, blurry, distorted, deformed, disfigured, bad anatomy, bad proportions'
    
    // 스타일에 따른 네거티브 프롬프트 추가
    const style = prompt.promptStructure?.styleGuide?.artStyle
    if (style === 'photorealistic') {
      return `${baseNegative}, cartoon, anime, painting, sketch, artificial, fake`
    } else if (style === 'anime') {
      return `${baseNegative}, photorealistic, photography, real person`
    }
    
    return baseNegative
  }

  /**
   * HuggingFace -> VideoPlanet 역변환
   */
  convertToVideoPlanet(
    hfPrompt: HuggingFacePrompt,
    options?: {
      inferMetadata?: boolean
      preserveParameters?: boolean
    }
  ): VideoPlanetPrompt {
    // 종횡비 역추론
    let aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '1:1'
    if (hfPrompt.parameters?.width && hfPrompt.parameters?.height) {
      const ratio = hfPrompt.parameters.width / hfPrompt.parameters.height
      if (ratio > 1.5) aspectRatio = '16:9'
      else if (ratio < 0.7) aspectRatio = '9:16'
      else if (ratio > 1.2) aspectRatio = '4:3'
    }

    return {
      id: `prompt_hf_${Date.now()}`,
      projectId: `project_hf_${Date.now()}`,
      version: '1.0.0',
      metadata: {
        title: 'Imported from HuggingFace',
        description: hfPrompt.inputs.substring(0, 200),
        category: 'storyboard',
        tags: ['huggingface', 'imported'],
        difficulty: 'medium',
        estimatedTokens: Math.ceil(hfPrompt.inputs.split(' ').length * 1.3)
      },
      promptStructure: {
        shotBreakdown: [{
          shotNumber: 1,
          description: hfPrompt.inputs,
          cameraAngle: 'medium',
          duration: 5,
          visualElements: [],
          generationPrompt: hfPrompt.inputs
        }],
        styleGuide: {
          artStyle: 'photorealistic',
          colorPalette: 'natural',
          visualMood: 'happy'
        }
      },
      generationSettings: options?.preserveParameters ? {
        provider: 'huggingface',
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        parameters: {
          aspectRatio,
          quality: hfPrompt.parameters?.num_inference_steps && hfPrompt.parameters.num_inference_steps > 40 ? 'ultra' : 'standard',
          stylization: (hfPrompt.parameters?.guidance_scale || 7.5) / 10,
          coherence: 0.8,
          seed: hfPrompt.parameters?.seed
        },
        batchSettings: {
          enabled: false,
          batchSize: 1,
          maxRetries: 3,
          timeoutMs: 30000
        }
      } : undefined
    }
  }
}

// =============================================================================
// Midjourney 어댑터 (제한적 지원)
// =============================================================================

export class MidjourneyAdapter {
  /**
   * VideoPlanet -> Midjourney 변환
   * 
   * 주의: Midjourney는 공식 API가 없어 Discord 기반 수동 처리가 필요합니다.
   */
  convertFromVideoPlanet(
    prompt: VideoPlanetPrompt,
    options?: {
      version?: string
      includeParameters?: boolean
      styleIntensity?: 'low' | 'medium' | 'high'
      optimizeForCinematic?: boolean
      enhanceRealism?: boolean
    }
  ): {
    adaptedPrompt: string
    parameters: string
    version: string
    discordCommand: string
  } {
    // 프롬프트 조합
    let adaptedPrompt = ''
    if (prompt.promptStructure?.shotBreakdown) {
      const descriptions = prompt.promptStructure.shotBreakdown.map(shot => shot.generationPrompt)
      adaptedPrompt = descriptions.join(', ')
    }

    // 스타일 향상
    if (prompt.promptStructure?.styleGuide) {
      const style = prompt.promptStructure.styleGuide
      if (options?.optimizeForCinematic) {
        adaptedPrompt += ', cinematic lighting, professional photography, film still'
      }
      if (options?.enhanceRealism) {
        adaptedPrompt += ', hyperrealistic, photorealistic, ultra detailed'
      }
    }

    // Midjourney 파라미터 생성
    let parameters = ''
    
    // 종횡비
    const aspectRatio = prompt.generationSettings?.parameters?.aspectRatio || '16:9'
    const mjRatio = aspectRatio === '16:9' ? '16:9' : 
                   aspectRatio === '9:16' ? '9:16' : 
                   aspectRatio === '4:3' ? '4:3' : '1:1'
    parameters += ` --ar ${mjRatio}`

    // 스타일 강도
    const intensity = options?.styleIntensity || 'medium'
    const stylizeValue = intensity === 'high' ? '1000' : intensity === 'low' ? '50' : '250'
    parameters += ` --stylize ${stylizeValue}`

    // 품질
    const quality = prompt.generationSettings?.parameters?.quality || 'standard'
    if (quality === 'ultra') {
      parameters += ' --quality 2'
    } else if (quality === 'high') {
      parameters += ' --quality 1'
    }

    // 버전
    const version = options?.version || '6.0'
    if (version !== '6.0') {
      parameters += ` --version ${version}`
    }

    // 시네마틱 최적화
    if (options?.optimizeForCinematic) {
      parameters += ' --style raw'
    }

    const discordCommand = `/imagine prompt: ${adaptedPrompt}${parameters}`

    return {
      adaptedPrompt,
      parameters: parameters.trim(),
      version,
      discordCommand
    }
  }
}

// =============================================================================
// 익스포트
// =============================================================================

export {
  PromptAdapter as default,
  type ConversionResult,
  type CompatibilityCheck,
  type AdapterOptions
}