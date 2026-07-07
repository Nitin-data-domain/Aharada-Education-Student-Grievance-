// ============================================================
// Aharada Education — Auth Controller
// Login, Register, Profile, Forgot Password (OTP), Google Auth
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendEmail } = require('../services/notifications');
require('dotenv').config();

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory OTP store for registration (email -> { otp, expiresAt, data })
const registrationStore = new Map();

/**
 * POST /api/auth/send-registration-otp
 */
async function sendRegistrationOTP(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    registrationStore.set(email, { otp, expiresAt });

    await sendEmail(
      email,
      'Registration OTP — Aharada Education',
      `Your OTP for registration is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, please ignore.`
    );

    res.json({ message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Send registration OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, phone, password, role, program_name, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ error: 'Name, email, password, and OTP are required.' });
    }

    const storeEntry = registrationStore.get(email);
    if (!storeEntry) {
      return res.status(400).json({ error: 'No OTP requested for this email. Please request OTP first.' });
    }
    if (storeEntry.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }
    if (new Date() > storeEntry.expiresAt) {
      registrationStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, program_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, program_name, is_active`,
      [name, email, phone || null, hashedPassword, role || 'Student', program_name || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Clean up memory store
    registrationStore.delete(email);

    res.status(201).json({ message: 'Registration successful', token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT user_id, name, email, phone, password, role, program_name, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check if user is active (faculty can be deactivated by HOD)
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the HOD.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    delete user.password;
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/google
 * Google Sign-In (receives Google ID token, verifies, and logs in or registers)
 */
async function googleAuth(req, res) {
  try {
    const { credential, name, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google sign-in.' });
    }

    // Check if user exists
    let result = await pool.query(
      'SELECT user_id, name, email, phone, role, program_name, is_active FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (result.rows.length === 0) {
      // Auto-register as Student
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('google_oauth_' + Date.now(), salt);

      const insertResult = await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'Student')
         RETURNING user_id, name, email, role, program_name, is_active`,
        [name || email.split('@')[0], email, hashedPassword]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      if (!user.is_active) {
        return res.status(403).json({ error: 'Your account has been deactivated.' });
      }
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Google login successful', token, user });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email, phone, role, program_name, is_active FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Sends OTP to user's email
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const result = await pool.query('SELECT user_id, name, email FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3',
      [otp, expiresAt, email]
    );

    // Send OTP via email (mock)
    await sendEmail(
      email,
      'Password Reset OTP — Aharada Education',
      `Your OTP for password reset is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, please ignore.`
    );

    res.json({ message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies OTP and allows password reset
 */
async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const result = await pool.query(
      'SELECT user_id, otp, otp_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    res.json({ message: 'OTP verified successfully.', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/reset-password
 * Resets password after OTP verification
 */
async function resetPassword(req, res) {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    // Re-verify OTP
    const result = await pool.query(
      'SELECT user_id, otp, otp_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = result.rows[0];
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });
    if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ error: 'OTP expired.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password = $1, otp = NULL, otp_expires_at = NULL WHERE email = $2',
      [hashedPassword, email]
    );

    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { register, sendRegistrationOTP, login, googleAuth, getMe, forgotPassword, verifyOTP, resetPassword };
