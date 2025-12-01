import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function authMiddleware(req, res, next){
  const token = req.cookies.token;  // Lấy token từ cookie

  if (!token) {
    return res.status(401).json({ message: "Token không được cung cấp" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);  // Giải mã token
    req.user = decoded;  // Đặt thông tin người dùng vào req.user {sub:user._id, email, username }
    next();  // Tiếp tục xử lý yêu cầu
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.redirect("/");
  }
}

// ============================
// Helper tạo access token
// ============================
export function generateAccessToken(user){
    // dữ liệu của user
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    username: user.username,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}