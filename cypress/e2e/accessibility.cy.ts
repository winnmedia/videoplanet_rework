/**
 * WCAG 2.1 AA 준수 접근성 E2E 테스트 스위트
 * 스크린 리더, 키보드 네비게이션, 시각적 접근성 검증
 */

describe('Accessibility (WCAG 2.1 AA) E2E Tests', () => {
  beforeEach(() => {
    cy.logTestStep('Starting accessibility test')
    cy.visit('/')
    cy.injectAxe()
  })

  describe('전체 페이지 접근성 검증', () => {
    it('메인 페이지가 WCAG 2.1 AA 기준을 준수해야 한다', () => {
      cy.logTestStep('Testing main page accessibility compliance')
      
      cy.checkAccessibility(null, {
        rules: {
          // 색상 대비 규칙 (4.5:1 ratio for normal text)
          'color-contrast': { enabled: true },
          // 이미지 대체 텍스트
          'image-alt': { enabled: true },
          // 제목 구조 (h1->h2->h3 순서)
          'heading-order': { enabled: true },
          // 랜드마크 역할
          'landmark-one-main': { enabled: true },
          // 폼 레이블
          'label': { enabled: true },
          // 키보드 접근성 및 포커스 관리 관련 규칙들  
          'tabindex': { enabled: true }, // tabindex 값이 0보다 크지 않도록 확인
          'button-name': { enabled: true }, // 버튼 요소에 접근 가능한 이름 확인
          'link-name': { enabled: true }, // 링크 요소에 접근 가능한 이름 확인
          'aria-roles': { enabled: true }, // ARIA 역할 사용의 유효성 검증
          'aria-valid-attr': { enabled: true } // ARIA 속성의 유효성 검증
        }
      })
    })

    it('에러 상태 페이지가 접근성을 준수해야 한다', () => {
      cy.logTestStep('Testing error page accessibility')
      
      // 에러 상태 생성
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 에러 컴포넌트 접근성 검증
      cy.checkAccessibility('[data-testid="error-display"]', {
        rules: {
          'color-contrast': { enabled: true },
          'button-name': { enabled: true },
          'aria-roles': { enabled: true }
        }
      })
      
      // 에러 메시지가 스크린 리더에 공지되는지 확인
      cy.get('[data-testid="error-display"]')
        .should('have.attr', 'role', 'alert')
        .or('have.attr', 'aria-live', 'assertive')
    })

    it('모달/다이얼로그가 접근성을 준수해야 한다', () => {
      cy.logTestStep('Testing modal accessibility')
      
      // 모달 열기 (있는 경우)
      cy.get('[data-testid="open-modal"], [data-cy="open-modal"]').then(($modal) => {
        if ($modal.length > 0) {
          cy.wrap($modal).click()
          
          // 모달 접근성 검증
          cy.get('[role="dialog"], [data-testid="modal"]')
            .should('exist')
            .and('have.attr', 'aria-labelledby')
            .and('have.attr', 'aria-modal', 'true')
          
          // 포커스 트랩 확인
          cy.get('[role="dialog"] button, [role="dialog"] input, [role="dialog"] a')
            .first()
            .should('be.focused')
        }
      })
    })
  })

  describe('키보드 네비게이션 검증', () => {
    it('모든 상호작용 요소가 키보드로 접근 가능해야 한다', () => {
      cy.logTestStep('Testing keyboard navigation accessibility')
      
      cy.get('body').tab()
      
      // 포커스 가능한 모든 요소 순회
      cy.get('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
        .each(($element) => {
          cy.wrap($element).focus()
          cy.focused().should('exist')
          
          // 포커스 시각화 확인
          cy.focused().then(($focused) => {
            const focusedElement = $focused[0]
            const computedStyle = window.getComputedStyle(focusedElement)
            const outline = computedStyle.outline
            const boxShadow = computedStyle.boxShadow
            
            // 포커스 표시가 있어야 함 (outline 또는 box-shadow)
            expect(outline !== 'none' || boxShadow !== 'none').to.be.true
          })
        })
    })

    it('Tab과 Shift+Tab으로 올바른 순서로 네비게이션되어야 한다', () => {
      cy.logTestStep('Testing tab order navigation')
      
      const focusOrder: string[] = []
      
      // Tab으로 전진 네비게이션
      cy.get('body').tab()
      for (let i = 0; i < 10; i++) {
        cy.focused().then(($focused) => {
          if ($focused.length > 0) {
            const id = $focused[0].id || $focused[0].tagName.toLowerCase()
            focusOrder.push(id)
          }
        })
        cy.focused().tab()
      }
      
      // Shift+Tab으로 역방향 네비게이션 확인
      cy.focused().tab({ shift: true })
      cy.focused().then(($focused) => {
        if ($focused.length > 0 && focusOrder.length > 1) {
          const currentId = $focused[0].id || $focused[0].tagName.toLowerCase()
          const expectedId = focusOrder[focusOrder.length - 2]
          expect(currentId).to.equal(expectedId)
        }
      })
    })

    it('스킵 링크가 정상 작동해야 한다', () => {
      cy.logTestStep('Testing skip link functionality')
      
      // 첫 번째 Tab에서 스킵 링크가 나타나는지 확인
      cy.get('body').tab()
      cy.get('[data-testid="skip-link"], a[href="#main"], .skip-link')
        .should('be.visible')
        .and('contain.text', '메인 콘텐츠로')
        .type('{enter}')
      
      // 메인 콘텐츠로 포커스 이동 확인
      cy.get('#main, [role="main"], main').should('be.focused')
    })

    it('드롭다운 메뉴가 키보드로 조작 가능해야 한다', () => {
      cy.logTestStep('Testing dropdown keyboard interaction')
      
      cy.get('[data-testid="dropdown"], [role="button"][aria-expanded]').then(($dropdown) => {
        if ($dropdown.length > 0) {
          // 드롭다운 열기 (Space/Enter)
          cy.wrap($dropdown).focus().type('{enter}')
          cy.wrap($dropdown).should('have.attr', 'aria-expanded', 'true')
          
          // 화살표 키로 옵션 네비게이션
          cy.get('[role="menuitem"], [role="option"]').first().should('be.focused')
          cy.focused().type('{downarrow}')
          cy.get('[role="menuitem"], [role="option"]').eq(1).should('be.focused')
          
          // ESC로 닫기
          cy.focused().type('{esc}')
          cy.wrap($dropdown).should('have.attr', 'aria-expanded', 'false')
        }
      })
    })
  })

  describe('스크린 리더 지원 검증', () => {
    it('페이지 제목과 제목 구조가 적절해야 한다', () => {
      cy.logTestStep('Testing heading structure for screen readers')
      
      // 페이지 제목 확인
      cy.title().should('not.be.empty').and('not.equal', 'React App')
      
      // 제목 구조 검증 (h1 -> h2 -> h3 순서)
      cy.get('h1').should('have.length.at.least', 1)
      cy.get('h1').first().should('be.visible')
      
      // 제목 레벨이 논리적 순서인지 확인
      cy.checkScreenReaderContent()
    })

    it('폼 요소가 적절한 레이블을 가져야 한다', () => {
      cy.logTestStep('Testing form labels for screen readers')
      
      cy.get('input, textarea, select').each(($input) => {
        const inputId = $input.attr('id')
        const ariaLabel = $input.attr('aria-label')
        const ariaLabelledby = $input.attr('aria-labelledby')
        
        if (inputId) {
          // label[for] 또는 aria-label 또는 aria-labelledby가 있어야 함
          cy.get(`label[for="${inputId}"]`).should('exist')
            .or(() => expect(ariaLabel).to.exist)
            .or(() => expect(ariaLabelledby).to.exist)
        } else {
          // ID가 없으면 aria-label은 반드시 있어야 함
          expect(ariaLabel).to.exist
        }
      })
    })

    it('상태 변화가 스크린 리더에 공지되어야 한다', () => {
      cy.logTestStep('Testing state change announcements')
      
      // 로딩 상태 공지
      cy.get('[data-testid="loading-indicator"]').then(($loading) => {
        if ($loading.length > 0) {
          cy.wrap($loading)
            .should('have.attr', 'aria-live')
            .and('contain.text', '로딩')
        }
      })
      
      // 에러 상태 공지
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      cy.get('[data-testid="error-display"]')
        .should('have.attr', 'role', 'alert')
        .or('have.attr', 'aria-live', 'assertive')
        .or('have.attr', 'aria-live', 'polite')
    })

    it('이미지가 적절한 대체 텍스트를 가져야 한다', () => {
      cy.logTestStep('Testing image alternative text')
      
      cy.get('img').each(($img) => {
        const alt = $img.attr('alt')
        const role = $img.attr('role')
        
        if (role === 'presentation' || role === 'none') {
          // 장식용 이미지: alt=""
          expect(alt).to.equal('')
        } else {
          // 의미있는 이미지: alt 텍스트 필요
          expect(alt).to.exist.and.not.be.empty
        }
      })
    })
  })

  describe('시각적 접근성 검증', () => {
    it('색상 대비가 WCAG AA 기준을 충족해야 한다', () => {
      cy.logTestStep('Testing color contrast ratios')
      
      // axe-core의 color-contrast 규칙으로 자동 검증
      cy.checkAccessibility(null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })

    it('텍스트가 200%까지 확대되어도 읽기 가능해야 한다', () => {
      cy.logTestStep('Testing text scaling to 200%')
      
      // 브라우저 줌 레벨 변경 시뮬레이션 (CSS transform 사용)
      cy.get('body').invoke('attr', 'style', 'zoom: 2.0; transform: scale(2.0)')
      
      // 텍스트가 여전히 읽기 가능한지 확인
      cy.get('h1, h2, h3, p, button, input').each(($element) => {
        cy.wrap($element).should('be.visible')
        
        // 텍스트가 잘리지 않았는지 확인
        cy.wrap($element).then(($el) => {
          const element = $el[0]
          expect(element.scrollWidth).to.be.at.most(element.clientWidth + 5) // 5px 여유
        })
      })
      
      // 원래 크기로 복원
      cy.get('body').invoke('removeAttr', 'style')
    })

    it('포커스 표시가 명확하게 보여야 한다', () => {
      cy.logTestStep('Testing focus indicators visibility')
      
      cy.get('button, input, a').each(($element) => {
        cy.wrap($element).focus()
        
        cy.focused().then(($focused) => {
          const element = $focused[0]
          const computedStyle = window.getComputedStyle(element)
          
          // 포커스 스타일 확인
          const outline = computedStyle.outline
          const boxShadow = computedStyle.boxShadow
          const borderColor = computedStyle.borderColor
          
          // 포커스 표시가 있고 충분히 명확해야 함
          const hasFocusIndicator = (
            outline !== 'none' || 
            boxShadow !== 'none' ||
            borderColor !== 'transparent'
          )
          
          expect(hasFocusIndicator).to.be.true
        })
      })
    })

    it('애니메이션이 접근성 설정을 고려해야 한다', () => {
      cy.logTestStep('Testing animation accessibility')
      
      // prefers-reduced-motion 설정 시뮬레이션
      cy.window().then((win) => {
        // CSS 미디어 쿼리를 통한 애니메이션 감소 설정 확인
        const mediaQuery = win.matchMedia('(prefers-reduced-motion: reduce)')
        
        if (mediaQuery.matches) {
          // 애니메이션이 감소되었는지 확인
          cy.get('[data-testid="animated-element"], .animate, .transition').each(($element) => {
            cy.wrap($element).then(($el) => {
              const computedStyle = window.getComputedStyle($el[0])
              const animationDuration = computedStyle.animationDuration
              const transitionDuration = computedStyle.transitionDuration
              
              // 애니메이션이 매우 짧거나 없어야 함
              expect(parseFloat(animationDuration) || 0).to.be.at.most(0.1)
              expect(parseFloat(transitionDuration) || 0).to.be.at.most(0.1)
            })
          })
        }
      })
    })
  })

  describe('에러 상태 접근성', () => {
    it('에러 메시지가 접근성을 고려하여 표시되어야 한다', () => {
      cy.logTestStep('Testing error message accessibility')
      
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 에러 메시지 접근성 속성 확인
      cy.get('[data-testid="error-display"]')
        .should('have.attr', 'role', 'alert')
        .and('be.visible')
      
      // 에러 메시지가 스크린 리더로 읽기 가능한지 확인
      cy.get('[data-testid="error-display"]')
        .should('contain.text', '오류')
        .and('not.have.css', 'display', 'none')
        .and('not.have.css', 'visibility', 'hidden')
      
      // 재시도 버튼 접근성
      cy.get('[data-testid="retry-button"]')
        .should('have.attr', 'type', 'button')
        .and('be.visible')
        .and('not.have.attr', 'disabled')
      
      // 키보드로 재시도 버튼 접근
      cy.get('[data-testid="retry-button"]').focus().type('{enter}')
    })

    it('폼 유효성 검사 에러가 접근성을 준수해야 한다', () => {
      cy.logTestStep('Testing form validation error accessibility')
      
      // 폼이 있는 페이지로 이동 (있는 경우)
      cy.get('form').then(($form) => {
        if ($form.length > 0) {
          // 유효하지 않은 데이터로 폼 제출
          cy.get('form input[required]').first().clear()
          cy.get('form button[type="submit"]').click()
          
          // 유효성 검사 에러 메시지 확인
          cy.get('[data-testid*="error"], .error, [aria-invalid="true"]')
            .should('exist')
            .and('be.visible')
          
          // 에러와 폼 필드 연결 확인
          cy.get('input[aria-invalid="true"]').should('exist')
          cy.get('[role="alert"], [aria-live]').should('exist')
        }
      })
    })
  })

  describe('모바일 접근성', () => {
    it('모바일 뷰포트에서 터치 타겟 크기가 적절해야 한다', () => {
      cy.logTestStep('Testing mobile touch target sizes')
      
      // 모바일 뷰포트로 변경
      cy.viewport(375, 667)
      
      // 터치 타겟 크기 확인 (최소 44x44px)
      cy.get('button, a, input[type="checkbox"], input[type="radio"]').each(($element) => {
        cy.wrap($element).then(($el) => {
          const rect = $el[0].getBoundingClientRect()
          expect(rect.width).to.be.at.least(44, 'Touch target should be at least 44px wide')
          expect(rect.height).to.be.at.least(44, 'Touch target should be at least 44px tall')
        })
      })
    })

    it('모바일에서 스크린 리더 제스처가 작동해야 한다', () => {
      cy.logTestStep('Testing mobile screen reader gestures')
      
      cy.viewport(375, 667)
      
      // 스와이프 제스처 시뮬레이션 (실제로는 더 복잡한 구현 필요)
      cy.get('body').trigger('touchstart', { touches: [{ clientX: 100, clientY: 300 }] })
      cy.get('body').trigger('touchmove', { touches: [{ clientX: 200, clientY: 300 }] })
      cy.get('body').trigger('touchend')
      
      // 포커스 이동 확인
      cy.focused().should('exist')
    })
  })
})