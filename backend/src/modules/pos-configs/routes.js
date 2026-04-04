const router = require('express').Router();
const service = require('./service');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { ok, created } = require('../../utils/response');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const configs = await service.list();
    return ok(res, configs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const config = await service.getById(req.params.id);
    return ok(res, config);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const config = await service.create(req.body);
    return created(res, config, 'POS config created');
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const config = await service.update(req.params.id, req.body);
    return ok(res, config, 'POS config updated');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

module.exports = router;
