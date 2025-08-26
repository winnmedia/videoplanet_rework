'use client'

import { LoginForm } from '@/features/auth'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  
  return (
    <div className="user" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', height: '100vh' }}>
      {/* Left Side - Intro */}
      <div className="intro" style={{
        height: '100%',
        padding: '50px',
        position: 'relative',
        background: 'url("/images/User/bg.png") no-repeat center/cover',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div className="intro_wrap">
          <div className="logo">
            <Image src="/logo.svg" alt="VRidge" width={120} height={40} />
          </div>
          <div className="slogun" style={{
            color: '#fff',
            fontSize: '57px',
            lineHeight: '1.24',
            marginTop: '30px'
          }}>
            비디오 리뷰의<br />
            <span style={{ fontWeight: 'bold' }}>새로운 기준</span>
          </div>
        </div>
        
        <div className="etc" style={{
          padding: '0 0',
          color: '#fff'
        }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>실시간 타임스탬프 피드백</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>팀 협업 최적화</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>프로젝트 버전 관리</li>
          </ul>
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="form" style={{
        height: '100%',
        position: 'relative',
        background: '#fcfcfc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="form_wrap" style={{
          width: '400px',
          padding: '40px'
        }}>
          <h1 className="title" style={{
            fontSize: '36px',
            color: '#000',
            textAlign: 'center',
            marginBottom: '40px',
            fontWeight: 'bold'
          }}>
            로그인
          </h1>
          
          <LoginForm />
          
          <div className="line" style={{
            margin: '40px 0',
            background: '#e6e6e6',
            height: '1px',
            position: 'relative'
          }}>
            <span style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#fcfcfc',
              padding: '4px 16px',
              color: '#919191',
              fontSize: '15px'
            }}>Or Sign Up With</span>
          </div>
          
          {/* SNS 로그인 버튼들 */}
          <div className="sns_login" style={{ textAlign: 'center' }}>
            <ul style={{ display: 'flex', justifyContent: 'center', gap: '20px', listStyle: 'none', padding: 0, margin: 0 }}>
              <li 
                style={{
                  width: '50px',
                  height: '50px',
                  border: '1px solid #e6e6e6',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: 'url("/images/User/google_icon.svg") no-repeat center',
                  backgroundSize: '24px',
                  textIndent: '-9999px'
                }}
                onClick={() => console.log('Google login')}
              >
                구글 로그인
              </li>
              <li 
                style={{
                  width: '50px',
                  height: '50px',
                  border: '1px solid #e6e6e6',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: 'url("/images/User/kakao_icon.svg") no-repeat center',
                  backgroundSize: '26px',
                  textIndent: '-9999px'
                }}
                onClick={() => console.log('Kakao login')}
              >
                카카오 로그인
              </li>
              <li 
                style={{
                  width: '50px',
                  height: '50px',
                  border: '1px solid #e6e6e6',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: 'url("/images/User/naver_icon.svg") no-repeat center',
                  backgroundSize: '20px',
                  textIndent: '-9999px'
                }}
                onClick={() => console.log('Naver login')}
              >
                네이버 로그인
              </li>
            </ul>
          </div>
          
          <div className="signup_link tc" style={{ textAlign: 'center', marginTop: '20px' }}>
            계정이 없으신가요?
            <span 
              onClick={() => router.push('/signup')}
              style={{
                display: 'inline-block',
                marginLeft: '10px',
                color: '#0058da',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              회원가입
            </span>
          </div>
          
          <div className="find_link tc" style={{
            color: '#919191',
            marginTop: '15px',
            cursor: 'pointer',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            비밀번호를 잊으셨나요?
          </div>
        </div>
      </div>
    </div>
  )
}