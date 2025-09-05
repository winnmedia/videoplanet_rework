'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import styles from '@/styles/home.module.scss'
// Temporarily removed image optimization module for E2E testing
// import { getOptimizedImageProps, IMAGE_OPTIMIZATION_CONFIGS } from '@/shared/lib/image-optimization'

export default function Home() {
  const router = useRouter()
  
  // 랜딩 페이지에서만 특별한 레이아웃 적용
  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => {
      document.body.classList.remove('landing-page')
    }
  }, [])

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <Image 
              src="/images/Common/logo.svg" 
              alt="VLANET" 
              width={140} 
              height={40}
              priority
              style={{ width: 'auto', height: '40px' }}
            />
          </div>
          <nav className={styles.nav}>
            <div className={styles.social}>
              <a
                href="https://www.youtube.com/channel/UC33mItthSPySgXc24SiXH2A"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.youtube}
                aria-label="VLANET 유튜브 채널 방문"
              >
                <span className="sr-only">유튜브</span>
              </a>
              <a
                href="https://www.instagram.com/vlanet_official/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.instagram}
                aria-label="VLANET 인스타그램 방문"
              >
                <span className="sr-only">인스타그램</span>
              </a>
            </div>
            <button onClick={() => router.push('/login')} className={styles.loginBtn}>
              로그인
            </button>
          </nav>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        {/* 비주얼 섹션 */}
        <section className={styles.visual}>
          <div className={styles.visualInner}>
            <div className={styles.textContent}>
              <h1>
                영상 콘텐츠<br />
                협업의 신.세.계<br />
                <span className={styles.highlight}>브이래닛으로</span><br />
                <span className={styles.highlight}>당장 이주하세요!</span>
              </h1>
              <p>
                쉽고 정확한 영상 피드백 툴<br />
                한 눈에 파악할 수 있는 프로젝트 진행 단계<br />
                다양한 문서 양식으로 영상 제작 전문성 UP!
              </p>
            </div>
            <div className={styles.visualImage}>
              <Image 
                src="/images/Home/new/visual-img.png"
                alt="브이래닛 플랫폼 메인 비주얼"
                width={600}
                height={400}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              />
            </div>
          </div>
        </section>

        {/* 텍스트박스 섹션 */}
        <section className={styles.textbox}>
          <Image 
            src="/images/Home/new/tool02.png"
            alt="다양한 협업 도구들 일러스트"
            width={420}
            height={300}
            className={styles.toolImage}
            style={{ width: 'auto', height: '300px' }}
            sizes="(max-width: 768px) 100vw, 420px"
          />
          <h2>번거로운 n가지 툴 사용은 이제 그만,</h2>
          <p>
            영상 편집 피드백, 프로젝트 관리가 까다로우셨나요?<br />
            이제는 <span className={styles.brandName}>&apos;브이래닛&apos;</span>로 쉬워집니다
          </p>
        </section>

        {/* Easy Feedback 섹션 */}
        <section className={styles.feature}>
          <div className={styles.featureInner}>
            <h2>Easy Feedback</h2>
            <div className={styles.featureContent}>
              <div className={styles.featureText}>
                <h3>
                  <span className={styles.emphasis}>쉽고, 정확하고, 편한</span>
                  영상 피드백
                </h3>
                <p>
                  영상을 같이 보며 정확하게 피드백하고 전문성을 높여보세요! 
                  영상 수정 횟수가 절반으로 줄어들어요.
                </p>
                <p>
                  영상 피드백은 익명일 때 가장 효과적입니다. 
                  이제 익명으로 피드백해보세요!
                </p>
                <button 
                  onClick={() => router.push('/feedback/demo')} 
                  className={styles.ctaButton}
                  aria-label="영상 피드백 데모 체험하기"
                >
                  데모 체험하기
                </button>
              </div>
              <div className={styles.featureImage}>
                <Image 
                  src="/images/Home/new/feedback-img.png"
                  alt="영상 피드백 기능 예시 화면"
                  width={600}
                  height={400}
                  style={{ width: 'auto', height: '400px' }}
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Project Management 섹션 */}
        <section className={styles.feature}>
          <div className={`${styles.featureInner} ${styles.reverse}`}>
            <h2>Project Management</h2>
            <div className={styles.featureContent}>
              <div className={styles.featureText}>
                <h3>
                  <span className={styles.emphasis}>조연출이 필요없는</span>
                  프로젝트 관리
                </h3>
                <p>
                  오늘 어떤 프로젝트가 진행되는지 쉽게 추적하고, 
                  앞으로 해야 할 일이 무엇인지 정확하게 알려줍니다.
                </p>
                <button 
                  onClick={() => router.push('/features#project')} 
                  className={styles.ctaButton}
                  aria-label="프로젝트 관리 기능 상세보기"
                >
                  기능 상세보기
                </button>
              </div>
              <div className={styles.featureImage}>
                <Image 
                  src="/images/Home/new/project-img.png"
                  alt="프로젝트 관리 대시보드 화면"
                  width={600}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Contents 섹션 */}
        <section className={styles.feature}>
          <div className={styles.featureInner}>
            <h2>Contents</h2>
            <div className={styles.featureContent}>
              <div className={styles.featureText}>
                <h3>
                  <span className={styles.emphasis}>상세하고 체계적으로</span>
                  비법으로 학습
                </h3>
                <p>
                  주먹구구식 작업은 이제 그만하세요!<br />
                  체계적으로 영상을 만드는 방법을 알려드려요.<br />
                  고수의 제작 방법을 이용해보세요!
                </p>
                <button 
                  onClick={() => router.push('/login')} 
                  className={styles.ctaButton}
                  aria-label="콘텐츠 학습 시작하기"
                >
                  바로가기
                </button>
              </div>
              <div className={styles.featureImage}>
                <Image 
                  src="/images/Home/new/contents-img.png"
                  alt="콘텐츠 학습 기능 예시"
                  width={600}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Brand Identity 섹션 */}
        <section className={styles.identity}>
          <div className={styles.identityInner}>
            <h2>Brand Identity</h2>
            <div className={styles.identityGrid}>
              <div className={styles.identityItem}>
                <div className={styles.identityImage}>
                  <Image 
                    src="/images/Home/new/identity-img.png"
                    alt="Easy Management"
                    width={300}
                    height={200}
                    sizes="(max-width: 768px) 50vw, 300px"
                    loading="lazy"
                  />
                </div>
                <div className={styles.identityText}>Easy Management</div>
              </div>
              <div className={styles.identityItem}>
                <div className={styles.identityImage}>
                  <Image 
                    src="/images/Home/new/identity-img02.png" 
                    alt="Fast and Accurate Feedback" 
                    width={300} 
                    height={200}
                    loading="lazy"
                  />
                </div>
                <div className={styles.identityText}>Fast and Accurate Feedback</div>
              </div>
              <div className={styles.identityItem}>
                <div className={styles.identityImage}>
                  <Image 
                    src="/images/Home/new/identity-img03.png" 
                    alt="Study Together" 
                    width={300} 
                    height={200}
                    loading="lazy"
                  />
                </div>
                <div className={styles.identityText}>Study Together</div>
              </div>
              <div className={styles.identityItem}>
                <div className={styles.identityImage}>
                  <Image 
                    src="/images/Home/new/identity-img04.png" 
                    alt="Convenient Meeting" 
                    width={300} 
                    height={200}
                    loading="lazy"
                  />
                </div>
                <div className={styles.identityText}>Convenient Meeting</div>
              </div>
            </div>
          </div>
        </section>

        {/* Background 섹션 */}
        <section className={styles.background}>
          <div className={styles.backgroundInner}>
            <h2>Background</h2>
            
            {/* Story 01 */}
            <div className={styles.storyGroup}>
              <div className={styles.storyNumber}>
                <div className={styles.number}>01</div>
                <div className={styles.storyText}>
                  서로 다른 프로그램을<br />
                  써가며 번거롭게 나누던
                  <strong>
                    콘텐츠 제작 협업에 대한<br />
                    새로운 답을 제시합니다
                  </strong>
                </div>
              </div>
              <div className={styles.personas}>
                <div className={styles.persona}>
                  <div className={styles.avatar}>
                    <Image 
                      src="/images/Home/emoji01.png" 
                      alt="영상 디자이너 L 아바타" 
                      width={100} 
                      height={100}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.dialogue}>
                    <div className={styles.name}>
                      <Image 
                        src="/images/Home/chat_icon.png" 
                        alt="" 
                        width={30} 
                        height={30}
                        loading="lazy"
                      />
                      영상 디자이너 L
                    </div>
                    <p>
                      피드백을 이해하기가 어려워..<br />
                      <strong>한 눈에 빠르고 쉽게 파악할 수 있는 툴은 없을까?</strong>
                    </p>
                  </div>
                </div>
                <div className={styles.persona}>
                  <div className={styles.avatar}>
                    <Image 
                      src="/images/Home/emoji03.png" 
                      alt="콘텐츠 기획자 P 아바타" 
                      width={100} 
                      height={100}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.dialogue}>
                    <div className={styles.name}>
                      <Image 
                        src="/images/Home/chat_icon.png" 
                        alt="" 
                        width={30} 
                        height={30}
                        loading="lazy"
                      />
                      콘텐츠 기획자 P
                    </div>
                    <p>
                      파워포인트, 그림판, 한글.. 이런 프로그램 말고,<br />
                      <strong>영상 콘텐츠 협업만을 위한 툴은 없을까?</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Story 02 */}
            <div className={styles.storyGroup}>
              <div className={styles.storyNumber}>
                <div className={styles.number}>02</div>
                <div className={styles.storyText}>
                  주먹구구식 영상 제작은<br />
                  이제 그만 !
                  <strong>
                    정확하고 빠른 업무체계로<br />
                    영상 제작에 투입되는 노력과<br />
                    시간을 줄일 수 있습니다.
                  </strong>
                </div>
              </div>
              <div className={styles.personas}>
                <div className={styles.persona}>
                  <div className={styles.avatar}>
                    <Image 
                      src="/images/Home/emoji02.png" 
                      alt="영상 제작 꿈나무 K 아바타" 
                      width={100} 
                      height={100}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.dialogue}>
                    <div className={styles.name}>
                      <Image 
                        src="/images/Home/chat_icon.png" 
                        alt="" 
                        width={30} 
                        height={30}
                        loading="lazy"
                      />
                      영상 제작 꿈나무 K
                    </div>
                    <p>
                      어떻게 영상 제작을 시작해야 할지 모르겠어..<br />
                      <strong>전문가가 꼼꼼하게 알려주는 클래스 없을까?</strong>
                    </p>
                  </div>
                </div>
                <div className={styles.persona}>
                  <div className={styles.avatar}>
                    <Image 
                      src="/images/Home/emoji04.png" 
                      alt="영상디자인학과 학생 J 아바타" 
                      width={100} 
                      height={100}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.dialogue}>
                    <div className={styles.name}>
                      <Image 
                        src="/images/Home/chat_icon.png" 
                        alt="" 
                        width={30} 
                        height={30}
                        loading="lazy"
                      />
                      영상디자인학과 학생 J
                    </div>
                    <p>
                      현장에서는 영상을 어떻게 제작할까?<br />
                      <strong>실무 스킬, 콘텐츠 제작 프로세스를 배우고 싶어..</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Video 섹션 */}
        <section className={styles.video}>
          <div className={styles.videoInner}>
            <h2>
              How to get started<br />
              with Vlanet
            </h2>
            <div className={styles.videoWrapper}>
              <iframe
                width="1000"
                height="461"
                src="https://www.youtube.com/embed/nBH02NxZRfI"
                title="실제 고객이 말하는 세이프홈즈, 고객의 리얼 스토리"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </section>

        {/* End 섹션 */}
        <section className={styles.end}>
          <div className={styles.endInner}>
            <div className={styles.endText}>
              세상 모든<br />
              크리에이터들의<br />
              <span className={styles.highlight}>행복한 행성을</span><br />
              <span className={styles.highlight}>만들어 갑니다.</span>
            </div>
            <div className={styles.endImage}>
              <Image 
                src="/images/Home/new/end-img.png" 
                alt="크리에이터들의 행성 일러스트" 
                width={500} 
                height={400}
                loading="lazy"
              />
            </div>
          </div>
          <div className={styles.slogan}>
            SAVE THE CREATORS 
            <Image 
              src="/images/Home/new/end-img02.png" 
              alt="VLANET 브랜드 로고" 
              width={100} 
              height={40}
              loading="lazy"
            />
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.companyInfo}>
            <div className={styles.footerLogo}>vlanet</div>
            <ul className={styles.details}>
              <li>윈앤미디어</li>
              <li>대전광역시 서구 청사로 228 청사오피스</li>
              <li>사업자등록번호 : 725-08-01986</li>
              <li>대표자 : 유석근</li>
              <li>전화번호 : 000-000-0000</li>
            </ul>
            <div className={styles.legal}>
              <button onClick={() => router.push('/Terms')}>이용약관</button>
              <button onClick={() => router.push('/Privacy')}>개인정보 취급방침</button>
            </div>
          </div>
          <div className={styles.socialLinks}>
            <a
              href="https://www.youtube.com/channel/UC33mItthSPySgXc24SiXH2A"
              target="_blank"
              rel="noopener noreferrer"
            >
              유튜브
            </a>
            <a
              href="https://www.instagram.com/vlanet_official/"
              target="_blank"
              rel="noopener noreferrer"
            >
              인스타그램
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}