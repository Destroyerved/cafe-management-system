const router = require('express').Router();
const service = require('./service');
const { requireAuth } = require('../../middleware/auth');
const { ok, created } = require('../../utils/response');

router.use(requireAuth);

router.get('/states', (req, res) => {
  return ok(res, service.getStates());
});

router.get('/', async (req, res, next) => {
  try {
    return ok(res, await service.list(req.query));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    return ok(res, await service.getById(req.params.id));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    return created(res, await service.create(req.body), 'Customer created');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    return ok(res, await service.update(req.params.id, req.body), 'Customer updated');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

module.exports = router;
