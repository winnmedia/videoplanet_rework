#!/usr/bin/env node

/**
 * Collaboration Bundle Size Analyzer
 * Analyzes bundle size impact of collaboration features
 * Target: Minimize impact on initial bundle, lazy load collaboration features
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Performance targets for collaboration features
const COLLABORATION_BUNDLE_LIMITS = {
  // Main collaboration bundle (lazy loaded)
  maxCollaborationChunk: 50 * 1024, // 50KB
  
  // Collaboration-related chunks
  maxCollaborationRelated: 25 * 1024, // 25KB per related chunk
  
  // Initial bundle impact (should be minimal)
  maxInitialBundleImpact: 5 * 1024, // 5KB maximum impact on initial bundle
  
  // Total collaboration features
  maxTotalCollaboration: 100 * 1024, // 100KB total
}

/**
 * Analyze bundle for collaboration-related code
 */
async function analyzeCollaborationBundle() {
  console.log('🔍 Analyzing collaboration bundle impact...\n')
  
  try {
    // Build the project to generate bundle stats
    console.log('📦 Building project for bundle analysis...')
    execSync('pnpm run build', { stdio: 'pipe' })
    
    // Analyze Next.js build output
    const buildDir = path.join(process.cwd(), '.next')
    const manifestPath = path.join(buildDir, 'static/chunks/_app.js.map')
    
    // Get bundle information
    const bundleAnalysis = analyzeBundleFiles(buildDir)
    
    // Generate report
    generateBundleReport(bundleAnalysis)
    
    // Validate against limits
    validateBundleLimits(bundleAnalysis)
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    process.exit(1)
  }
}

/**
 * Analyze bundle files for collaboration-related content
 */
function analyzeBundleFiles(buildDir) {
  const staticDir = path.join(buildDir, 'static/chunks')
  const analysisResult = {
    collaborationChunks: [],
    initialBundleImpact: 0,
    totalCollaborationSize: 0,
    lazyLoadedSize: 0,
    collaborationModules: [],
    recommendations: []
  }
  
  if (!fs.existsSync(staticDir)) {
    console.warn('⚠️  Build directory not found, skipping bundle analysis')
    return analysisResult
  }
  
  try {
    const chunkFiles = fs.readdirSync(staticDir).filter(file => file.endsWith('.js'))
    
    chunkFiles.forEach(file => {
      const filePath = path.join(staticDir, file)
      const fileSize = fs.statSync(filePath).size
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Check if chunk contains collaboration-related code
      const collaborationKeywords = [
        'collaboration', 'useCollaboration', 'pollCollaborationData',
        'collaborationSlice', 'CollaborationIndicator', 'ConflictModal',
        'ActivityFeed', 'withCollaboration'
      ]
      
      const containsCollaboration = collaborationKeywords.some(keyword => 
        content.includes(keyword)
      )
      
      if (containsCollaboration) {
        const chunkInfo = {
          file,
          size: fileSize,
          isMainBundle: file.includes('main') || file.includes('_app'),
          collaborationRatio: calculateCollaborationRatio(content, collaborationKeywords),
          features: identifyCollaborationFeatures(content)
        }
        
        analysisResult.collaborationChunks.push(chunkInfo)
        analysisResult.totalCollaborationSize += fileSize
        
        if (chunkInfo.isMainBundle) {
          analysisResult.initialBundleImpact += fileSize * chunkInfo.collaborationRatio
        } else {
          analysisResult.lazyLoadedSize += fileSize
        }
      }
    })
    
    // Find collaboration modules
    analysisResult.collaborationModules = findCollaborationModules(buildDir)
    
    // Generate recommendations
    analysisResult.recommendations = generateOptimizationRecommendations(analysisResult)
    
  } catch (error) {
    console.warn('⚠️  Error analyzing chunks:', error.message)
  }
  
  return analysisResult
}

/**
 * Calculate what percentage of a chunk is collaboration-related
 */
