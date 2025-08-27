/**
 * EventModal - 일정 생성/편집/보기 모달
 * 캘린더 이벤트의 CRUD 작업을 처리
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import styles from './EventModal.module.scss'
import type { EventModalProps, CalendarEvent, EventCategory, EventPriority, RecurrenceType } from '../model/types'

export function EventModal({
  isOpen,
  mode,
  event,
  selectedDateTime,
  onSave,
  onDelete,
  onClose,
  availableProjects = []
}: EventModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isAllDay: false,
    category: 'meeting' as EventCategory,
    priority: 'medium' as EventPriority,
    projectId: '',
    recurrence: 'none' as RecurrenceType,
    recurrenceEndDate: '',
    assignedTo: [] as string[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const modalRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return

    if (mode === 'create' && selectedDateTime) {
      const dateTime = new Date(selectedDateTime)
      const endDateTime = new Date(dateTime.getTime() + 60 * 60 * 1000) // 1시간 후
      
      setFormData({
        title: '',
        description: '',
        startDate: dateTime.toISOString().split('T')[0],
        startTime: dateTime.toTimeString().slice(0, 5),
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: endDateTime.toTimeString().slice(0, 5),
        isAllDay: false,
        category: 'meeting',
        priority: 'medium',
        projectId: '',
        recurrence: 'none',
        recurrenceEndDate: '',
        assignedTo: []
      })
    } else if ((mode === 'edit' || mode === 'view') && event) {
      const startDate = new Date(event.startDate)
      const endDate = new Date(event.endDate)
      
      setFormData({
        title: event.title,
        description: event.description || '',
        startDate: startDate.toISOString().split('T')[0],
        startTime: event.isAllDay ? '' : startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: event.isAllDay ? '' : endDate.toTimeString().slice(0, 5),
        isAllDay: event.isAllDay,
        category: event.category,
        priority: event.priority,
        projectId: event.projectId || '',
        recurrence: event.recurrence,
        recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate).toISOString().split('T')[0] : '',
        assignedTo: event.assignedTo || []
      })
    }

    setErrors({})
    
    // 모달 오픈 시 제목 필드에 포커스
    setTimeout(() => {
      titleInputRef.current?.focus()
    }, 100)
  }, [isOpen, mode, event, selectedDateTime])

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요'
    }

    if (!formData.startDate) {
      newErrors.startDate = '시작 날짜를 선택해주세요'
    }

    if (!formData.endDate) {
      newErrors.endDate = '종료 날짜를 선택해주세요'
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '종료 날짜는 시작 날짜보다 늦어야 합니다'
    }

    if (!formData.isAllDay) {
      if (!formData.startTime) {
        newErrors.startTime = '시작 시간을 입력해주세요'
      }
      if (!formData.endTime) {
        newErrors.endTime = '종료 시간을 입력해주세요'
      }
      
      if (formData.startDate === formData.endDate && formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다'
      }
    }

    if (formData.recurrence !== 'none' && !formData.recurrenceEndDate) {
      newErrors.recurrenceEndDate = '반복 종료 날짜를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Form handlers
  const handleInputChange = useCallback((field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }, [errors])

  const handleAllDayChange = useCallback((isAllDay: boolean) => {
    setFormData(prev => ({
      ...prev,
      isAllDay,
      startTime: isAllDay ? '' : prev.startTime || '09:00',
      endTime: isAllDay ? '' : prev.endTime || '10:00'
    }))
  }, [])

  const handleSave = useCallback(() => {
    if (!validateForm()) return

    const eventData: Partial<CalendarEvent> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      startDate: formData.isAllDay 
        ? `${formData.startDate}T00:00:00.000Z`
        : `${formData.startDate}T${formData.startTime}:00.000Z`,
      endDate: formData.isAllDay
        ? `${formData.endDate}T23:59:59.999Z`
        : `${formData.endDate}T${formData.endTime}:00.000Z`,
      isAllDay: formData.isAllDay,
      category: formData.category,
      priority: formData.priority,
      projectId: formData.projectId || undefined,
      recurrence: formData.recurrence,
      recurrenceEndDate: formData.recurrenceEndDate 
        ? `${formData.recurrenceEndDate}T23:59:59.999Z` 
        : undefined,
      assignedTo: formData.assignedTo.length > 0 ? formData.assignedTo : undefined
    }

    onSave?.(eventData)
  }, [formData, validateForm, onSave])

  const handleDelete = useCallback(() => {
    if (event && window.confirm('정말로 이 일정을 삭제하시겠습니까?')) {
      onDelete?.(event.id)
    }
  }, [event, onDelete])

  // Keyboard handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (mode !== 'view') {
        handleSave()
      }
    }
  }, [mode, handleSave, onClose])

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalTitle = mode === 'create' ? '새 일정 만들기' : 
                   mode === 'edit' ? '일정 편집' : 
                   '일정 보기'

  const isReadOnly = mode === 'view'

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div 
        ref={modalRef}
        className={styles.modal}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <header className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            {modalTitle}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="모달 닫기"
            type="button"
          >
            ×
          </button>
        </header>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            {/* Title */}
            <div className={styles.formGroup}>
              <label htmlFor="event-title" className={styles.label}>
                제목 <span className={styles.required}>*</span>
              </label>
              <input
                ref={titleInputRef}
                id="event-title"
                type="text"
                className={`${styles.input} ${errors.title ? styles.error : ''}`}
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="일정 제목을 입력하세요"
                readOnly={isReadOnly}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <div id="title-error" className={styles.errorMessage} role="alert">
                  {errors.title}
                </div>
              )}
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="event-description" className={styles.label}>설명</label>
              <textarea
                id="event-description"
                className={styles.textarea}
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="일정에 대한 설명을 입력하세요 (선택사항)"
                readOnly={isReadOnly}
              />
            </div>

            {/* All Day Toggle */}
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={formData.isAllDay}
                  onChange={(e) => handleAllDayChange(e.target.checked)}
                  disabled={isReadOnly}
                />
                종일
              </label>
            </div>

            {/* Date and Time */}
            <div className={styles.dateTimeGroup}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="start-date" className={styles.label}>
                    시작 날짜 <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className={`${styles.input} ${errors.startDate ? styles.error : ''}`}
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    readOnly={isReadOnly}
                    aria-describedby={errors.startDate ? 'start-date-error' : undefined}
                  />
                  {errors.startDate && (
                    <div id="start-date-error" className={styles.errorMessage} role="alert">
                      {errors.startDate}
                    </div>
                  )}
                </div>

                {!formData.isAllDay && (
                  <div className={styles.formGroup}>
                    <label htmlFor="start-time" className={styles.label}>
                      시작 시간 <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="start-time"
                      type="time"
                      className={`${styles.input} ${errors.startTime ? styles.error : ''}`}
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      readOnly={isReadOnly}
                      aria-describedby={errors.startTime ? 'start-time-error' : undefined}
                    />
                    {errors.startTime && (
                      <div id="start-time-error" className={styles.errorMessage} role="alert">
                        {errors.startTime}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="end-date" className={styles.label}>
                    종료 날짜 <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className={`${styles.input} ${errors.endDate ? styles.error : ''}`}
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    readOnly={isReadOnly}
                    aria-describedby={errors.endDate ? 'end-date-error' : undefined}
                  />
                  {errors.endDate && (
                    <div id="end-date-error" className={styles.errorMessage} role="alert">
                      {errors.endDate}
                    </div>
                  )}
                </div>

                {!formData.isAllDay && (
                  <div className={styles.formGroup}>
                    <label htmlFor="end-time" className={styles.label}>
                      종료 시간 <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="end-time"
                      type="time"
                      className={`${styles.input} ${errors.endTime ? styles.error : ''}`}
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      readOnly={isReadOnly}
                      aria-describedby={errors.endTime ? 'end-time-error' : undefined}
                    />
                    {errors.endTime && (
                      <div id="end-time-error" className={styles.errorMessage} role="alert">
                        {errors.endTime}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Category and Priority */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="event-category" className={styles.label}>카테고리</label>
                <select
                  id="event-category"
                  className={styles.select}
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value as EventCategory)}
                  disabled={isReadOnly}
                >
                  <option value="meeting">미팅</option>
                  <option value="project-deadline">프로젝트 마감</option>
                  <option value="milestone">마일스톤</option>
                  <option value="personal">개인</option>
                  <option value="holiday">휴일</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="event-priority" className={styles.label}>우선순위</label>
                <select
                  id="event-priority"
                  className={styles.select}
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as EventPriority)}
                  disabled={isReadOnly}
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>
            </div>

            {/* Project */}
            {availableProjects.length > 0 && (
              <div className={styles.formGroup}>
                <label htmlFor="event-project" className={styles.label}>연결된 프로젝트</label>
                <select
                  id="event-project"
                  className={styles.select}
                  value={formData.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="">프로젝트를 선택하세요</option>
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recurrence */}
            <div className={styles.formGroup}>
              <label htmlFor="event-recurrence" className={styles.label}>반복</label>
              <select
                id="event-recurrence"
                className={styles.select}
                value={formData.recurrence}
                onChange={(e) => handleInputChange('recurrence', e.target.value as RecurrenceType)}
                disabled={isReadOnly}
              >
                <option value="none">반복 안함</option>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
                <option value="yearly">매년</option>
              </select>
            </div>

            {/* Recurrence End Date */}
            {formData.recurrence !== 'none' && (
              <div className={styles.formGroup}>
                <label htmlFor="recurrence-end" className={styles.label}>
                  반복 종료 날짜 <span className={styles.required}>*</span>
                </label>
                <input
                  id="recurrence-end"
                  type="date"
                  className={`${styles.input} ${errors.recurrenceEndDate ? styles.error : ''}`}
                  value={formData.recurrenceEndDate}
                  onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                  readOnly={isReadOnly}
                  aria-describedby={errors.recurrenceEndDate ? 'recurrence-end-error' : undefined}
                />
                {errors.recurrenceEndDate && (
                  <div id="recurrence-end-error" className={styles.errorMessage} role="alert">
                    {errors.recurrenceEndDate}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <footer className={styles.modalFooter}>
          <div className={styles.footerLeft}>
            {mode === 'edit' && event && (
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                type="button"
              >
                삭제
              </button>
            )}
          </div>

          <div className={styles.footerRight}>
            <button
              className={styles.cancelButton}
              onClick={onClose}
              type="button"
            >
              {mode === 'view' ? '닫기' : '취소'}
            </button>
            
            {mode !== 'view' && (
              <button
                className={styles.saveButton}
                onClick={handleSave}
                type="button"
              >
                {mode === 'create' ? '생성' : '수정'}
              </button>
            )}
            
            {mode === 'view' && (
              <button
                className={styles.editButton}
                onClick={() => {
                  // Switch to edit mode - this would need to be handled by parent
                  onClose?.()
                }}
                type="button"
              >
                편집
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}