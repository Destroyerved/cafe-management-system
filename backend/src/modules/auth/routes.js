const router = require('express').Router();
const service = require('./service');
const { validate } = require('../../middleware/validate');
const { signupSchema, loginSchema } = require('./validation');
const { requireAuth } = require('../../middleware/auth');
const { ok, created } = require('../../utils/response');

router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const user = await service.signup(req.body);
    return created(res, user, 'Account created successfully');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const data = await service.login(req.body, res);
    return ok(res, data, 'Login successful');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = await service.refreshToken(req, res);
    return ok(res, data);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await service.logout(req, res);
    return ok(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