function calculateCollaborationRatio(content, keywords) {
  let collaborationLines = 0
  const totalLines = content.split('\n').length
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    const matches = content.match(regex)
    if (matches) {
      collaborationLines += matches.length
    }
  })
  
  return Math.min(collaborationLines / totalLines * 10, 1) // Cap at 100%
}

/**
 * Identify specific collaboration features in content
 */
function identifyCollaborationFeatures(content) {
  const features = []
  
  const featureMap = {
    'Adaptive Polling': ['adaptivePolling', 'calculateAdaptiveInterval'],
    'Request Deduplication': ['requestDeduplication', 'pendingRequests'],
    'Smart Caching': ['requestCache', 'cacheHit'],
    'Real-time Updates': ['pollCollaborationData', 'WebSocket'],
    'Conflict Resolution': ['ConflictModal', 'resolveConflict'],
    'Activity Feed': ['ActivityFeed', 'recentChanges'],
    'User Presence': ['activeUsers', 'CollaborationIndicator']
  }
  
  Object.entries(featureMap).forEach(([feature, keywords]) => {
    if (keywords.some(keyword => content.includes(keyword))) {
      features.push(feature)
    }
  })
  
  return features
}

/**
 * Find collaboration-related modules in the build
 */
function findCollaborationModules(buildDir) {
  const modules = []
  
  try {
    // Look for source maps to identify original modules
    const staticDir = path.join(buildDir, 'static/chunks')
    const mapFiles = fs.readdirSync(staticDir).filter(file => file.endsWith('.js.map'))
    
    mapFiles.forEach(mapFile => {
      try {
        const mapPath = path.join(staticDir, mapFile)
        const sourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
        
        if (sourceMap.sources) {
          const collaborationModules = sourceMap.sources.filter(source =>
            source.includes('collaboration') || source.includes('shared/lib/collaboration')
          )
          
          modules.push(...collaborationModules.map(module => ({
            name: path.basename(module),
            path: module,
            chunk: mapFile.replace('.js.map', '.js')
          })))
        }
      } catch (e) {
        // Skip invalid source maps
      }
    })
  } catch (error) {
    console.warn('⚠️  Could not analyze modules:', error.message)
  }
  
  return modules
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(analysis) {
  const recommendations = []
  
  // Check initial bundle impact
  if (analysis.initialBundleImpact > COLLABORATION_BUNDLE_LIMITS.maxInitialBundleImpact) {
    recommendations.push({
      type: 'critical',
      issue: 'High Initial Bundle Impact',
      description: `Collaboration code in initial bundle: ${(analysis.initialBundleImpact / 1024).toFixed(1)}KB`,
      solution: 'Move collaboration features to lazy-loaded chunks using dynamic imports',
      priority: 1
    })
  }
  
  // Check individual chunk sizes
  analysis.collaborationChunks.forEach(chunk => {
    if (chunk.size > COLLABORATION_BUNDLE_LIMITS.maxCollaborationChunk) {
      recommendations.push({
        type: 'warning',
        issue: 'Large Collaboration Chunk',
        description: `Chunk ${chunk.file} is ${(chunk.size / 1024).toFixed(1)}KB`,
        solution: 'Split chunk further or optimize collaboration features',
        priority: 2
      })
    }
  })
  
  // Check total collaboration size
  if (analysis.totalCollaborationSize > COLLABORATION_BUNDLE_LIMITS.maxTotalCollaboration) {
    recommendations.push({
      type: 'warning',
      issue: 'Large Total Collaboration Size',
      description: `Total collaboration features: ${(analysis.totalCollaborationSize / 1024).toFixed(1)}KB`,
      solution: 'Optimize collaboration features or implement progressive loading',
      priority: 2
    })
  }
  
  // Check for missing lazy loading
  if (analysis.initialBundleImpact / analysis.totalCollaborationSize > 0.2) {
    recommendations.push({
      type: 'warning',
      issue: 'Insufficient Lazy Loading',
      description: 'Too much collaboration code in initial bundle',
      solution: 'Implement better code-splitting for collaboration features',
      priority: 2
    })
  }
  
  // Performance recommendations
  if (analysis.collaborationChunks.length > 5) {
    recommendations.push({
      type: 'info',
      issue: 'Many Collaboration Chunks',
      description: 'Multiple small chunks may impact performance',
      solution: 'Consider consolidating related collaboration features',
      priority: 3
    })
  }
  
  return recommendations.sort((a, b) => a.priority - b.priority)
}

/**
 * Generate detailed bundle report
 */
function generateBundleReport(analysis) {
  console.log('📊 Collaboration Bundle Analysis Report')
  console.log('=' .repeat(50))
  
  // Summary
  console.log('\n📈 Summary:')
  console.log(`Total Collaboration Size: ${(analysis.totalCollaborationSize / 1024).toFixed(1)}KB`)
  console.log(`Initial Bundle Impact: ${(analysis.initialBundleImpact / 1024).toFixed(1)}KB`)
  console.log(`Lazy Loaded Size: ${(analysis.lazyLoadedSize / 1024).toFixed(1)}KB`)
  console.log(`Collaboration Chunks: ${analysis.collaborationChunks.length}`)
  
  // Detailed chunks
  if (analysis.collaborationChunks.length > 0) {
    console.log('\n📦 Collaboration Chunks:')
    analysis.collaborationChunks.forEach(chunk => {
      console.log(`  ${chunk.file}: ${(chunk.size / 1024).toFixed(1)}KB${chunk.isMainBundle ? ' (INITIAL)' : ' (LAZY)'}`)
      if (chunk.features.length > 0) {
        console.log(`    Features: ${chunk.features.join(', ')}`)
      }
    })
  }
  
  // Collaboration modules
  if (analysis.collaborationModules.length > 0) {
    console.log('\n🧩 Collaboration Modules:')
    analysis.collaborationModules.slice(0, 10).forEach(module => {
      console.log(`  ${module.name} (in ${module.chunk})`)
    })
    if (analysis.collaborationModules.length > 10) {
      console.log(`  ... and ${analysis.collaborationModules.length - 10} more`)
    }
  }
  
  console.log('')
}

/**
 * Validate against performance budgets
 */
function validateBundleLimits(analysis) {
  console.log('✅ Bundle Validation:')
  
  let hasViolations = false
  
  // Check limits
  const checks = [
    {
      name: 'Initial Bundle Impact',
      actual: analysis.initialBundleImpact,
      limit: COLLABORATION_BUNDLE_LIMITS.maxInitialBundleImpact,
      critical: true
    },
    {
      name: 'Total Collaboration Size',
      actual: analysis.totalCollaborationSize,
      limit: COLLABORATION_BUNDLE_LIMITS.maxTotalCollaboration,
      critical: false
    }
  ]
  
  checks.forEach(check => {
    const passed = check.actual <= check.limit
    const icon = passed ? '✅' : (check.critical ? '❌' : '⚠️')
    const actualKB = (check.actual / 1024).toFixed(1)
    const limitKB = (check.limit / 1024).toFixed(1)
    
    console.log(`  ${icon} ${check.name}: ${actualKB}KB (limit: ${limitKB}KB)`)
    
    if (!passed && check.critical) {
      hasViolations = true
    }
  })
  
  // Show recommendations
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Optimization Recommendations:')
    analysis.recommendations.forEach((rec, index) => {
      const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️'
      console.log(`  ${icon} ${rec.issue}`)
      console.log(`     ${rec.description}`)
      console.log(`     Solution: ${rec.solution}`)
      if (index < analysis.recommendations.length - 1) console.log('')
    })
  }
  
  // Final result
  if (hasViolations) {
    console.log('\n❌ Bundle validation failed! Critical limits exceeded.')
    process.exit(1)
  } else {
    console.log('\n✅ Bundle validation passed!')
  }
}

// Add performance monitoring for the script itself
const scriptStart = performance.now()

analyzeCollaborationBundle()
  .then(() => {
    const scriptTime = performance.now() - scriptStart
    console.log(`\n⏱️  Analysis completed in ${scriptTime.toFixed(2)}ms`)
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  })