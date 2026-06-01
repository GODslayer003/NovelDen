import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Using Brevo HTTP API for production email delivery; no raw SMTP required
import User from '../models/User.js';
import Otp from '../models/Otp.js';

const router = express.Router();

// ── Email Transporter (Gmail App Password) ──
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend .env (backend/.env) so secrets are available
config({ path: path.join(__dirname, '../../.env') });

// Enforce critical env vars in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is required in production. Add it to your environment variables.');
    process.exit(1);
  }
  if (!process.env.BREVO_API_KEY && !process.env.SENDINBLUE_API_KEY) {
    console.error('FATAL: BREVO_API_KEY (or SENDINBLUE_API_KEY) is required in production for sending emails.');
    process.exit(1);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || '';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || '';

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP email
// SMTP send/ retry helpers removed — using Brevo HTTP API only in production

// Send email via Brevo (Sendinblue) HTTP API
const sendViaBrevo = async (toEmail, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (!apiKey) throw new Error('No Brevo API key');

  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@novelden.app';
  const payload = {
    sender: { name: 'Novel Den', email: senderEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent: htmlContent,
  };

  const controller = new AbortController();
  const timeoutMs = process.env.BREVO_API_TIMEOUT_MS ? parseInt(process.env.BREVO_API_TIMEOUT_MS, 10) : 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
    // small timeout can be implemented by AbortController if needed
  });
  clearTimeout(timeout);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${text}`);
  }
  return await res.json();
};

// background SMTP scheduling removed

const sendOtpEmail = async (email, otp, options = { ensureDelivery: false }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@novelden.app',
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
    `,
  };

  try {
    // Production: require Brevo API key and use HTTP API only
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (!apiKey) {
      throw new Error('No Brevo API key configured (BREVO_API_KEY)');
    }

    await sendViaBrevo(email, mailOptions.subject, mailOptions.html);
    return;
  } catch (err) {
    console.error(`⚠️ Failed to send OTP email to ${email}:`, err.message || err);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 DEVELOPMENT OTP for ${email}: ${otp}`);
    }
    throw err;
  }
};

// ── REGISTER (Step 1: Create unverified user + send OTP) ──
// ── EMAIL HEALTH CHECK ──
router.get('/health/email', async (req, res) => {
  // Health: verify Brevo API key works by calling Brevo account endpoint
  try {
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (!apiKey) return res.status(503).json({ ok: false, reason: 'no_brevo_api_key' });

    const controller = new AbortController();
    const timeoutMs = process.env.BREVO_API_TIMEOUT_MS ? parseInt(process.env.BREVO_API_TIMEOUT_MS, 10) : 5000;
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: { 'api-key': apiKey },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(503).json({ ok: false, error: `brevo_api_error_${r.status}`, detail: text });
    }
    return res.json({ ok: true, provider: 'brevo-api', from: process.env.EMAIL_FROM || process.env.SMTP_USER });
  } catch (err) {
    return res.status(503).json({ ok: false, error: err.message || String(err) });
  }
});

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
      JWT_SECRET,
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
    if (SUPERADMIN_EMAIL && SUPERADMIN_PASSWORD && email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({ name: 'Superadmin', email, password: hashedPassword, role: 'superadmin', isVerified: true });
      } else {
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
      JWT_SECRET,
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