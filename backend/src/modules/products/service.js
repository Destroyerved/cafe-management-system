const db = require('../../db');

const list = async ({ search, category_id, is_active, page = 1, limit = 20 } = {}) => {
  page  = parseInt(page);
  limit = parseInt(limit);

  const applyFilters = (q) => {
    if (search)      q.where('products.name', 'ilike', `%${search}%`);
    if (category_id) q.where('products.category_id', category_id);
    if (is_active !== undefined)
      q.where('products.is_active', is_active === 'true' || is_active === true);
    return q;
  };

  const base = () =>
    db('products').leftJoin('product_categories', 'products.category_id', 'product_categories.id');

  const [{ count }] = await applyFilters(base()).count('products.id as count');
  const total  = parseInt(count);
  const pages  = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const data = await applyFilters(base())
    .select(
      'products.*',
      'product_categories.name as category_name',
      'product_categories.color as category_color'
    )
    .orderBy('products.name', 'asc')
    .limit(limit)
    .offset(offset);

  const from = total > 0 ? offset + 1 : 0;
  const to   = Math.min(offset + data.length, total);

  return {
    data,
    meta: { total, page, limit, pages, showing: `${from}–${to} of ${total}` },
  };
};

const getById = async (id) => {
  const product = await db('products')
    .select('products.*', 'product_categories.name as category_name')
    .leftJoin('product_categories', 'products.category_id', 'product_categories.id')
    .where('products.id', id)
    .first();
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  const variants = await db('product_variants').where({ product_id: id });
  return { ...product, variants };
};

const create = async ({ name, category_id, price, tax_percent = 0, unit_of_measure = 'Unit', description, image_url }) => {
  const [product] = await db('products')
    .insert({ name, category_id, price, tax_percent, unit_of_measure, description, image_url: image_url || null })
    .returning('*');
  return product;
};

const update = async (id, { name, category_id, price, tax_percent, unit_of_measure, description, image_url }) => {
  const [product] = await db('products')
    .where({ id })
    .update({ name, category_id, price, tax_percent, unit_of_measure, description, image_url, updated_at: db.fn.now() })
    .returning('*');
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return product;
};


const toggleActive = async (id) => {
  const product = await db('products').where({ id }).first();
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  const [updated] = await db('products')
    .where({ id })
    .update({ is_active: !product.is_active, updated_at: db.fn.now() })
    .returning('*');
  return updated;
};

const addVariant = async (product_id, { attribute_name, value, unit, extra_price = 0 }) => {
  const [variant] = await db('product_variants')
    .insert({ product_id, attribute_name, value, unit, extra_price })
    .returning('*');
  return variant;
};

const removeVariant = async (variant_id) => {
  const deleted = await db('product_variants').where({ id: variant_id }).delete();
  if (!deleted) {
    const err = new Error('Variant not found');
    err.statusCode = 404;
    throw err;
  }
};

const mark86 = async (name) => {
  const [product] = await db('products').where('name', name).update({ is_active: false }).returning('*');
  return product;
};

module.exports = { list, getById, create, update, toggleActive, addVariant, removeVariant, mark86 };
