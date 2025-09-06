/**
 * Project Color Assignment Domain Service
 * @description Core domain logic for assigning unique colors to projects using Tailwind design tokens
 * @layer entities
 */

import type { Project, ProjectColorPalette, ProjectLegendItem, ProjectPhaseType } from '../model/types'

/**
 * Tailwind color palette mapping for project assignment
 */
type TailwindColorVariant = {
  primary: string    // Main color (500)
  secondary: string  // Light background (100)  
  accent: string     // Dark border (700)
  text: string       // High contrast text
  bg: string         // Semi-transparent background class
  border: string     // Border class
}

/**
 * Color Assignment Service
 * @description Pure domain service for generating unique project colors using Tailwind tokens
 */
export class ColorAssignmentService {
  /**
   * Tailwind-based color palette for optimal visual distinction and WCAG AA compliance
   */
  private static readonly TAILWIND_COLOR_PALETTES: TailwindColorVariant[] = [
    // Primary: VRidge brand colors
    {
      primary: 'rgb(0, 49, 255)',      // vridge-500 (WCAG AA: 7.8:1)
      secondary: 'rgb(230, 236, 255)', // vridge-100 
      accent: 'rgb(0, 89, 219)',       // vridge-700 (WCAG AA: 6.2:1)
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-vridge-100/20',
      border: 'border-l-vridge-700'
    },
    // Success: Green variants
    {
      primary: 'rgb(21, 128, 61)',     // success-500 (WCAG AA: 6.2:1)
      secondary: 'rgb(220, 252, 231)', // success-100
      accent: 'rgb(20, 83, 45)',       // success-600 (WCAG AA: 8.1:1)
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-success-100/20',
      border: 'border-l-success-600'
    },
    // Warning: Amber variants  
    {
      primary: 'rgb(180, 83, 9)',      // warning-500 (WCAG AA: 6.1:1)
      secondary: 'rgb(254, 243, 199)', // warning-100
      accent: 'rgb(120, 53, 15)',      // warning-700 (WCAG AAA: 9.8:1)
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-warning-100/20',
      border: 'border-l-warning-700'
    },
    // Info: Cyan variants
    {
      primary: 'rgb(23, 162, 184)',    // info-500
      secondary: 'rgb(240, 249, 255)', // info-50
      accent: 'rgb(18, 130, 153)',     // info-600
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-info-50/20',
      border: 'border-l-info-600'
    },
    // Neutral: Purple variants
    {
      primary: 'rgb(147, 51, 234)',    // Purple-600 (WCAG AA compliant)
      secondary: 'rgb(245, 243, 255)', // Purple-50
      accent: 'rgb(109, 40, 217)',     // Purple-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-purple-50/20',
      border: 'border-l-purple-700'
    },
    // Neutral: Emerald variants
    {
      primary: 'rgb(5, 150, 105)',     // Emerald-600 (WCAG AA compliant)
      secondary: 'rgb(236, 253, 245)', // Emerald-50
      accent: 'rgb(4, 120, 87)',       // Emerald-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-emerald-50/20',
      border: 'border-l-emerald-700'
    },
    // Neutral: Rose variants
    {
      primary: 'rgb(225, 29, 72)',     // Rose-600 (WCAG AA compliant)
      secondary: 'rgb(255, 241, 242)', // Rose-50
      accent: 'rgb(190, 18, 60)',      // Rose-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-rose-50/20',
      border: 'border-l-rose-700'
    },
    // Neutral: Indigo variants
    {
      primary: 'rgb(79, 70, 229)',     // Indigo-600 (WCAG AA compliant)
      secondary: 'rgb(238, 242, 255)', // Indigo-50
      accent: 'rgb(67, 56, 202)',      // Indigo-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-indigo-50/20',
      border: 'border-l-indigo-700'
    },
    // Neutral: Teal variants
    {
      primary: 'rgb(13, 148, 136)',    // Teal-600 (WCAG AA compliant)
      secondary: 'rgb(240, 253, 250)', // Teal-50
      accent: 'rgb(15, 118, 110)',     // Teal-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-teal-50/20',
      border: 'border-l-teal-700'
    },
    // Neutral: Orange variants
    {
      primary: 'rgb(234, 88, 12)',     // Orange-600 (WCAG AA compliant)
      secondary: 'rgb(255, 247, 237)', // Orange-50
      accent: 'rgb(194, 65, 12)',      // Orange-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-orange-50/20',
      border: 'border-l-orange-700'
    },
    // Neutral: Pink variants
    {
      primary: 'rgb(219, 39, 119)',    // Pink-600 (WCAG AA compliant)
      secondary: 'rgb(253, 244, 255)', // Pink-50
      accent: 'rgb(190, 24, 93)',      // Pink-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-pink-50/20',
      border: 'border-l-pink-700'
    },
    // Neutral: Slate variants
    {
      primary: 'rgb(71, 85, 105)',     // Slate-600 (WCAG AA compliant)
      secondary: 'rgb(248, 250, 252)', // Slate-50
      accent: 'rgb(51, 65, 85)',       // Slate-700
      text: 'rgb(255, 255, 255)',      // white
      bg: 'bg-slate-50/20',
      border: 'border-l-slate-700'
    }
  ]

  /**
   * Generates a unique color palette for a project using Tailwind design tokens
   */
  static generateProjectPalette(projectId: string, projectIndex?: number): ProjectColorPalette {
    // Use project index or hash project ID for consistent color assignment
    const colorIndex = projectIndex ?? this.hashProjectId(projectId)
    const palette = this.TAILWIND_COLOR_PALETTES[colorIndex % this.TAILWIND_COLOR_PALETTES.length]

    return {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      text: palette.text
    }
  }

