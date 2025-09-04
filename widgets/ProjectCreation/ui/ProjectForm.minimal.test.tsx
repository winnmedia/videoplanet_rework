import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ProjectForm } from './ProjectForm.minimal'

describe('Minimal ProjectForm Test', () => {
  it('should render minimal project form', () => {
    render(<ProjectForm />)
    expect(screen.getByTestId('project-form')).toBeInTheDocument()
    expect(screen.getByTestId('project-title-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })
})