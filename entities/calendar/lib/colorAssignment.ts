/**
 * Project Color Assignment Domain Service
 * @description Core domain logic for assigning unique colors to projects
 * @layer entities
 */

import type { Project, ProjectColorPalette, ProjectLegendItem } from '../model/types'

/**
 * Color Assignment Service
 * @description Pure domain service for generating unique project colors
 */
export class ColorAssignmentService {
  /**
   * HSL-based color palette for optimal visual distinction
   */
  private static readonly COLOR_BASE_HUES = [
    // Primary hues optimized for accessibility and distinction
    240, // Blue
    120, // Green
    0,   // Red
    300, // Purple
    60,  // Yellow
    180, // Cyan
    30,  // Orange
    270, // Violet
    150, // Teal
    330, // Pink
    90,  // Lime
    210  // Steel Blue
  ]

  /**
   * Generates a unique color palette for a project
   */
  static generateProjectPalette(projectId: string, projectIndex?: number): ProjectColorPalette {
    // Use project index or hash project ID for consistent color assignment
    const colorIndex = projectIndex ?? this.hashProjectId(projectId)
    const baseHue = this.COLOR_BASE_HUES[colorIndex % this.COLOR_BASE_HUES.length]

    const primary = `hsl(${baseHue}, 70%, 55%)`
    const secondary = `hsl(${baseHue}, 50%, 85%)` // Light variant
    const accent = `hsl(${baseHue}, 80%, 35%)`    // Dark variant
    const text = (baseHue >= 45 && baseHue <= 200) ? '#000000' : '#ffffff' // Contrast text

    return {
      primary,
      secondary,
      accent,
      text
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
  static getPhaseColor(project: Project, phaseType: 'planning' | 'filming' | 'editing'): string {
    const basePalette = this.generateProjectPalette(project.id)
    
    switch (phaseType) {
      case 'planning':
        return basePalette.secondary // Lighter for planning
      case 'filming':
        return basePalette.primary  // Main color for filming
      case 'editing':
        return basePalette.accent   // Darker for editing
      default:
        return basePalette.primary
    }
  }

  /**
   * Validates color accessibility (WCAG AA compliance)
   */
  static validateColorAccessibility(backgroundColor: string, textColor: string): boolean {
    // For high contrast combinations like white background + black text
    if (backgroundColor.includes('100%') && textColor === '#000000') {
      return true
    }
    if (backgroundColor.includes('0%') && textColor === '#ffffff') {
      return true
    }
    
    // Simplified WCAG contrast ratio check
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
   */
  private static calculateLuminance(color: string): number {
    // Simplified luminance calculation for HSL colors
    // In production, you might want to use a proper color library
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!hslMatch) return 0.5 // Fallback
    
    const lightness = parseInt(hslMatch[3]) / 100
    return lightness
  }
}

/**
 * Predefined color constants for special cases
 */
export const CALENDAR_COLORS = {
  CONFLICT_BACKGROUND: 'hsl(0, 50%, 95%)',
  CONFLICT_BORDER: 'hsl(0, 70%, 60%)',
  CONFLICT_TEXT: 'hsl(0, 80%, 25%)',
  
  DRAG_PREVIEW: 'hsl(220, 50%, 80%)',
  DROP_ZONE_VALID: 'hsl(120, 50%, 90%)',
  DROP_ZONE_INVALID: 'hsl(0, 50%, 90%)',
  
  TODAY_HIGHLIGHT: 'hsl(220, 100%, 95%)',
  WEEKEND: 'hsl(0, 0%, 98%)',
  
  DEFAULT_PROJECT: 'hsl(240, 50%, 60%)'
} as const