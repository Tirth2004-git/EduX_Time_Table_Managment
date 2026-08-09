const jwt = require('jsonwebtoken');
const User = require('../models/User');

const enabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_LOGIN === 'true';

const unavailable = (res) => res.status(404).json({ error: 'Demo login is disabled.' });

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

exports.getDemoTeachers = async (req, res, next) => {
  try {
    if (!enabled()) return unavailable(res);
    const users = await User.find({ role: 'teacher', isVerified: true, linkedTeacherId: { $ne: null } })
      .populate('linkedTeacherId', 'faculty_name name department designation')
      .sort({ name: 1 });
    res.json({
      teachers: users.filter((user) => user.linkedTeacherId).map((user) => ({
        id: user.linkedTeacherId._id,
        name: user.linkedTeacherId.faculty_name || user.linkedTeacherId.name,
        department: user.linkedTeacherId.department,
        designation: user.linkedTeacherId.designation || 'Faculty Member',
      })),
    });
  } catch (error) { next(error); }
};

exports.loginAsDemoTeacher = async (req, res, next) => {
  try {
    if (!enabled()) return unavailable(res);
    const { teacherId } = req.body;
    const user = await User.findOne({ role: 'teacher', isVerified: true, linkedTeacherId: teacherId });
    if (!user) return res.status(404).json({ error: 'Teacher demo account is unavailable.' });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}-refresh`,
      { expiresIn: '7d' }
    );
    res.cookie('auth-token', token, cookieOptions(15 * 60 * 1000));
    res.cookie('refresh-token', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.json({ success: true, token, user: { id: user._id.toString(), username: user.username, email: user.email, role: user.role, name: user.name } });
  } catch (error) { next(error); }
};
