'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { SignupForm } from '@/features/auth'

export default function SignupPage() {
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
            <span style={{ fontWeight: 'bold' }}>새로운 시작</span>
          </div>
        </div>
        
        <div className="etc" style={{
          padding: '0 0',
          color: '#fff'
        }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>무료로 시작하는 비디오 협업</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>전문가급 피드백 시스템</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>클라우드 기반 프로젝트 관리</li>
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
            회원가입
          </h1>
          
          <SignupForm />
          
          <div className="signup_link tc" style={{ textAlign: 'center', marginTop: '20px' }}>
            이미 계정이 있으신가요?
            <span 
              onClick={() => router.push('/login')}
              style={{
                display: 'inline-block',
                marginLeft: '10px',
                color: '#0058da',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              로그인
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}