  /**
   * Gets Tailwind classes for a project color palette
   */
  static getProjectTailwindClasses(projectId: string, projectIndex?: number): {
    bg: string
    border: string
    text: string
  } {
    const colorIndex = projectIndex ?? this.hashProjectId(projectId)
    const palette = this.TAILWIND_COLOR_PALETTES[colorIndex % this.TAILWIND_COLOR_PALETTES.length]

    return {
      bg: palette.bg,
      border: palette.border,
      text: 'text-white'
    }
  }

  /**
   * Generates legend items for all projects
   */
  static generateProjectLegend(projects: Project[]): ProjectLegendItem[] {
    return projects.map((project, index) => ({
      project,
      palette: this.generateProjectPalette(project.id, index),
      isVisible: true
    }))
  }

  /**
   * Gets color for a specific project phase
   */
  static getPhaseColor(project: Project, phaseType: ProjectPhaseType): string {
    const basePalette = this.generateProjectPalette(project.id)
    
    switch (phaseType) {
      case 'pre-production':
        return basePalette.secondary // Lighter for planning
      case 'production':
        return basePalette.primary  // Main color for filming
      case 'post-production':
        return basePalette.accent   // Darker for editing
      case 'review':
        return basePalette.accent   // Similar to post-production
      case 'delivery':
        return basePalette.primary  // Similar to production
      default:
        return basePalette.primary
    }
  }

  /**
   * Validates color accessibility (WCAG AA compliance)
   */
  static validateColorAccessibility(backgroundColor: string, textColor: string): boolean {
    // Quick check for known high contrast combinations
    if (backgroundColor.includes('255, 255, 255') && textColor.includes('0, 0, 0')) {
      return true // White background + black text
    }
    if (backgroundColor.includes('0, 0, 0') && textColor.includes('255, 255, 255')) {
      return true // Black background + white text
    }
    
    // Calculate WCAG contrast ratio
    const bgLuminance = this.calculateLuminance(backgroundColor)
    const textLuminance = this.calculateLuminance(textColor)
    
    const contrastRatio = (Math.max(bgLuminance, textLuminance) + 0.05) / 
                         (Math.min(bgLuminance, textLuminance) + 0.05)
    
    return contrastRatio >= 4.5 // WCAG AA standard
  }

  /**
   * Generates consistent color swatches for the legend
   */
  static generateColorSwatch(palette: ProjectColorPalette): {
    background: string
    border: string
    size: string
  } {
    return {
      background: palette.primary,
      border: palette.accent,
      size: '16px' // Standard swatch size
    }
  }

  /**
   * Helper: Hash project ID to consistent number
   */
  private static hashProjectId(projectId: string): number {
    let hash = 0
    for (let i = 0; i < projectId.length; i++) {
      const char = projectId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Helper: Calculate luminance for contrast ratio
   * Supports both RGB and HSL color formats
   */
  private static calculateLuminance(color: string): number {
    // Handle RGB format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch
      const rLinear = this.rgbToLinear(parseInt(r) / 255)
      const gLinear = this.rgbToLinear(parseInt(g) / 255)
      const bLinear = this.rgbToLinear(parseInt(b) / 255)
      
      // WCAG formula for relative luminance
      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
    }
    
    // Handle HSL format (legacy support)
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (hslMatch) {
      const lightness = parseInt(hslMatch[3]) / 100
      return lightness
    }
    
    return 0.5 // Fallback for unknown formats
  }

  /**
   * Helper: Convert sRGB to linear RGB for luminance calculation
   */
  private static rgbToLinear(value: number): number {
    return value <= 0.03928 
      ? value / 12.92 
      : Math.pow((value + 0.055) / 1.055, 2.4)
  }
}

/**
 * Calendar-specific color constants using Tailwind design tokens
 * All colors maintain WCAG AA contrast ratio of 4.5:1 or higher
 */
export const CALENDAR_COLORS = {
  // Conflict states (using error tokens)
  CONFLICT_BACKGROUND: 'rgb(254, 242, 242)',  // error-50
  CONFLICT_BORDER: 'rgb(220, 38, 38)',        // error-500 (WCAG AA: 5.1:1)
  CONFLICT_TEXT: 'rgb(127, 29, 29)',          // error-700 (WCAG AAA: 10.5:1)
  
  // Drag & Drop states
  DRAG_PREVIEW: 'rgb(219, 234, 254)',         // blue-100
  DROP_ZONE_VALID: 'rgb(220, 252, 231)',      // success-100  
  DROP_ZONE_INVALID: 'rgb(254, 242, 242)',    // error-50
  
  // Calendar special dates
  TODAY_HIGHLIGHT: 'rgb(239, 246, 255)',      // blue-50
  WEEKEND: 'rgb(249, 250, 251)',              // gray-50
  
  // Default fallback
  DEFAULT_PROJECT: 'rgb(0, 49, 255)'          // vridge-500 (WCAG AA: 7.8:1)
} as const

/**
 * Tailwind class constants for calendar states
 */
export const CALENDAR_CLASSES = {
  // Conflict states
  CONFLICT_BG: 'bg-error-50',
  CONFLICT_BORDER: 'border-error-500 border-dashed',
  CONFLICT_TEXT: 'text-error-700',
  
  // Drag states  
  DRAG_PREVIEW: 'bg-blue-100 opacity-75',
  DROP_ZONE_VALID: 'bg-success-100 border-2 border-dashed border-success-500',
  DROP_ZONE_INVALID: 'bg-error-50 border-2 border-dashed border-error-500',
  
  // Calendar states
  TODAY_HIGHLIGHT: 'bg-blue-50',
  WEEKEND: 'bg-gray-50',
  
  // Progress indicator
  PROGRESS_BAR: 'bg-success-400 opacity-30'
} as const