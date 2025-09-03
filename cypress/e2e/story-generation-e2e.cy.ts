describe('LLM 스토리 개발 시스템 E2E 테스트', () => {
  beforeEach(() => {
    // 스토리 생성 페이지로 이동
    cy.visit('/story-generation');
  });

  it('페이지가 올바르게 로드되어야 한다', () => {
    // 페이지 제목 확인
    cy.contains('LLM 스토리 개발 시스템').should('be.visible');
    
    // 폼 요소들 확인
    cy.get('input[name="title"]').should('be.visible');
    cy.get('textarea[name="briefing"]').should('be.visible');
    cy.get('select[name="genre"]').should('be.visible');
    cy.get('input[name="targetDuration"]').should('be.visible');
    cy.get('input[name="targetAudience"]').should('be.visible');
    cy.get('button[type="submit"]').contains('4막 구조 생성').should('be.visible');
  });

  it('4막 구조 생성이 정상 동작해야 한다', () => {
    // 테스트 데이터 입력
    cy.get('input[name="title"]').type('모험 다큐멘터리');
    cy.get('textarea[name="briefing"]').type(
      '주인공이 미지의 섬을 탐험하며 고대 문명의 비밀을 발견하는 이야기입니다. ' +
      '위험한 상황들을 극복하고 마침내 보물을 찾아내는 모험을 그립니다.'
    );
    cy.get('select[name="genre"]').select('모험');
    cy.get('input[name="targetDuration"]').clear().type('120');
    cy.get('input[name="targetAudience"]').type('20-30대 모험 애호가');

    // 4막 구조 생성 버튼 클릭
    cy.get('button[type="submit"]').click();

    // 로딩 상태 확인
    cy.get('button[type="submit"]').should('contain', '4막 구조 생성 중...');
    cy.get('button[type="submit"]').should('be.disabled');

    // 결과 확인 (5초 내에)
    cy.contains('4막 구조', { timeout: 10000 }).should('be.visible');
    
    // 4개의 막이 생성되었는지 확인
    cy.get('[data-testid="act"]', { timeout: 10000 }).should('have.length', 4);
    
    // 각 막의 정보 확인
    cy.contains('1막').should('be.visible');
    cy.contains('2막').should('be.visible'); 
    cy.contains('3막').should('be.visible');
    cy.contains('4막').should('be.visible');
    
    // 총 길이 정보 확인
    cy.contains('총 길이').should('be.visible');
  });

  it('12샷 상세 계획 생성이 정상 동작해야 한다', () => {
    // 먼저 4막 구조를 생성
    cy.get('input[name="title"]').type('액션 영화');
    cy.get('textarea[name="briefing"]').type('스릴 넘치는 액션 영화 스토리입니다.');
    cy.get('select[name="genre"]').select('액션');
    cy.get('button[type="submit"]').click();

    // 4막 구조 결과를 기다림
    cy.contains('4막 구조', { timeout: 10000 }).should('be.visible');

    // 첫 번째 막의 "12샷 생성" 버튼 클릭
    cy.get('[data-testid="act"]').first().within(() => {
      cy.get('button').contains('12샷 생성').click();
    });

    // 12샷 결과 확인
    cy.contains('12샷 상세 계획', { timeout: 10000 }).should('be.visible');
    
    // 생성된 샷들 확인
    cy.get('[data-testid="shot"]').should('have.length.at.least', 1);
    
    // 샷 정보 확인
    cy.contains('Shot 1').should('be.visible');
    cy.contains('카메라').should('be.visible');
  });

  it('에러 처리가 올바르게 동작해야 한다', () => {
    // 빈 폼으로 제출 시도
    cy.get('button[type="submit"]').click();
    
    // 브라우저의 내장 검증 메시지가 나타나는지 확인
    cy.get('input[name="title"]').then(($input) => {
      expect($input[0].validationMessage).to.not.be.empty;
    });
  });

  it('폼 입력값이 올바르게 처리되어야 한다', () => {
    // 각 입력 필드 테스트
    cy.get('input[name="title"]')
      .type('테스트 제목')
      .should('have.value', '테스트 제목');
    
    cy.get('textarea[name="briefing"]')
      .type('테스트 기획안')
      .should('have.value', '테스트 기획안');
    
    cy.get('select[name="genre"]')
      .select('드라마')
      .should('have.value', '드라마');
    
    cy.get('input[name="targetDuration"]')
      .clear()
      .type('90')
      .should('have.value', '90');
    
    cy.get('input[name="targetAudience"]')
      .type('일반 관객')
      .should('have.value', '일반 관객');
  });

  it('응답 시간이 5초 이내여야 한다', () => {
    const startTime = Date.now();
    
    cy.get('input[name="title"]').type('성능 테스트');
    cy.get('textarea[name="briefing"]').type('응답 시간 테스트용 기획안입니다.');
    cy.get('button[type="submit"]').click();
    
    // 결과가 나타나면 시간 측정
    cy.contains('4막 구조', { timeout: 10000 }).should('be.visible').then(() => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 5초(5000ms) 이내 확인
      expect(responseTime).to.be.lessThan(5000);
    });
  });

  it('생성된 스토리의 데이터 구조가 올바르여야 한다', () => {
    cy.get('input[name="title"]').type('데이터 검증 테스트');
    cy.get('textarea[name="briefing"]').type('스토리 데이터 구조 검증을 위한 테스트입니다.');
    cy.get('button[type="submit"]').click();

    // 4막 구조 결과 대기
    cy.contains('4막 구조', { timeout: 10000 }).should('be.visible');

    // 각 막의 필수 요소들 확인
    cy.get('[data-testid="act"]').each(($act, index) => {
      cy.wrap($act).within(() => {
        // 막 제목 확인
        cy.contains(`${index + 1}막`).should('be.visible');
        
        // 길이 정보 확인
        cy.contains('길이:').should('be.visible');
        
        // 12샷 생성 버튼 확인
        cy.get('button').contains('12샷 생성').should('be.visible');
      });
    });
  });
});

