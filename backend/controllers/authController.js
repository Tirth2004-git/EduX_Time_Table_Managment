const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOtpEmail, sendResetPasswordEmail } = require('../services/emailService');

const AUTH_COOKIE_NAME = 'auth-token';
const REFRESH_COOKIE_NAME = 'refresh-token';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '-refresh');
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

const getCookieOptions = (maxAgeMs) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
};

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOtpExpiryDate = (minutes = 5) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

// @desc    Register a new user (admin/user)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Since User doesn't have username, maybe we can search by email or name.
    // The previous implementation checked username, but we'll remove it.

    const otp = generateOtpCode();
    const otpExpiry = getOtpExpiryDate(5);

    // Create user (password is automatically hashed via pre-save hook)
    const user = new User({
      name,
      email,
      password,
      otp,
      otpExpiry,
      isVerified: false,
      role: 'teacher' // default registration role if not specified
    });

    await user.save();

    // Send OTP email (non-blocking)
    sendOtpEmail(email, otp, username);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    const otp = generateOtpCode();
    user.otp = otp;
    user.otpExpiry = getOtpExpiryDate(5);
    await user.save();

    // Send OTP email
    sendOtpEmail(email, otp, user.name);

    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify registration OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Mark as verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password +isVerified');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Account not verified' });
    }

    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }

    const tokenPayload = {
      userId: user._id,
      role: user.role
    };
    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(ACCESS_MAX_AGE_MS));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(REFRESH_MAX_AGE_MS));

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        teacher_id: user.teacher_id,
        student_id: user.student_id,
        division_id: user.division_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        teacher_id: user.teacher_id,
        student_id: user.student_id,
        division_id: user.division_id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const emailExists = await User.findOne({ email: normalizedEmail });
        if (emailExists) {
          return res.status(400).json({ error: 'Email is already in use by another account' });
        }
        user.email = normalizedEmail;
      }
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        role: 'teacher',
        name: user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new passwords' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh session tokens
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshSession = async (req, res, next) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No refresh token' });
  }
  try {
    const secret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '-refresh');
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select('email role isVerified');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'teacher'
    };
    const newAccess = generateAccessToken(tokenPayload);
    res.cookie(AUTH_COOKIE_NAME, newAccess, getCookieOptions(ACCESS_MAX_AGE_MS));
    return res.json({ success: true, token: newAccess });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Refresh token expired. Please log in again.' });
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please provide an email address' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If that email is registered, we have sent a reset password link.' });
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = token;
    user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendResetPasswordEmail(user.email, token, user.name);

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password - Verify token and update password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    next(error);
  }
};

