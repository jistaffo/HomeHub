import crypto from 'node:crypto';

export const newId = () => crypto.randomBytes(9).toString('base64url');
export const newToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Unknown users still pay for a hash, so response time doesn't reveal
// which usernames exist.
const DUMMY = hashPassword(crypto.randomBytes(8).toString('hex'));

export function checkPassword(password, stored) {
  const [salt, hash] = (stored || DUMMY).split(':');
  const test = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex')) && Boolean(stored);
}

export function validatePassword(password) {
  if (String(password).length < 8) return 'Use a password of at least 8 characters.';
  if (String(password).length > 200) return 'That password is too long.';
  return null;
}

export const RESET_HOURS = 24;

// One-time password reset link. Only the hash is stored.
export function createReset(data, userId) {
  const token = newToken(24);
  data.resets = (data.resets || []).filter((r) => r.expiresAt > Date.now() && r.userId !== userId);
  data.resets.push({ token: sha256(token), userId, expiresAt: Date.now() + RESET_HOURS * 3600_000 });
  return token;
}

export function findReset(data, token) {
  const hashed = sha256(token);
  return (data.resets || []).find((r) => r.token === hashed && r.expiresAt > Date.now()) || null;
}
