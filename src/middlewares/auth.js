module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    req.userId = token; // Simplified; verify Telegram token in production
    next();
  };