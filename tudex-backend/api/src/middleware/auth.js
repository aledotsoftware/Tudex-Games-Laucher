const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tudex-jwt-secret-change-in-production';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, JWT_SECRET };
