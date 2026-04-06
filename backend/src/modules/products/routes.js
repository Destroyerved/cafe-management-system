const router = require('express').Router();
const service = require('./service');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate, validateQuery } = require('../../middleware/validate');
const { ok, created } = require('../../utils/response');
const { createProductSchema, updateProductSchema, paginationSchema } = require('../validation/schemas');

router.post('/86', requireAuth, async (req, res, next) => {
  try { return ok(res, await service.mark86(req.body.name), 'Product marked out of stock'); }
  catch (err) { next(err); }
});

router.use(requireAuth);

router.get('/', validateQuery(paginationSchema), async (req, res, next) => {
  try { return ok(res, await service.list(req.query)); }
  catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try { return ok(res, await service.getById(req.params.id)); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message }); next(err); }
});

router.post('/', requireRole('admin'), validate(createProductSchema), async (req, res, next) => {
  try { return created(res, await service.create(req.body), 'Product created'); }
  catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), validate(updateProductSchema), async (req, res, next) => {
  try { return ok(res, await service.update(req.params.id, req.body), 'Product updated'); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message }); next(err); }
});

router.patch('/:id/toggle', requireRole('admin'), async (req, res, next) => {
  try { return ok(res, await service.toggleActive(req.params.id), 'Status toggled'); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message }); next(err); }
});

router.post('/:id/variants', requireRole('admin'), async (req, res, next) => {
  try { return created(res, await service.addVariant(req.params.id, req.body), 'Variant added'); }
  catch (err) { next(err); }
});

router.delete('/variants/:id', requireRole('admin'), async (req, res, next) => {
  try { await service.removeVariant(req.params.id); return ok(res, null, 'Variant removed'); }
  catch (err) { if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message }); next(err); }
});

module.exports = router;