// API 모킹을 위한 설정
beforeEach(() => {
  // Cypress에서 실제 API 호출을 intercept하여 모킹 데이터 반환
  cy.intercept('POST', '/api/story/generate-four-act', {
    statusCode: 200,
    body: {
      structure: {
        projectId: 'test-project-123',
        acts: [
          {
            id: 'act-1',
            title: '도입부 - 상황 설정',
            description: '주인공과 배경 소개',
            duration: 30,
            order: 1
          },
          {
            id: 'act-2', 
            title: '갈등 발생 - 사건의 시작',
            description: '예상치 못한 사건 발생',
            duration: 60,
            order: 2
          },
          {
            id: 'act-3',
            title: '클라이맥스 - 절정의 순간',
            description: '갈등이 최고조에 달함',
            duration: 90,
            order: 3
          },
          {
            id: 'act-4',
            title: '해결 - 마무리',
            description: '갈등 해결 및 마무리',
            duration: 30,
            order: 4
          }
        ],
        totalDuration: 210,
        createdAt: new Date().toISOString()
      },
      qualityMetrics: {
        consistency: 88,
        characterDevelopment: 82,
        narrativeFlow: 90,
        overallScore: 87
      },
      suggestions: [
        '캐릭터의 동기를 더 명확하게 설정하면 좋겠습니다',
        '2막에서 갈등을 더욱 강화할 필요가 있습니다'
      ]
    }
  }).as('generateFourAct');

  cy.intercept('POST', '/api/story/generate-twelve-shot', {
    statusCode: 200,
    body: {
      projectId: 'test-project-123',
      actId: 'act-1',
      shots: [
        {
          id: 'shot-1',
          actId: 'act-1',
          title: '오프닝 샷',
          description: '도시의 전경을 보여주는 와이드 샷',
          duration: 5,
          cameraAngle: '와이드 샷',
          order: 1
        },
        {
          id: 'shot-2',
          actId: 'act-1',
          title: '주인공 등장',
          description: '주인공이 걸어오는 미디움 샷',
          duration: 8,
          cameraAngle: '미디움 샷',
          action: '주인공이 카메라를 향해 걸어온다',
          order: 2
        }
      ],
      totalDuration: 13,
      createdAt: new Date().toISOString()
    }
  }).as('generateTwelveShot');
});