import sgMail from '@sendgrid/mail'

// SendGrid API 키 설정
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface EmailTemplateData {
  to: string
  subject: string
  html: string
}

export class EmailService {
  private static fromEmail = process.env.FROM_EMAIL || 'service@vlanet.net'

  static async sendEmail({ to, subject, html }: EmailTemplateData): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email not sent.')
      return
    }

    const msg = {
      to,
      from: this.fromEmail,
      subject,
      html,
    }

    try {
      await sgMail.send(msg)
      console.log(`Email sent successfully to ${to}`)
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  static async sendVerificationCode(email: string, code: string): Promise<void> {
    const subject = '🚀 VLANET 이메일 인증 - 비디오 피드백 플랫폼에 오신 것을 환영합니다!'
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VLANET 이메일 인증</title>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          
          <!-- Header with gradient background -->
          <div style="background: linear-gradient(135deg, #1631F8 0%, #4F46E5 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.7;"></div>
            <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
            
            <img src="https://videoplanet-vlanets-projects.vercel.app/images/Common/logo.svg" alt="VLANET" style="height: 48px; margin-bottom: 20px; filter: brightness(0) invert(1);">
            
            <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              이메일 인증
            </h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              Video Feedback Platform
            </p>
          </div>

          <!-- Main content -->
          <div style="padding: 50px 40px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
                <span style="font-size: 40px;">🎬</span>
              </div>
              
              <h2 style="color: #2D3748; font-size: 28px; margin: 0 0 20px 0; font-weight: 600;">
                환영합니다!
              </h2>
              
              <p style="font-size: 18px; color: #4A5568; line-height: 1.8; margin: 0 0 30px 0;">
                <strong>VLANET</strong>은 혁신적인 비디오 피드백 플랫폼입니다.<br>
                실시간 협업과 스마트한 피드백으로 창작의 새로운 경험을 시작하세요.
              </p>
            </div>

            <!-- Verification Code Section -->
            <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); border-radius: 20px; padding: 40px; text-align: center; border: 2px solid #E2E8F0; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; background: linear-gradient(45deg, #FF6B6B, #4ECDC4); border-radius: 50%; opacity: 0.3;"></div>
              <div style="position: absolute; bottom: 10px; left: 10px; width: 20px; height: 20px; background: linear-gradient(45deg, #4ECDC4, #45B7D1); border-radius: 50%; opacity: 0.3;"></div>
              
              <p style="font-size: 16px; color: #718096; margin: 0 0 20px 0; font-weight: 500;">
                아래 6자리 인증번호를 입력해주세요
              </p>
              
              <div style="background: linear-gradient(135deg, #1631F8, #4F46E5); 
                          color: white; font-size: 42px; font-weight: 800; 
                          padding: 25px; border-radius: 16px; letter-spacing: 12px; 
                          margin: 20px 0; box-shadow: 0 10px 25px rgba(22, 49, 248, 0.3);
                          font-family: 'Courier New', monospace;">
                ${code}
              </div>
              
              <div style="display: flex; align-items: center; justify-content: center; margin-top: 25px;">
                <div style="background: #FED7D7; color: #C53030; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                  ⏰ 10분 후 만료
                </div>
              </div>
            </div>

            <!-- Features Preview -->
            <div style="margin: 40px 0; padding: 30px; background: #F7FAFC; border-radius: 16px;">
              <h3 style="color: #2D3748; font-size: 20px; margin: 0 0 20px 0; text-align: center; font-weight: 600;">
                🎯 VLANET으로 할 수 있는 것들
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; align-items: center; padding: 12px;">
                  <div style="background: #4ECDC4; width: 8px; height: 8px; border-radius: 50%; margin-right: 12px;"></div>
                  <span style="color: #4A5568; font-size: 16px;">실시간 비디오 피드백 및 협업</span>
                </div>
                <div style="display: flex; align-items: center; padding: 12px;">
                  <div style="background: #FF6B6B; width: 8px; height: 8px; border-radius: 50%; margin-right: 12px;"></div>
                  <span style="color: #4A5568; font-size: 16px;">AI 기반 스마트 피드백 분석</span>
                </div>
                <div style="display: flex; align-items: center; padding: 12px;">
                  <div style="background: #45B7D1; width: 8px; height: 8px; border-radius: 50%; margin-right: 12px;"></div>
                  <span style="color: #4A5568; font-size: 16px;">프로젝트 관리 및 버전 컨트롤</span>
                </div>
              </div>
            </div>

            <!-- Security Notice -->
            <div style="background: #FFF5F5; border-left: 4px solid #F56565; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <p style="color: #742A2A; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>🔒 보안 안내:</strong> 본인이 요청하지 않은 경우, 이 메일을 무시하고 
                <a href="mailto:security@vlanet.net" style="color: #1631F8;">security@vlanet.net</a>으로 신고해주세요.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://videoplanet-vlanets-projects.vercel.app/signup" 
                 style="display: inline-block; background: linear-gradient(135deg, #1631F8, #4F46E5); 
                        color: white; text-decoration: none; padding: 16px 40px; 
                        border-radius: 50px; font-size: 18px; font-weight: 600;
                        box-shadow: 0 10px 25px rgba(22, 49, 248, 0.3);
                        transition: transform 0.3s ease;">
                🚀 회원가입 계속하기
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2D3748; color: #A0AEC0; padding: 30px 40px; text-align: center;">
            <img src="https://videoplanet-vlanets-projects.vercel.app/images/Common/logo.svg" alt="VLANET" style="height: 32px; margin-bottom: 20px; filter: brightness(0) invert(1); opacity: 0.7;">
            
            <p style="font-size: 16px; margin: 0 0 15px 0; color: #E2E8F0;">
              <strong>VLANET</strong> - Video Feedback Platform
            </p>
            
            <div style="border-top: 1px solid #4A5568; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 12px; margin: 0; opacity: 0.7;">
                © 2025 VLANET. 모든 권리 보유.<br>
                이 메일은 service@vlanet.net에서 발송되었습니다.
              </p>
            </div>
            
            <div style="margin-top: 15px;">
              <a href="https://videoplanet-vlanets-projects.vercel.app" style="color: #4ECDC4; text-decoration: none; font-size: 12px; margin: 0 10px;">홈페이지</a>
              <span style="color: #4A5568;">|</span>
              <a href="mailto:support@vlanet.net" style="color: #4ECDC4; text-decoration: none; font-size: 12px; margin: 0 10px;">고객지원</a>
              <span style="color: #4A5568;">|</span>
              <a href="https://videoplanet-vlanets-projects.vercel.app/privacy" style="color: #4ECDC4; text-decoration: none; font-size: 12px; margin: 0 10px;">개인정보처리방침</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    
    await this.sendEmail({ to: email, subject, html })
  }

  static async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = '🔐 VLANET 비밀번호 재설정 - 보안 인증번호'
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VLANET 비밀번호 재설정</title>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          
          <!-- Header with security theme -->
          <div style="background: linear-gradient(135deg, #F56565 0%, #E53E3E 100%); padding: 40px 20px; text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -30px; right: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.7;"></div>
            <div style="position: absolute; bottom: -40px; left: -40px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.5;"></div>
            
            <img src="https://videoplanet-vlanets-projects.vercel.app/images/Common/logo.svg" alt="VLANET" style="height: 48px; margin-bottom: 20px; filter: brightness(0) invert(1);">
            
            <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              비밀번호 재설정
            </h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              보안 인증 요청
            </p>
          </div>

          <!-- Main content -->
          <div style="padding: 50px 40px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #F56565, #FC8181); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
                <span style="font-size: 40px;">🔐</span>
              </div>
              
              <h2 style="color: #2D3748; font-size: 28px; margin: 0 0 20px 0; font-weight: 600;">
                비밀번호 재설정 요청
              </h2>
              
              <p style="font-size: 18px; color: #4A5568; line-height: 1.8; margin: 0 0 30px 0;">
                <strong>${email}</strong> 계정의 비밀번호 재설정을 요청하셨습니다.<br>
                아래 인증번호를 입력하여 새로운 비밀번호를 설정하세요.
              </p>
            </div>

            <!-- Verification Code Section -->
            <div style="background: linear-gradient(135deg, #FFF5F5, #FED7D7); border-radius: 20px; padding: 40px; text-align: center; border: 2px solid #FEB2B2; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; background: linear-gradient(45deg, #F56565, #FC8181); border-radius: 50%; opacity: 0.3;"></div>
              <div style="position: absolute; bottom: 10px; left: 10px; width: 20px; height: 20px; background: linear-gradient(45deg, #FC8181, #F687B3); border-radius: 50%; opacity: 0.3;"></div>
              
              <p style="font-size: 16px; color: #742A2A; margin: 0 0 20px 0; font-weight: 600;">
                보안 인증번호
              </p>
              
              <div style="background: linear-gradient(135deg, #F56565, #E53E3E); 
                          color: white; font-size: 42px; font-weight: 800; 
                          padding: 25px; border-radius: 16px; letter-spacing: 12px; 
                          margin: 20px 0; box-shadow: 0 10px 25px rgba(245, 101, 101, 0.4);
                          font-family: 'Courier New', monospace;">
                ${code}
              </div>
              
              <div style="display: flex; align-items: center; justify-content: center; margin-top: 25px;">
                <div style="background: #FED7D7; color: #C53030; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  ⏰ 10분 후 만료
                </div>
              </div>
            </div>

            <!-- Security Alert -->
            <div style="background: #FFF5F5; border: 2px solid #FEB2B2; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
              <h3 style="color: #742A2A; font-size: 20px; margin: 0 0 15px 0; font-weight: 600;">
                중요한 보안 안내
              </h3>
              <p style="color: #742A2A; font-size: 16px; margin: 0; line-height: 1.6;">
                <strong>본인이 요청하지 않았다면</strong> 즉시 다음 조치를 취해주세요:<br>
                1. 이 이메일을 무시하세요<br>
                2. <a href="mailto:security@vlanet.net" style="color: #E53E3E; font-weight: 600;">security@vlanet.net</a>으로 신고하세요<br>
                3. 계정 보안을 위해 비밀번호를 변경하세요
              </p>
            </div>

            <!-- Reset Instructions -->
            <div style="background: #F7FAFC; border-radius: 16px; padding: 30px; margin: 30px 0;">
              <h3 style="color: #2D3748; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                📋 비밀번호 재설정 단계
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; align-items: flex-start; padding: 12px;">
                  <div style="background: #4299E1; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</div>
                  <span style="color: #4A5568; font-size: 16px;">위의 6자리 인증번호를 복사하세요</span>
                </div>
                <div style="display: flex; align-items: flex-start; padding: 12px;">
                  <div style="background: #4299E1; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</div>
                  <span style="color: #4A5568; font-size: 16px;">비밀번호 재설정 페이지에 인증번호를 입력하세요</span>
                </div>
                <div style="display: flex; align-items: flex-start; padding: 12px;">
                  <div style="background: #4299E1; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</div>
                  <span style="color: #4A5568; font-size: 16px;">새로운 비밀번호를 설정하세요 (8자 이상 권장)</span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://videoplanet-vlanets-projects.vercel.app/reset-password" 
                 style="display: inline-block; background: linear-gradient(135deg, #F56565, #E53E3E); 
                        color: white; text-decoration: none; padding: 16px 40px; 
                        border-radius: 50px; font-size: 18px; font-weight: 600;
                        box-shadow: 0 10px 25px rgba(245, 101, 101, 0.3);
                        transition: transform 0.3s ease;">
                🔐 비밀번호 재설정하기
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2D3748; color: #A0AEC0; padding: 30px 40px; text-align: center;">
            <img src="https://videoplanet-vlanets-projects.vercel.app/images/Common/logo.svg" alt="VLANET" style="height: 32px; margin-bottom: 20px; filter: brightness(0) invert(1); opacity: 0.7;">
            
            <p style="font-size: 16px; margin: 0 0 15px 0; color: #E2E8F0;">
              <strong>VLANET</strong> - 보안팀
            </p>
            
            <div style="border-top: 1px solid #4A5568; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 12px; margin: 0; opacity: 0.7;">
                © 2025 VLANET. 모든 권리 보유.<br>
                보안 관련 문의: security@vlanet.net
              </p>
            </div>
            
            <div style="margin-top: 15px;">
              <a href="https://videoplanet-vlanets-projects.vercel.app" style="color: #FC8181; text-decoration: none; font-size: 12px; margin: 0 10px;">홈페이지</a>
              <span style="color: #4A5568;">|</span>
              <a href="mailto:support@vlanet.net" style="color: #FC8181; text-decoration: none; font-size: 12px; margin: 0 10px;">고객지원</a>
              <span style="color: #4A5568;">|</span>
              <a href="https://videoplanet-vlanets-projects.vercel.app/security" style="color: #FC8181; text-decoration: none; font-size: 12px; margin: 0 10px;">보안정책</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    
    await this.sendEmail({ to: email, subject, html })
  }

  // 6자리 랜덤 숫자 생성
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}