const jwt = require("jsonwebtoken");

module.exports = function auth(requiredRoles = []) {
  return (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "JWT secret is not configured" });
    }

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ success: false, message: "No token" });

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;

      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};
