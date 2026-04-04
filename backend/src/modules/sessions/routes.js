const router = require('express').Router();
const service = require('./service');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { ok, created } = require('../../utils/response');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const sessions = await service.list();
    return ok(res, sessions);
  } catch (err) { next(err); }
});

router.get('/active/:pos_config_id', async (req, res, next) => {
  try {
    const session = await service.getActiveSession(req.params.pos_config_id);
    return ok(res, session || null);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const session = await service.getById(req.params.id);
    return ok(res, session);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/open', async (req, res, next) => {
  try {
    const { pos_config_id, opening_cash } = req.body;
    const session = await service.openSession({
      pos_config_id,
      user_id: req.user.id,
      opening_cash,
    });
    return created(res, session, 'Session opened');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/:id/close', async (req, res, next) => {
  try {
    const { closing_cash } = req.body;
    const session = await service.closeSession({
      id: req.params.id,
      user_id: req.user.id,
      closing_cash,
    });
    return ok(res, session, 'Session closed');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

module.exports = router;
