'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import type { Project } from '../model/project.schema';

interface ProjectCardProps {
  project: Project;
  viewMode?: 'grid' | 'list';
}

export const ProjectCard = React.memo(function ProjectCard({ 
  project, 
  viewMode = 'grid' 
}: ProjectCardProps) {
  const displayMembers = project.members.slice(0, 3);
  const remainingMembers = Math.max(0, project.memberCount - 3);

  const relativeTime = React.useMemo(() => {
    if (!project.lastActivityAt) return '활동 없음';
    return formatDistanceToNow(new Date(project.lastActivityAt), { 
      addSuffix: true, 
      locale: ko 
    });
  }, [project.lastActivityAt]);

  if (viewMode === 'list') {
    return (
      <Link 
        href={`/projects/${project.id}`}
        className="block bg-white rounded-lg border border-neutral-300 hover:border-vridge-500 transition-colors p-4"
      >
        <div className="flex items-center gap-4">
          {/* 썸네일 */}
          <div className="flex-shrink-0 w-20 h-20 bg-neutral-100 rounded-lg overflow-hidden">
            {project.thumbnailUrl ? (
              <Image
                src={project.thumbnailUrl}
                alt={project.title}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-neutral-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-neutral-950 truncate">
              {project.title}
            </h3>
            {project.description && (
              <p className="text-sm text-neutral-700 mt-1 line-clamp-1">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              {project.tags.length > 0 && (
                <div className="flex gap-1">
                  {project.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-vridge-50 text-vridge-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-xs text-neutral-500">{relativeTime}</span>
            </div>
          </div>

          {/* 멤버 아바타 */}
          <div className="flex-shrink-0 flex -space-x-2">
            {displayMembers.map((member, index) => (
              <div 
                key={member.id}
                className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center overflow-hidden"
                style={{ zIndex: displayMembers.length - index }}
              >
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-neutral-700">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {remainingMembers > 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-300 flex items-center justify-center">
                <span className="text-xs font-medium text-neutral-700">
                  +{remainingMembers}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      href={`/projects/${project.id}`}
      className="block bg-white rounded-lg border border-neutral-300 hover:border-vridge-500 transition-colors overflow-hidden group"
    >
      {/* 썸네일 */}
      <div className="aspect-video bg-neutral-100 relative overflow-hidden">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-neutral-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* 상태 배지 */}
        {project.status === 'archived' && (
          <div className="absolute top-2 right-2 bg-neutral-800 text-white px-2 py-1 rounded text-xs font-medium">
            보관됨
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-neutral-950 truncate">
          {project.title}
        </h3>
        
        {project.description && (
          <p className="text-sm text-neutral-700 mt-2 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* 태그 */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-vridge-50 text-vridge-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200">
          {/* 멤버 아바타 */}
          <div className="flex -space-x-2">
            {displayMembers.map((member, index) => (
              <div 
                key={member.id}
                className="w-6 h-6 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center overflow-hidden"
                style={{ zIndex: displayMembers.length - index }}
              >
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xs font-medium text-neutral-700">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {remainingMembers > 0 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-neutral-300 flex items-center justify-center">
                <span className="text-2xs font-medium text-neutral-700">
                  +{remainingMembers}
                </span>
              </div>
            )}
          </div>

          {/* 최근 활동 시간 */}
          <span className="text-xs text-neutral-500">
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  );
});