/**
 * Simplified Home Page for Emergency Deployment
 * Minimal dependencies to avoid build errors
 */

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-gray-900">
          VideoPlanet VRidge
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Professional video production platform is loading...
        </p>
        <div className="text-sm text-gray-500">
          Emergency deployment mode - Full features will be available soon
        </div>
        <div className="mt-8">
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}