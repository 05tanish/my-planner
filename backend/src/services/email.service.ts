import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

if (resend) {
  console.log('✉️  Resend email client initialized');
} else {
  console.log('✉️  [Resend Not Configured] Email running in mock/log mode');
}

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM || 'DevOS <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      if (error) {
        console.error(`❌ Resend error sending to ${to}:`, error);
      } else {
        console.log(`✉️  Email sent via Resend to ${to}: ${subject}`);
      }
    } catch (err) {
      console.error(`❌ Failed to send email to ${to}:`, err);
    }
  } else {
    // Fallback: log to console in dev without credentials
    console.log(`\n✉️  [EMAIL MOCK] To: ${to}\nSubject: ${subject}\nBody: ${html}\n`);
  }
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 32px; background-color: #0f1115; color: #f0f0f0; border-radius: 12px; border: 1px solid #1e2030;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #4f8cff 0%, #6366f1 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 22px; font-weight: 900; color: white;">D</div>
        <h1 style="color: #ffffff; margin: 12px 0 4px; font-size: 22px;">Welcome to DevOS</h1>
        <p style="color: #888; font-size: 13px; margin: 0;">Your personal developer OS</p>
      </div>
      <p style="color: #ccc; font-size: 15px; line-height: 1.7;">Please verify your email address to activate your DevOS account and access all features.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f8cff, #6366f1); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Verify My Email →</a>
      </div>
      <p style="color: #555; font-size: 12px; text-align: center;">This link expires in 24 hours. If you did not sign up, ignore this email.</p>
    </div>
  `;
  await sendEmail(to, 'Verify your email — DevOS', html);
};

export const sendResetPasswordEmail = async (to: string, token: string) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 32px; background-color: #0f1115; color: #f0f0f0; border-radius: 12px; border: 1px solid #1e2030;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #4f8cff 0%, #6366f1 100%); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 22px; font-weight: 900; color: white;">D</div>
        <h1 style="color: #ffffff; margin: 12px 0 4px; font-size: 22px;">Reset Password</h1>
      </div>
      <p style="color: #ccc; font-size: 15px; line-height: 1.7;">We received a request to reset your DevOS password. Click the button below to set a new one.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f8cff, #6366f1); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset My Password →</a>
      </div>
      <p style="color: #555; font-size: 12px; text-align: center;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  await sendEmail(to, 'Reset your password — DevOS', html);
};

export const sendDsaRevisionReminderEmail = async (to: string, problemName: string, _dueDate: Date) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 32px; background-color: #0f1115; color: #f0f0f0; border-radius: 12px; border: 1px solid #1e2030;">
      <h2 style="color: #4f8cff;">🧠 DSA Revision Due Today</h2>
      <p style="color: #ccc; font-size: 15px; line-height: 1.7;">You have a scheduled revision due for: <strong style="color: #f0f0f0;">${problemName}</strong></p>
      <p style="color: #aaa; font-size: 13px;">Consistent revision is the key to mastering algorithms. Don't skip today!</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${env.FRONTEND_URL}/dsa" style="display: inline-block; background: linear-gradient(135deg, #4f8cff, #6366f1); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to DSA Tracker →</a>
      </div>
    </div>
  `;
  await sendEmail(to, `🧠 DSA Revision Due: ${problemName}`, html);
};

export const sendCustomReminderEmail = async (to: string, message: string) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 32px; background-color: #0f1115; color: #f0f0f0; border-radius: 12px; border: 1px solid #1e2030;">
      <h2 style="color: #4f8cff;">⏰ DevOS Reminder</h2>
      <p style="color: #ccc; font-size: 15px; line-height: 1.7;">${message}</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${env.FRONTEND_URL}/" style="display: inline-block; background: linear-gradient(135deg, #4f8cff, #6366f1); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open DevOS →</a>
      </div>
    </div>
  `;
  await sendEmail(to, '⏰ Reminder — DevOS', html);
};
