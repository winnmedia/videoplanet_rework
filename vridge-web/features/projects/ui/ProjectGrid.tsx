'use client';

import React from 'react';

import { ProjectCard } from './ProjectCard';
import type { Project } from '../model/project.schema';

interface ProjectGridProps {
  projects: Project[];
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const ProjectGrid = React.memo(function ProjectGrid({ 
  projects,
  columns = {
    default: 1,
    md: 2,
    lg: 3,
    xl: 4
  }
}: ProjectGridProps) {
  // 동적 그리드 클래스 생성
  const gridClassName = React.useMemo(() => {
    const classes = ['grid', 'gap-6'];
    
    if (columns.default) classes.push(`grid-cols-${columns.default}`);
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
    
    return classes.join(' ');
  }, [columns]);

  return (
    <div className={gridClassName}>
      {projects.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          viewMode="grid"
        />
      ))}
    </div>
  );
});

// 그리드 스켈레톤 컴포넌트
export const ProjectGridSkeleton = React.memo(function ProjectGridSkeleton({ 
  count = 8,
  columns = {
    default: 1,
    md: 2,
    lg: 3,
    xl: 4
  }
}: {
  count?: number;
  columns?: ProjectGridProps['columns'];
}) {
  const gridClassName = React.useMemo(() => {
    const classes = ['grid', 'gap-6'];
    
    if (columns.default) classes.push(`grid-cols-${columns.default}`);
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
    
    return classes.join(' ');
  }, [columns]);

  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-neutral-300 overflow-hidden">
          <div className="aspect-video bg-neutral-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-neutral-200 rounded animate-pulse" />
            <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
              <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse" />
            </div>
            <div className="pt-3 border-t border-neutral-200">
              <div className="flex justify-between items-center">
                <div className="flex -space-x-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-6 h-6 bg-neutral-200 rounded-full animate-pulse" />
                  ))}
                </div>
                <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});