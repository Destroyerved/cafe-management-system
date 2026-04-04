const router = require('express').Router();
const service = require('./service');
const { requireAuth } = require('../../middleware/auth');
const { ok, created } = require('../../utils/response');

router.use(requireAuth);

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
    const { session_id, table_id } = req.body;
    const order = await service.create({ session_id, table_id, created_by: req.user.id });
    return created(res, order, 'Order created');
  } catch (err) { next(err); }
});

router.post('/:id/lines', async (req, res, next) => {
  try {
    const line = await service.addLine(req.params.id, req.body);
    return created(res, line, 'Line added');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.put('/:id/lines/:line_id', async (req, res, next) => {
  try {
    const line = await service.updateLine(req.params.line_id, req.body);
    return ok(res, line, 'Line updated');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.delete('/:id/lines/:line_id', async (req, res, next) => {
  try {
    await service.removeLine(req.params.line_id);
    return ok(res, null, 'Line removed');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

router.patch('/:id/customer', async (req, res, next) => {
  try {
    const order = await service.setCustomer(req.params.id, req.body.customer_id);
    return ok(res, order, 'Customer set');
  } catch (err) { next(err); }
});

router.post('/:id/archive', async (req, res, next) => {
  try {
    const order = await service.archive(req.params.id);
    return ok(res, order, 'Order archived');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    return ok(res, null, 'Order deleted');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
});

module.exports = router;
