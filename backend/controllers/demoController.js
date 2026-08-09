const jwt = require('jsonwebtoken');
const User = require('../models/User');

const enabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_LOGIN !== 'false';

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
    const users = await User.find({ role: 'teacher', isVerified: true, teacher_id: { $ne: null } })
      .populate({ path: 'teacher_id', select: 'teacher_id faculty_name name email subjects department designation', populate: { path: 'subjects', select: 'subject_name subject_code' } })
      .sort({ name: 1 });
    res.json({
      teachers: users.filter((user) => user.teacher_id).map((user) => ({
        id: user.teacher_id._id,
        facultyId: user.teacher_id.teacher_id || '—',
        name: user.teacher_id.faculty_name || user.teacher_id.name || user.name,
        email: user.teacher_id.email || user.email,
        subjects: user.teacher_id.subjects || [],
        department: user.teacher_id.department,
        designation: user.teacher_id.designation || 'Faculty Member',
      })),
    });
  } catch (error) { next(error); }
};

exports.loginAsDemoTeacher = async (req, res, next) => {
  try {
    if (!enabled()) return unavailable(res);
    const { teacherId } = req.body;
    const user = await User.findOne({ role: 'teacher', isVerified: true, teacher_id: teacherId });
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
