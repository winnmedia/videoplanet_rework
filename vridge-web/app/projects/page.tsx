'use client'

import { ProjectList } from '@/widgets/projects'
import { CreateProjectButton } from '@/features/project'
import { ProjectFilter } from '@/features/project'

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">프로젝트</h1>
        <CreateProjectButton />
      </div>
      
      <div className="mb-6">
        <ProjectFilter />
      </div>
      
      <ProjectList />
    </div>
  )
}