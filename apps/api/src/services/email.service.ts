import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendOTPEmailParams {
  to: string;
  otp: string;
  name?: string;
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
}

export class EmailService {
  private static FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  private static APP_NAME = 'Smart Clip';
  private static APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  /**
   * Send OTP verification email
   */
  static async sendOTPEmail({ to, otp, name }: SendOTPEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to,
        subject: `Your verification code for ${this.APP_NAME}`,
        html: this.generateOTPEmailHTML({ otp, name }),
      });

      if (error) {
        console.error('Error sending OTP email:', error);
        
        if (error.message && error.message.includes('testing emails')) {
          throw new Error('Email service is in testing mode. Please use fbamediallc@gmail.com or verify a domain at resend.com/domains');
        }
        
        throw new Error('Failed to send verification email. Please try again.');
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  static async sendWelcomeEmail({ to, name }: SendWelcomeEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to,
        subject: `Welcome to ${this.APP_NAME}! `,
        html: this.generateWelcomeEmailHTML({ name }),
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        
        if (error.message && error.message.includes('testing emails')) {
          throw new Error('Email service is in testing mode');
        }
        
        throw new Error('Failed to send welcome email');
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Generate beautiful OTP email HTML
   */
  private static generateOTPEmailHTML({ otp, name }: { otp: string; name?: string }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #1a1a1a; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); overflow: hidden; border: 1px solid #2a2a2a;">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); padding: 50px 40px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <img src="https://smartclips.nano-mail.me/logo.png" alt="smartClips Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
              </div>
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">Email Verification</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              ${name ? `<p style="color: #e5e7eb; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">Hi <strong style="color: #60a5fa;">${name}</strong>,</p>` : ''}
              
              <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                Thank you for signing up with <strong style="color: #60a5fa;">${this.APP_NAME}</strong>! To complete your registration, please verify your email address using the code below:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); border-radius: 16px; padding: 40px; text-align: center; margin: 40px 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);">
                <p style="color: #a1a1aa; font-size: 14px; font-weight: 600; margin: 0 0 20px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                <div style="background-color: #18181b; border-radius: 12px; padding: 24px 32px; display: inline-block; border: 2px solid #3f3f46;">
                  <span style="color: #ffffff; font-size: 48px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
                <p style="color: #a1a1aa; font-size: 13px; margin: 20px 0 0; opacity: 0.9;">Enter this code to verify your email</p>
              </div>
              
              <div style="background-color: #27272a; border-left: 4px solid #52525b; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="color: #fbbf24; font-size: 14px; line-height: 1.6; margin: 0; display: flex; align-items: start;">
                  <span style="font-size: 20px; margin-right: 10px;">⚠️</span>
                  <span><strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.</span>
                </p>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px; line-height: 1.7; margin: 30px 0 0;">
                If you didn't request this verification code, please ignore this email or contact our support team if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px 40px; border-top: 1px solid #2a2a2a;">
              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} ${this.APP_NAME}. All rights reserved.<br/>
                <span style="color: #4b5563;">This is an automated email, please do not reply.</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Generate beautiful welcome email HTML
   */
  private static generateWelcomeEmailHTML({ name }: { name: string }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${this.APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #1a1a1a; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); overflow: hidden; border: 1px solid #2a2a2a;">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); padding: 50px 40px; text-align: center;">
              <div style="margin-bottom: 24px;">
                <img src="https://smartclips.nano-mail.me/logo.png" alt="smartClips Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
              </div>
              <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">Welcome to ${this.APP_NAME}! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="color: #e5e7eb; font-size: 20px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong style="color: #60a5fa;">${name}</strong>,
              </p>
              
              <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Your email has been successfully verified! Welcome to the ${this.APP_NAME} family. We're thrilled to have you on board! 🚀
              </p>
              
              <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                With ${this.APP_NAME}, you can create amazing video clips with AI-powered features. Here's what you can do:
              </p>
              
              <!-- Features List -->
              <div style="background-color: #18181b; border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid #3f3f46;">
                <div style="margin-bottom: 24px; display: flex; align-items: start;">
                  <div style="background: linear-gradient(135deg, #52525b 0%, #3f3f46 100%); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0;">
                    <span style="font-size: 24px;">✂️</span>
                  </div>
                  <div>
                    <strong style="color: #e5e7eb; font-size: 17px; display: block; margin-bottom: 8px;">AI-Powered Clip Generation</strong>
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.6;">Automatically generate engaging clips from your videos</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 24px; display: flex; align-items: start;">
                  <div style="background: linear-gradient(135deg, #52525b 0%, #3f3f46 100%); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0;">
                    <span style="font-size: 24px;">🎬</span>
                  </div>
                  <div>
                    <strong style="color: #e5e7eb; font-size: 17px; display: block; margin-bottom: 8px;">Smart Video Processing</strong>
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.6;">Advanced video editing and processing tools</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 24px; display: flex; align-items: start;">
                  <div style="background: linear-gradient(135deg, #52525b 0%, #3f3f46 100%); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0;">
                    <span style="font-size: 24px;">📝</span>
                  </div>
                  <div>
                    <strong style="color: #e5e7eb; font-size: 17px; display: block; margin-bottom: 8px;">Auto Subtitles</strong>
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.6;">Generate accurate subtitles automatically</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0;">
                    <span style="font-size: 24px;">🎁</span>
                  </div>
                  <div>
                    <strong style="color: #e5e7eb; font-size: 17px; display: block; margin-bottom: 8px;">Free Credits</strong>
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.6;">Start with <strong style="color: #10b981;">10 free credits</strong> to try our features</p>
                  </div>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 48px 0 32px;">
                <a href="${this.APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-size: 17px; font-weight: 600; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.4); transition: all 0.3s;">
                  Get Started Now →
                </a>
              </div>
              
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin: 32px 0; border-left: 4px solid #3b82f6;">
                <p style="color: #d1d5db; font-size: 14px; line-height: 1.7; margin: 0;">
                  <strong style="color: #60a5fa;">Need help getting started?</strong><br/>
                  Check out our <a href="${this.APP_URL}/help" style="color: #60a5fa; text-decoration: none; font-weight: 500;">Help Center</a> or reach out to our support team.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px 40px; border-top: 1px solid #2a2a2a;">
              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0 0 12px; text-align: center;">
                © ${new Date().getFullYear()} ${this.APP_NAME}. All rights reserved.
              </p>
              <p style="color: #4b5563; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                <a href="${this.APP_URL}" style="color: #60a5fa; text-decoration: none; margin: 0 12px;">Website</a> |
                <a href="${this.APP_URL}/help" style="color: #60a5fa; text-decoration: none; margin: 0 12px;">Help Center</a> |
                <a href="${this.APP_URL}/settings" style="color: #60a5fa; text-decoration: none; margin: 0 12px;">Settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Generate a random 6-digit OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
