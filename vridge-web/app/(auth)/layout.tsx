import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | VideoPlanet',
    default: 'Authentication'
  },
  description: '안전하고 편리한 비디오 제작 플랫폼'
}

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary dark:text-primary-light">
            VideoPlanet
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            AI 기반 비디오 제작 플랫폼
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          &copy; 2025 VideoPlanet. All rights reserved.
        </p>
        <div className="mt-2 space-x-4">
          <a href="/privacy" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            개인정보처리방침
          </a>
          <a href="/terms" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            이용약관
          </a>
          <a href="/contact" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            고객지원
          </a>
        </div>
      </div>
    </div>
  )
}