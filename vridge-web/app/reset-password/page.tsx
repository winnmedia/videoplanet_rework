'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ResetPasswordForm } from '@/features/auth'

export default function ResetPasswordPage() {
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
            비밀번호<br />
            <span style={{ fontWeight: 'bold' }}>복구하기</span>
          </div>
        </div>
        
        <div className="etc" style={{
          padding: '0 0',
          color: '#fff'
        }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>안전한 이메일 인증</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>간편한 비밀번호 재설정</li>
            <li style={{ fontSize: '15px', marginTop: '20px', opacity: 0.8 }}>보안 강화 시스템</li>
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
            비밀번호 찾기
          </h1>
          
          <ResetPasswordForm />
          
          <div className="signup_link tc" style={{ textAlign: 'center', marginTop: '20px' }}>
            로그인 화면으로
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
              돌아가기
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}