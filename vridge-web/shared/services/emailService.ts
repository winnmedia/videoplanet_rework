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
  private static fromEmail = process.env.FROM_EMAIL || 'noreply@vridge.com'

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
    const subject = 'VRidge 이메일 인증번호'
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://your-domain.com/logo.svg" alt="VRidge" style="height: 40px;">
        </div>
        
        <div style="background: #f8f9ff; border-radius: 20px; padding: 40px; text-align: center;">
          <h1 style="color: #0031ff; font-size: 28px; margin-bottom: 20px; font-weight: bold;">
            이메일 인증번호
          </h1>
          
          <p style="font-size: 18px; color: #333; margin-bottom: 30px; line-height: 1.6;">
            안녕하세요! VRidge 서비스를 이용해 주셔서 감사합니다.<br>
            아래 인증번호를 입력하여 이메일 인증을 완료해주세요.
          </p>
          
          <div style="background: #0031ff; color: white; font-size: 36px; font-weight: bold; 
                      padding: 20px; border-radius: 15px; letter-spacing: 8px; margin: 30px 0;">
            ${code}
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            이 인증번호는 10분간 유효합니다.<br>
            본인이 요청하지 않았다면 이 메일을 무시하세요.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 30px; 
                    border-top: 1px solid #eee; color: #999; font-size: 12px;">
          © 2024 VRidge. All rights reserved.
        </div>
      </div>
    `
    
    await this.sendEmail({ to: email, subject, html })
  }

  static async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = 'VRidge 비밀번호 재설정 인증번호'
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="https://your-domain.com/logo.svg" alt="VRidge" style="height: 40px;">
        </div>
        
        <div style="background: #f8f9ff; border-radius: 20px; padding: 40px; text-align: center;">
          <h1 style="color: #0031ff; font-size: 28px; margin-bottom: 20px; font-weight: bold;">
            비밀번호 재설정
          </h1>
          
          <p style="font-size: 18px; color: #333; margin-bottom: 30px; line-height: 1.6;">
            비밀번호 재설정을 위한 인증번호입니다.<br>
            아래 인증번호를 입력하여 새로운 비밀번호를 설정해주세요.
          </p>
          
          <div style="background: #0031ff; color: white; font-size: 36px; font-weight: bold; 
                      padding: 20px; border-radius: 15px; letter-spacing: 8px; margin: 30px 0;">
            ${code}
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            이 인증번호는 10분간 유효합니다.<br>
            본인이 요청하지 않았다면 이 메일을 무시하고 즉시 고객센터로 연락해주세요.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 30px; 
                    border-top: 1px solid #eee; color: #999; font-size: 12px;">
          © 2024 VRidge. All rights reserved.
        </div>
      </div>
    `
    
    await this.sendEmail({ to: email, subject, html })
  }

  // 6자리 랜덤 숫자 생성
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}