'use client'

import Link from 'next/link'

import { SideBar } from '@/widgets'

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 컨텐츠 */}
      <main className="flex-1 ml-[300px] transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <Link href="/projects" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              ← 프로젝트 목록으로
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">새 프로젝트 생성</h1>
            <p className="text-gray-600 mt-2">새로운 프로젝트를 시작하세요</p>
          </div>
          
          {/* Create Project Form - TODO: 프로젝트 생성 폼 구현 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-12">
              <p>프로젝트 생성 폼을 곧 구현할 예정입니다.</p>
              <p className="mt-2">현재는 레거시 UI 디자인을 확인하고 사이드바 네비게이션을 테스트 중입니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}