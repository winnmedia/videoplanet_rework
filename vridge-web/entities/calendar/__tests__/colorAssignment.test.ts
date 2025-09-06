/**
 * Color Assignment Service Tests
 * @description TDD tests for project color assignment domain logic
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { ColorAssignmentService } from '../lib/colorAssignment'
import type { Project, ProjectColorPalette } from '../model/types'

describe('ColorAssignmentService', () => {
  let mockProjects: Project[]

  beforeEach(() => {
    mockProjects = [
      {
        id: 'project-1',
        name: '브랜드 A 광고영상',
        color: 'rgb(0, 49, 255)',         // vridge-500 (Tailwind 토큰)
        description: 'Brand A commercial video',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'project-2',
        name: '브랜드 B 홍보영상',
        color: 'rgb(21, 128, 61)',        // success-500 (Tailwind 토큰)
        description: 'Brand B promotional video',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'project-3',
        name: '브랜드 C 제품소개',
        color: 'rgb(180, 83, 9)',         // warning-500 (Tailwind 토큰)
        description: 'Brand C product introduction',
        status: 'completed',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ]
  })

  describe('generateProjectPalette', () => {
    it('should generate consistent color palettes for the same project ID', () => {
      // Given: Same project ID called multiple times
      const projectId = 'test-project-1'

      // When: Generating palettes
      const palette1 = ColorAssignmentService.generateProjectPalette(projectId)
      const palette2 = ColorAssignmentService.generateProjectPalette(projectId)

      // Then: Should return identical palettes
      expect(palette1).toEqual(palette2)
      expect(palette1.primary).toBe(palette2.primary)
      expect(palette1.secondary).toBe(palette2.secondary)
      expect(palette1.accent).toBe(palette2.accent)
      expect(palette1.text).toBe(palette2.text)
    })

    it('should generate different colors for different project IDs', () => {
      // Given: Two different project IDs
      const projectId1 = 'project-1'
      const projectId2 = 'project-2'

      // When: Generating palettes
      const palette1 = ColorAssignmentService.generateProjectPalette(projectId1)
      const palette2 = ColorAssignmentService.generateProjectPalette(projectId2)

      // Then: Should have different primary colors
      expect(palette1.primary).not.toBe(palette2.primary)
    })

    it('should generate valid RGB color strings from Tailwind tokens', () => {
      // Given: A project ID
      const projectId = 'test-project'

      // When: Generating palette
      const palette = ColorAssignmentService.generateProjectPalette(projectId)

      // Then: All colors should be valid RGB strings (Tailwind tokens)
      expect(palette.primary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
      expect(palette.secondary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
      expect(palette.accent).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
      expect(palette.text).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
    })

    it('should use project index when provided for predictable colors', () => {
      // Given: Same project ID with different indices
      const projectId = 'test-project'

      // When: Generating palettes with explicit indices
      const palette0 = ColorAssignmentService.generateProjectPalette(projectId, 0)
      const palette1 = ColorAssignmentService.generateProjectPalette(projectId, 1)

      // Then: Should generate different colors based on index
      expect(palette0.primary).not.toBe(palette1.primary)
    })

    it('should generate WCAG AA compliant text colors', () => {
      // Given: Multiple project IDs to test various color variants
      const project1Id = 'test-project-1'
      const project2Id = 'test-project-2'

      // When: Generating palettes
      const palette1 = ColorAssignmentService.generateProjectPalette(project1Id, 0) // VRidge primary
      const palette2 = ColorAssignmentService.generateProjectPalette(project2Id, 1) // Success colors

      // Then: Text colors should be high contrast (all Tailwind tokens use white text for dark backgrounds)
      expect(palette1.text).toBe('rgb(255, 255, 255)') // White text for VRidge brand
      expect(palette2.text).toBe('rgb(255, 255, 255)') // White text for success colors
    })
  })

  describe('generateProjectLegend', () => {
    it('should generate legend items for all projects', () => {
      // Given: Array of projects
      const projects = mockProjects

      // When: Generating legend
      const legend = ColorAssignmentService.generateProjectLegend(projects)

      // Then: Should have legend item for each project
      expect(legend).toHaveLength(projects.length)
      legend.forEach((item, index) => {
        expect(item.project).toBe(projects[index])
        expect(item.palette).toBeDefined()
        expect(item.isVisible).toBe(true)
      })
    })

    it('should assign different colors to each project in legend', () => {
      // Given: Multiple projects
      const projects = mockProjects

      // When: Generating legend
      const legend = ColorAssignmentService.generateProjectLegend(projects)

      // Then: Each project should have unique colors
      const primaryColors = legend.map(item => item.palette.primary)
      const uniqueColors = new Set(primaryColors)
      expect(uniqueColors.size).toBe(primaryColors.length)
    })
  })

  describe('getPhaseColor', () => {
    it('should return different colors for different phase types', () => {
      // Given: A project and all phase types
      const project = mockProjects[0]

      // When: Getting colors for each phase type
      const planningColor = ColorAssignmentService.getPhaseColor(project, 'planning')
      const filmingColor = ColorAssignmentService.getPhaseColor(project, 'filming')
      const editingColor = ColorAssignmentService.getPhaseColor(project, 'editing')

      // Then: Should return different colors for each phase
      expect(planningColor).not.toBe(filmingColor)
      expect(filmingColor).not.toBe(editingColor)
      expect(editingColor).not.toBe(planningColor)
    })

    it('should return consistent colors for same phase type and project', () => {
      // Given: Same project and phase type
      const project = mockProjects[0]

      // When: Getting phase color multiple times
      const color1 = ColorAssignmentService.getPhaseColor(project, 'filming')
      const color2 = ColorAssignmentService.getPhaseColor(project, 'filming')

      // Then: Should return consistent color
      expect(color1).toBe(color2)
    })

    it('should follow VRidge design hierarchy: planning < filming < editing intensity', () => {
      // Given: A project
      const project = mockProjects[0]
      const basePalette = ColorAssignmentService.generateProjectPalette(project.id)

      // When: Getting phase colors
      const planningColor = ColorAssignmentService.getPhaseColor(project, 'planning')
      const filmingColor = ColorAssignmentService.getPhaseColor(project, 'filming')
      const editingColor = ColorAssignmentService.getPhaseColor(project, 'editing')

      // Then: Should follow expected intensity mapping
      expect(planningColor).toBe(basePalette.secondary) // Lightest
      expect(filmingColor).toBe(basePalette.primary)    // Main color
      expect(editingColor).toBe(basePalette.accent)     // Darkest
    })
  })

  describe('validateColorAccessibility', () => {
    it('should validate high contrast Tailwind color combinations', () => {
      // Given: High contrast Tailwind colors
      const backgroundColor = 'rgb(255, 255, 255)' // white
      const textColor = 'rgb(0, 0, 0)' // black

      // When: Validating accessibility
      const isAccessible = ColorAssignmentService.validateColorAccessibility(backgroundColor, textColor)

      // Then: Should pass WCAG AA (21:1 contrast ratio)
      expect(isAccessible).toBe(true)
    })

    it('should reject low contrast Tailwind color combinations', () => {
      // Given: Low contrast Tailwind colors  
      const backgroundColor = 'rgb(156, 163, 175)' // gray-400
      const textColor = 'rgb(209, 213, 219)'       // gray-300

      // When: Validating accessibility
      const isAccessible = ColorAssignmentService.validateColorAccessibility(backgroundColor, textColor)

      // Then: Should fail WCAG AA (insufficient contrast)
      expect(isAccessible).toBe(false)
    })
  })

  describe('generateColorSwatch', () => {
    it('should generate valid swatch configuration with Tailwind colors', () => {
      // Given: A Tailwind-based color palette
      const palette: ProjectColorPalette = {
        primary: 'rgb(0, 49, 255)',      // vridge-500
        secondary: 'rgb(230, 236, 255)', // vridge-100
        accent: 'rgb(0, 89, 219)',       // vridge-700
        text: 'rgb(255, 255, 255)'       // white
      }

      // When: Generating swatch
      const swatch = ColorAssignmentService.generateColorSwatch(palette)

      // Then: Should have valid Tailwind-based configuration
      expect(swatch.background).toBe(palette.primary)
      expect(swatch.border).toBe(palette.accent)
      expect(swatch.size).toBe('16px')
      expect(typeof swatch.size).toBe('string')
    })
  })

  describe('Color Uniqueness and Distribution', () => {
    it('should distribute colors evenly across hue spectrum', () => {
      // Given: Many projects to test color distribution
      const manyProjects = Array.from({ length: 12 }, (_, i) => ({
        ...mockProjects[0],
        id: `project-${i}`
      }))

      // When: Generating legend
      const legend = ColorAssignmentService.generateProjectLegend(manyProjects)

      // Then: Should use diverse Tailwind color palettes
      const primaryColors = legend.map(item => item.palette.primary)
      const uniqueColors = new Set(primaryColors)
      
      // Should have diverse color distribution from Tailwind palettes
      expect(uniqueColors.size).toBeGreaterThan(8) // Should use most color variants
    })

    it('should handle large numbers of projects gracefully', () => {
      // Given: More projects than available base colors
      const manyProjects = Array.from({ length: 25 }, (_, i) => ({
        ...mockProjects[0],
        id: `project-${i}`,
        name: `Project ${i}`
      }))

      // When: Generating legend
      const legend = ColorAssignmentService.generateProjectLegend(manyProjects)

      // Then: Should generate colors for all projects (cycling through Tailwind palettes)
      expect(legend).toHaveLength(25)
      legend.forEach(item => {
        expect(item.palette.primary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty project arrays', () => {
      // Given: Empty project array
      const emptyProjects: Project[] = []

      // When: Generating legend
      const legend = ColorAssignmentService.generateProjectLegend(emptyProjects)

      // Then: Should return empty array
      expect(legend).toHaveLength(0)
    })

    it('should handle projects with special characters in IDs', () => {
      // Given: Project with special characters
      const specialProject = {
        ...mockProjects[0],
        id: 'project-특수문자-123!@#'
      }

      // When: Generating palette
      const palette = ColorAssignmentService.generateProjectPalette(specialProject.id)

      // Then: Should generate valid Tailwind colors
      expect(palette.primary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)
    })
  })
})