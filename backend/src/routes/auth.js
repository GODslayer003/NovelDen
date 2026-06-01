import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import User from '../models/User.js';
import Otp from '../models/Otp.js';

const router = express.Router();

// ── Email Transporter (Gmail App Password) ──
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend .env (backend/.env) so SMTP and other secrets are available
config({ path: path.join(__dirname, '../../.env') });

// Create SMTP transporter if SMTP settings are provided
const getTransporter = () => {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    // Allow custom SMTP host/port/secure via env, default to Gmail service
    const hasHost = !!process.env.SMTP_HOST;
    const transportOptions = hasHost
      ? {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
          connectionTimeout: process.env.SMTP_CONNECTION_TIMEOUT ? parseInt(process.env.SMTP_CONNECTION_TIMEOUT, 10) : 8000,
          greetingTimeout: process.env.SMTP_GREETING_TIMEOUT ? parseInt(process.env.SMTP_GREETING_TIMEOUT, 10) : 5000,
          socketTimeout: process.env.SMTP_SOCKET_TIMEOUT ? parseInt(process.env.SMTP_SOCKET_TIMEOUT, 10) : 8000,
        }
      : {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
          connectionTimeout: process.env.SMTP_CONNECTION_TIMEOUT ? parseInt(process.env.SMTP_CONNECTION_TIMEOUT, 10) : 8000,
          greetingTimeout: process.env.SMTP_GREETING_TIMEOUT ? parseInt(process.env.SMTP_GREETING_TIMEOUT, 10) : 5000,
          socketTimeout: process.env.SMTP_SOCKET_TIMEOUT ? parseInt(process.env.SMTP_SOCKET_TIMEOUT, 10) : 8000,
        };

    return nodemailer.createTransport(transportOptions);
  }
  return null;
};

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP email
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Novel Den" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: '🔐 Novel Den — Verify Your Email',
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; background: #1a0f00; padding: 40px 30px; border-radius: 16px; border: 1px solid #3d2314;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4a574; font-size: 28px; margin: 0;">Novel Den</h1>
          <p style="color: #9a7a6a; font-size: 12px; letter-spacing: 3px; margin-top: 4px;">EMAIL VERIFICATION</p>
        </div>
        <div style="text-align: center; padding: 24px; background: #2C1810; border-radius: 12px; border: 1px solid #3d2314;">
          <p style="color: #F5E6D3; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d4a574; font-family: monospace;">${otp}</div>
          <p style="color: #9a7a6a; font-size: 11px; margin-top: 16px;">This code expires in <strong>10 minutes</strong></p>
        </div>
        <p style="color: #6b5a4e; font-size: 11px; text-align: center; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  };
  try {
    // Prefer SMTP when configured
    const transporter = getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        return;
      } catch (smtpErr) {
        console.error(`⚠️ SMTP send failed for ${email}:`, smtpErr && smtpErr.message ? smtpErr.message : smtpErr);
        // If SendGrid is configured, attempt fallback
        if (process.env.SENDGRID_API_KEY) {
          console.log('➡️ Falling back to SendGrid due to SMTP failure');
          try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
              to: email,
              from: process.env.SENDGRID_FROM || process.env.SMTP_EMAIL || 'no-reply@novelden.app',
              subject: mailOptions.subject,
              html: mailOptions.html,
            };
            await sgMail.send(msg);
            return;
          } catch (sgErr) {
            console.error(`⚠️ SendGrid fallback also failed for ${email}:`, sgErr && sgErr.message ? sgErr.message : sgErr);
            throw sgErr;
          }
        }
        // No SendGrid configured — rethrow original SMTP error
        throw smtpErr;
      }
    }

    // Fallback to SendGrid if API key present
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM || process.env.SMTP_EMAIL || 'no-reply@novelden.app',
        subject: mailOptions.subject,
        html: mailOptions.html
      };
      await sgMail.send(msg);
      return;
    }

    // If neither SMTP nor SendGrid is configured, throw
    throw new Error('No email provider configured (SMTP or SENDGRID_API_KEY)');
  } catch (err) {
    console.error(`⚠️ Failed to send OTP email to ${email}:`, err.message || err);
    // In non-production, print OTP to logs to assist testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 DEVELOPMENT OTP for ${email}: ${otp}`);
    }
    // Re-throw so caller can handle error or respond accordingly
    throw err;
  }
};

// ── REGISTER (Step 1: Create unverified user + send OTP) ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if already fully registered
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    
    // If unverified user exists, update their info and resend OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();
    } else {
      await User.create({ name, email, password: hashedPassword, isVerified: false });
    }
    
    // Generate and store OTP
    await Otp.deleteMany({ email }); // Clear old OTPs
    const otp = generateOtp();
    await Otp.create({ email, otp });
    
    // Send OTP email
    await sendOtpEmail(email, otp);
    
    res.status(200).json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY OTP (Step 2: Verify and activate account) ──
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark user as verified
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Clean up OTP
    await Otp.deleteMany({ email });
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RESEND OTP ──
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    if (user.isVerified) return res.status(400).json({ error: 'Account is already verified' });
    
    await Otp.deleteMany({ email });
    const otp = generateOtp();
    await Otp.create({ email, otp });
    
    await sendOtpEmail(email, otp);
    
    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    
    // HARDCODED SUPERADMIN ASSIGNMENT
    if (email === 'rohan@novelden.com' && password === 'NovelDen00327!25!') {
      if (!user) {
        // Create superadmin account if it doesn't exist
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({ name: 'Rohan', email, password: hashedPassword, role: 'superadmin', isVerified: true });
      } else {
        // Ensure they have the superadmin role and are verified
        user.role = 'superadmin';
        user.isVerified = true;
        await user.save();
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email first', needsVerification: true, email });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    // Bypass bcrypt check ONLY if it's the superadmin hardcoded password but bcrypt fails (in case they changed it in DB)
    const isSuperadminMatch = (email === 'rohan@novelden.com' && password === 'NovelDen00327!25!');
    
    if (!isMatch && !isSuperadminMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHECK SESSION ──
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || '' } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── SEND PASSWORD CHANGE OTP ──
router.post('/send-password-otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Generate and store OTP
    await Otp.deleteMany({ email: user.email });
    const otp = generateOtp();
    await Otp.create({ email: user.email, otp });
    
    // Send OTP email
    await sendOtpEmail(user.email, otp);
    
    res.json({ message: 'Password change OTP sent to your email', email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY PASSWORD CHANGE OTP & UPDATE PASSWORD ──
router.post('/verify-password-otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { otp, newPassword } = req.body;
    
    const otpRecord = await Otp.findOne({ email: user.email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    // Clean up OTP
    await Otp.deleteMany({ email: user.email });
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;