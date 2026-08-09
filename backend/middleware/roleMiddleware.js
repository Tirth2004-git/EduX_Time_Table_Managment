/**
 * Middleware to restrict route access to specific roles
 * @param {...string} roles - The authorized roles (e.g., 'admin', 'user')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - User details not found' });
    }
    
    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map((role) => String(role).toLowerCase());
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden - Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    
    next();
  };
};

module.exports = { authorizeRoles };
