import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === "production" 
    ? (() => { throw new Error("JWT_SECRET environment variable is required in production"); })()
    : "your-super-secret-key-change-this-in-production"
);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId: string, email: string, username: string): string {
  return jwt.sign(
    { userId, email, username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function generateMockUser(): { username: string; email: string } {
  const randomId = Math.random().toString(36).substr(2, 9);
  return {
    username: `MediaAdmirer_${Math.floor(Math.random() * 900 + 100)}`,
    email: `user_${randomId}@tracker.local`
  };
}
