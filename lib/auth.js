import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import getDb from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'vehicle-sales-secret-key-2024';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, director_id, phone FROM users WHERE id = ?').get(decoded.id);
    return user || null;
  } catch {
    return null;
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
