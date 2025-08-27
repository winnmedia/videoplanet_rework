import React from 'react'

// 최소한의 ProjectForm 컴포넌트
export function ProjectForm() {
  return (
    <div data-testid="project-form">
      <h2>새 프로젝트 생성</h2>
      <form>
        <input 
          placeholder="프로젝트 제목을 입력하세요"
          data-testid="project-title-input"
        />
        <button type="submit" data-testid="submit-button">
          프로젝트 생성
        </button>
      </form>
    </div>
  )
}