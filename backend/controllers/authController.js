const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
  return crypto.randomInt(100000, 1000000).toString();
};

const getOtpExpiryDate = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

// @desc    Register a new student user (pending OTP verification)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, password, departmentId, semesterId, divisionId } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!name || !email || !password || !departmentId || !semesterId || !divisionId) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const Division = require('../models/Division');
    const division = await Division.findOne({ _id: divisionId, department: departmentId, semester: semesterId });
    if (!division) {
      return res.status(400).json({ error: 'Please select a valid department, semester, and division.' });
    }

    const existingUser = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts +otpLastSentAt');

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in.',
      });
    }

    const otp = generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = getOtpExpiryDate(10); // 10 minutes expiry

    let userToSave;
    if (existingUser && !existingUser.isVerified) {
      // Update pending registration
      existingUser.name = name;
      existingUser.password = password; // Will be hashed by pre-save
      existingUser.department_id = division.department;
      existingUser.semester_id = division.semester;
      existingUser.division_id = division._id;
      existingUser.otpHash = otpHash;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.otpAttempts = 0;
      existingUser.otpLastSentAt = new Date();
      userToSave = existingUser;
    } else {
      // Create new unverified user
      userToSave = new User({
        name,
        email,
        password,
        role: 'student',
        department_id: division.department,
        semester_id: division.semester,
        division_id: division._id,
        isVerified: false,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      });
    }

    await userToSave.save();

    // Send transactional OTP verification email
    await sendOtpEmail(email, otp, name);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please verify to continue.',
      email,
      requiresOtp: true,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP to email
// @route   POST /api/auth/send-otp, POST /api/auth/resend-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts +otpLastSentAt');
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified. Please sign in.' });
    }

    // Enforce 60-second cooldown
    if (user.otpLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.otpLastSentAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds}s before requesting a new OTP.`,
          retryAfter: remainingSeconds,
        });
      }
    }

    const otp = generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);

    user.otpHash = otpHash;
    user.otpExpiresAt = getOtpExpiryDate(10);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    // Send OTP email
    await sendOtpEmail(email, otp, user.name);

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify registration OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
    }

    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified. Please sign in.' });
    }

    // Check maximum verification attempts (max 5)
    if (user.otpAttempts >= 5) {
      return res.status(400).json({
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
      });
    }

    // Check OTP expiration
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        error: 'OTP code has expired. Please request a new verification code.',
      });
    }

    // Verify cryptographic OTP hash
    if (!user.otpHash) {
      return res.status(400).json({ error: 'No active OTP found. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = Math.max(0, 5 - user.otpAttempts);
      return res.status(400).json({
        error: `Invalid OTP code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // Verification Success
    user.isVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email Verified ✓ Account Created Successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    if (process.env.NODE_ENV !== 'production') console.info(`[AUTH] Login request for ${email}`);
    const user = await User.findOne({ email }).select('+password +isVerified');
    if (!user) {
      if (process.env.NODE_ENV !== 'production') console.info('[AUTH] User found: false');
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Account not verified' });
    }

    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      if (process.env.NODE_ENV !== 'production') console.info(`[AUTH] User found: true; password valid: false; role: ${user.role}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const tokenPayload = {
      userId: user._id,
      role: user.role
    };
    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    if (process.env.NODE_ENV !== 'production') console.info(`[AUTH] Login successful; role: ${user.role}`);

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
        department_id: user.department_id,
        semester_id: user.semester_id,
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
        department_id: user.department_id,
        semester_id: user.semester_id,
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
        role: user.role,
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
      role: user.role
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
      $or: [
        { resetPasswordExpiry: { $gt: Date.now() } },
        { resetPasswordExpiry: { $gt: new Date() } }
      ]
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

// @desc    Get public list of registered teachers for login selection
// @route   GET /api/auth/teachers
// @access  Public
exports.getPublicTeachers = async (req, res, next) => {
  try {
    const Teacher = require('../models/Teacher');
    const User = require('../models/User');

    // 1. Fetch from Teacher collection populated with department
    const teachers = await Teacher.find({ status: { $ne: 'inactive' } })
      .populate('department', 'department_name short_name')
      .sort({ name: 1 })
      .lean();

    // 2. Fetch User accounts with role: 'teacher' to match exact login emails
    const teacherUsers = await User.find({ role: 'teacher', isVerified: true })
      .select('name email teacher_id')
      .lean();

    const userByTeacherId = new Map();
    const userByEmail = new Map();
    teacherUsers.forEach((u) => {
      if (u.teacher_id) userByTeacherId.set(u.teacher_id.toString(), u);
      if (u.email) userByEmail.set(u.email.toLowerCase(), u);
    });

    const teacherMap = new Map();

    // Add all Teachers from Teacher model
    teachers.forEach((t) => {
      const linkedUser = userByTeacherId.get(t._id.toString()) || (t.email ? userByEmail.get(t.email.toLowerCase()) : null);
      const email = linkedUser?.email || t.email || '';
      const deptName = t.department?.department_name || t.department?.short_name || 'General Faculty';

      teacherMap.set(t._id.toString(), {
        id: t._id.toString(),
        name: t.name || linkedUser?.name || 'Faculty Member',
        email: email,
        facultyId: t.teacher_id || '—',
        department: deptName,
        departmentShort: t.department?.short_name || '',
        designation: t.designation || 'Faculty Member',
      });
    });

    // Also include any User with role: 'teacher' who might not be in Teacher model yet
    teacherUsers.forEach((u) => {
      const alreadyIncluded = u.teacher_id && teacherMap.has(u.teacher_id.toString());
      const emailIncluded = Array.from(teacherMap.values()).some((item) => item.email && item.email.toLowerCase() === u.email.toLowerCase());

      if (!alreadyIncluded && !emailIncluded) {
        teacherMap.set(u._id.toString(), {
          id: u._id.toString(),
          name: u.name || 'Faculty Member',
          email: u.email,
          facultyId: '—',
          department: 'General Faculty',
          departmentShort: '',
          designation: 'Faculty Member',
        });
      }
    });

    const result = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    next(error);
  }
};
