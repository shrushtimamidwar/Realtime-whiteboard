const jwt = require("jsonwebtoken");

function verifyToken(token) {
  if (!token || !process.env.JWT_SECRET) {
    throw new Error("Missing token or JWT configuration");
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, name: payload.name, email: payload.email };
    next();
  } catch {
    res.status(401).json({ message: "Please log in again." });
  }
}

module.exports = { verifyToken, requireAuth };
