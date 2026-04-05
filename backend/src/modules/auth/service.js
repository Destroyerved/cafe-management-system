const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '12h' }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

const signup = async ({ name, email, password, role }) => {
  const existing = await db('users').where({ email }).first();
  if (existing) {
    const err = new Error('This email is already registered');
    err.statusCode = 409;
    throw err;
  }
  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await db('users')
    .insert({ name, email, password_hash, role })
    .returning(['id', 'name', 'email', 'role']);
  return user;
};

const login = async ({ email, password }, res) => {
  const user = await db('users').where({ email, is_active: true }).first();
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshHash = await bcrypt.hash(refreshToken, 10);

  await db('users').where({ id: user.id }).update({ refresh_token_hash: refreshHash });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    const err = new Error('No refresh token');
    err.statusCode = 401;
    throw err;
  }
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await db('users').where({ id: payload.id, is_active: true }).first();
  if (!user || !user.refresh_token_hash) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }
  const valid = await bcrypt.compare(token, user.refresh_token_hash);
  if (!valid) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }
  const accessToken = signAccessToken(user);
  return { accessToken };
};

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await db('users').where({ id: payload.id }).update({ refresh_token_hash: null });
    } catch (_) {}
  }
  res.clearCookie('refreshToken');
};

module.exports = { signup, login, refreshToken, logout };
