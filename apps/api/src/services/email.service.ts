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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 60px; text-align: center;">
              <img src="${this.APP_URL}/logo.png" alt="${this.APP_NAME}" style="height: 60px; margin-bottom: 20px; border-radius: 8px;" />
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Email Verification</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 60px;">
              ${name ? `<p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${name},</p>` : ''}
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Thank you for signing up with <strong>${this.APP_NAME}</strong>! To complete your registration, please verify your email address using the code below:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="color: #ffffff; font-size: 14px; font-weight: 500; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; display: inline-block;">
                  <span style="color: #667eea; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <strong>Important:</strong> This code will expire in 10 minutes for security reasons.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                If you didn't request this verification code, please ignore this email or contact our support team if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 60px; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} ${this.APP_NAME}. All rights reserved.<br/>
                This is an automated email, please do not reply.
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 60px; text-align: center;">
              <img src="${this.APP_URL}/logo.png" alt="${this.APP_NAME}" style="height: 60px; margin-bottom: 20px; border-radius: 8px;" />
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Welcome to ${this.APP_NAME}! </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 60px;">
              <p style="color: #333333; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${name}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your email has been successfully verified! Welcome to the ${this.APP_NAME} family. We're thrilled to have you on board! 
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                With ${this.APP_NAME}, you can create amazing video clips with AI-powered features. Here's what you can do:
              </p>
              
              <!-- Features List -->
              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 30px; margin: 30px 0;">
                <div style="margin-bottom: 20px;">
                  <span style="font-size: 24px; margin-right: 10px;"></span>
                  <strong style="color: #333333; font-size: 16px;">AI-Powered Clip Generation</strong>
                  <p style="color: #666666; font-size: 14px; margin: 5px 0 0 34px;">Automatically generate engaging clips from your videos</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <span style="font-size: 24px; margin-right: 10px;"></span>
                  <strong style="color: #333333; font-size: 16px;">Smart Video Processing</strong>
                  <p style="color: #666666; font-size: 14px; margin: 5px 0 0 34px;">Advanced video editing and processing tools</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <span style="font-size: 24px; margin-right: 10px;"></span>
                  <strong style="color: #333333; font-size: 16px;">Auto Subtitles</strong>
                  <p style="color: #666666; font-size: 14px; margin: 5px 0 0 34px;">Generate accurate subtitles automatically</p>
                </div>
                
                <div>
                  <span style="font-size: 24px; margin-right: 10px;"></span>
                  <strong style="color: #333333; font-size: 16px;">Free Credits</strong>
                  <p style="color: #666666; font-size: 14px; margin: 5px 0 0 34px;">Start with 10 free credits to try our features</p>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${this.APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                  Get Started Now →
                </a>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                Need help getting started? Check out our <a href="${this.APP_URL}/help" style="color: #667eea; text-decoration: none;">Help Center</a> or reach out to our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 60px; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0 0 10px; text-align: center;">
                © ${new Date().getFullYear()} ${this.APP_NAME}. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                <a href="${this.APP_URL}" style="color: #667eea; text-decoration: none; margin: 0 10px;">Website</a> |
                <a href="${this.APP_URL}/help" style="color: #667eea; text-decoration: none; margin: 0 10px;">Help Center</a> |
                <a href="${this.APP_URL}/settings" style="color: #667eea; text-decoration: none; margin: 0 10px;">Settings</a>
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
