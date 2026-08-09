const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (requireAdmin = false) => {
  return async (req, res, next) => {
    let token;

    // Get token from cookies or authorization header
    if (req.cookies && req.cookies['auth-token']) {
      token = req.cookies['auth-token'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select('email role isVerified teacher_id');
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized - User not found' });
      }

      if (!user.isVerified) {
        return res.status(403).json({ error: 'Account is not verified' });
      }

      const role = String(user.role || '').toLowerCase();
      if (requireAdmin && role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
      }

      req.user = {
        userId: user._id.toString(),
        email: user.email,
        role,
        teacherId: user.teacher_id ? user.teacher_id.toString() : null
      };

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
    }
  };
};

module.exports = { protect };
