'use client';

/**
 * @description Collaboration Panel - 협업 패널
 * @purpose 실시간 협업 및 팀 컴뮤니케이션
 */

import React, { useState } from 'react';

import styles from './CollaborationPanel.module.scss';
import type { CollaborationPanelProps, TeamMember } from '../model/types';

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  project,
  comments,
  teamMembers,
  currentUser,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onCommentResolve,
  onMemberInvite,
  showOnlineStatus = true,
  isReadOnly = false,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'team'>('comments');
  const [newComment, setNewComment] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'writer' as TeamMember['role']
  });

  const handleCommentSubmit = () => {
    if (!newComment.trim() || isReadOnly) return;

    onCommentAdd({
      content: newComment,
      mentions: extractMentions(newComment),
      isResolved: false
    });

    setNewComment('');
  };

  const handleInviteMember = () => {
    if (!inviteData.email.trim()) return;
    
    onMemberInvite(inviteData.email, inviteData.role);
    setInviteData({ email: '', role: 'writer' });
    setShowInviteModal(false);
  };

  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@([\w가-힣]+)/g);
    return mentions ? mentions.map(m => m.substring(1)) : [];
  };

  const formatCommentContent = (content: string) => {
    return content.replace(/@([\w가-힣]+)/g, 
      '<span class="mention" data-testid="mention-$1">@$1</span>'
    );
  };

  return (
    <div className={`${styles.panel} ${className || ''}`} data-testid="collaboration-panel">
      {/* 탭 네비게이션 */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          댓글 ({comments.filter(c => !c.isResolved).length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'team' ? styles.active : ''}`}
          onClick={() => setActiveTab('team')}
        >
          팀멤버 ({teamMembers.length})
        </button>
      </div>

      {/* 댓글 탭 */}
      {activeTab === 'comments' && (
        <div className={styles.commentsTab}>
          {/* 댓글 입력 */}
          {!isReadOnly && (
            <div className={styles.commentInput}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요... (@를 입력하면 멘션 가능)"
                aria-label="댓글 작성"
                rows={3}
              />
              <button
                className={styles.submitButton}
                onClick={handleCommentSubmit}
                disabled={!newComment.trim()}
              >
                댓글 추가
              </button>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className={styles.commentsList}>
            {comments
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(comment => (
                <div 
                  key={comment.id} 
                  className={`${styles.comment} ${comment.isResolved ? styles.resolved : ''}`}
                >
                  <div className={styles.commentHeader}>
                    <div className={styles.author}>
                      {comment.author.avatar ? (
                        <img 
                          src={comment.author.avatar} 
                          alt={comment.author.name}
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {comment.author.name.charAt(0)}
                        </div>
                      )}
                      <div className={styles.authorInfo}>
                        <span className={styles.authorName}>{comment.author.name}</span>
                        <span className={styles.role}>({comment.author.role})</span>
                      </div>
                    </div>
                    <div className={styles.commentMeta}>
                      <time className={styles.timestamp}>
                        {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                      {!isReadOnly && (
                        <div className={styles.commentActions}>
                          {!comment.isResolved && (
                            <button
                              className={styles.resolveButton}
                              onClick={() => onCommentResolve(comment.id)}
                              title="해결 마크"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            className={styles.deleteButton}
                            onClick={() => onCommentDelete(comment.id)}
                            title="댓글 삭제"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div 
                    className={styles.commentContent}
                    dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
                  />
                  {comment.mentions && comment.mentions.length > 0 && (
                    <div className={styles.mentions}>
                      멘션: {comment.mentions.join(', ')}
                    </div>
                  )}
                </div>
              ))
            }
            
            {comments.length === 0 && (
              <div className={styles.emptyComments}>
                <p>아직 댓글이 없습니다</p>
                {!isReadOnly && <p>첫 번째 댓글을 작성해보세요!</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 팀멤버 탭 */}
      {activeTab === 'team' && (
        <div className={styles.teamTab}>
          {/* 팀멤버 초대 */}
          {!isReadOnly && (
            <div className={styles.inviteSection}>
              <button
                className={styles.inviteButton}
                onClick={() => setShowInviteModal(true)}
                aria-label="팀멤버 초대"
              >
                + 팀멤버 초대
              </button>
            </div>
          )}

          {/* 팀멤버 목록 */}
          <div className={styles.membersList}>
            {teamMembers.map(member => (
              <div key={member.id} className={styles.member}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {member.name.charAt(0)}
                      </div>
                    )}
                    {showOnlineStatus && (
                      <div 
                        className={`${styles.onlineStatus} ${member.isOnline ? styles.online : styles.offline}`}
                        data-testid={`user-online-status-${member.id}`}
                      />
                    )}
                  </div>
                  <div className={styles.memberDetails}>
                    <span className={styles.memberName}>{member.name}</span>
                    <span className={styles.memberRole}>{getRoleLabel(member.role)}</span>
                    {member.lastSeen && !member.isOnline && (
                      <span className={styles.lastSeen}>
                        {formatLastSeen(member.lastSeen)}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.memberPermissions}>
                  {member.permissions.canEdit && <span className={styles.permission}>편집</span>}
                  {member.permissions.canApprove && <span className={styles.permission}>승인</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 초대 모달 */}
      {showInviteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>팀멤버 초대</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowInviteModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="invite-email">이메일 주소</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="invite-role">역할 선택</label>
                <select
                  id="invite-role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ 
                    ...prev, 
                    role: e.target.value as TeamMember['role'] 
                  }))}
                >
                  <option value="writer">작가</option>
                  <option value="editor">편집자</option>
                  <option value="reviewer">검토자</option>
                  <option value="client">클라이언트</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowInviteModal(false)}
              >
                취소
              </button>
              <button
                className={styles.inviteSubmitButton}
                onClick={handleInviteMember}
                disabled={!inviteData.email.trim()}
              >
                초대 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 헬퍼 함수들
function getRoleLabel(role: TeamMember['role']): string {
  const labels = {
    director: '감독',
    producer: '프로듀서',
    writer: '작가',
    cinematographer: '촬영감독',
    editor: '편집자',
    client: '클라이언트',
    reviewer: '검토자'
  };
  return labels[role] || role;
}

function formatLastSeen(lastSeen: string): string {
  const date = new Date(lastSeen);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '방금 전';
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}일 전`;
  
  return date.toLocaleDateString('ko-KR');
}