import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// 가장 단순한 컴포넌트로 테스트
function SimpleProjectForm() {
  return <div data-testid="simple-form">Simple Project Form</div>
}

describe('Simple ProjectForm Test', () => {
  it('should render simple component', () => {
    render(<SimpleProjectForm />)
    expect(screen.getByTestId('simple-form')).toBeInTheDocument()
  })
})