const db = require('../../db');

const recalcOrder = async (order_id, trx) => {
  const lines = await (trx || db)('order_lines').where({ order_id });
  const subtotal = lines.reduce((sum, l) => sum + parseFloat(l.subtotal), 0);
  const tax_amount = lines.reduce((sum, l) => sum + (parseFloat(l.subtotal) * parseFloat(l.tax_percent) / 100), 0);
  const total = subtotal + tax_amount;
  await (trx || db)('orders').where({ id: order_id }).update({
    subtotal: subtotal.toFixed(2),
    tax_amount: tax_amount.toFixed(2),
    total: total.toFixed(2),
    updated_at: db.fn.now(),
  });
  return { subtotal, tax_amount, total };
};

const create = async ({ session_id, table_id, created_by }) => {
  const maxResult = await db('orders')
    .max('order_number as max')
    .first();
  const order_number = (maxResult.max || 0) + 1;

  const [order] = await db('orders')
    .insert({ session_id, table_id: table_id || null, created_by, order_number, status: 'draft' })
    .returning('*');
  return order;
};

const addLine = async (order_id, { product_id, variant_id, quantity = 1, notes }) => {
  const order = await db('orders').where({ id: order_id, status: 'draft' }).first();
  if (!order) {
    const err = new Error('Order not found or already paid');
    err.statusCode = 404;
    throw err;
  }

  const product = await db('products').where({ id: product_id }).first();
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  let unit_price = parseFloat(product.price);
  if (variant_id) {
    const variant = await db('product_variants').where({ id: variant_id }).first();
    if (variant) unit_price += parseFloat(variant.extra_price);
  }

  const subtotal = (unit_price * quantity).toFixed(2);
  const total = (parseFloat(subtotal) * (1 + parseFloat(product.tax_percent) / 100)).toFixed(2);

  const [line] = await db('order_lines')
    .insert({
      order_id,
      product_id,
      variant_id: variant_id || null,
      quantity,
      unit_price,
      tax_percent: product.tax_percent,
      subtotal,
      total,
      notes: notes || null,
    })
    .returning('*');

  await recalcOrder(order_id);
  return line;
};

const updateLine = async (line_id, { quantity }) => {
  const line = await db('order_lines').where({ id: line_id }).first();
  if (!line) {
    const err = new Error('Order line not found');
    err.statusCode = 404;
    throw err;
  }

  const subtotal = (parseFloat(line.unit_price) * quantity).toFixed(2);
  const total = (parseFloat(subtotal) * (1 + parseFloat(line.tax_percent) / 100)).toFixed(2);

  const [updated] = await db('order_lines')
    .where({ id: line_id })
    .update({ quantity, subtotal, total, updated_at: db.fn.now() })
    .returning('*');

  await recalcOrder(line.order_id);
  return updated;
};

const removeLine = async (line_id) => {
  const line = await db('order_lines').where({ id: line_id }).first();
  if (!line) {
    const err = new Error('Order line not found');
    err.statusCode = 404;
    throw err;
  }
  await db('order_lines').where({ id: line_id }).delete();
  await recalcOrder(line.order_id);
};

const setCustomer = async (order_id, customer_id) => {
  const [order] = await db('orders')
    .where({ id: order_id })
    .update({ customer_id, updated_at: db.fn.now() })
    .returning('*');
  return order;
};

const list = async ({ session_id, status, search, page = 1, limit = 30 } = {}) => {
  page  = parseInt(page);
  limit = parseInt(limit);

  const applyFilters = (q) => {
    if (session_id) q.where('orders.session_id', session_id);
    if (status)     q.where('orders.status', status);
    if (search)     q.whereRaw('orders.order_number::text ILIKE ?', [`%${search}%`]);
    return q;
  };

  const baseCount = db('orders')
    .leftJoin('customers', 'orders.customer_id', 'customers.id')
    .leftJoin('tables',    'orders.table_id',    'tables.id')
    .leftJoin('sessions',  'orders.session_id',  'sessions.id')
    .leftJoin('users',     'orders.created_by',  'users.id');

  const [{ count }] = await applyFilters(baseCount.clone()).count('orders.id as count');
  const total  = parseInt(count);
  const pages  = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const data = await applyFilters(baseCount.clone())
    .select(
      'orders.*',
      'customers.name as customer_name',
      'tables.table_number',
      'sessions.opened_at as session_opened_at',
      'users.name as created_by_name'
    )
    .orderBy('orders.created_at', 'desc')
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
  const order = await db('orders')
    .select(
      'orders.*',
      'customers.name as customer_name',
      'customers.phone as customer_phone',
      'tables.table_number',
      'users.name as created_by_name'
    )
    .leftJoin('customers', 'orders.customer_id', 'customers.id')
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .leftJoin('users', 'orders.created_by', 'users.id')
    .where('orders.id', id)
    .first();

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const lines = await db('order_lines')
    .select(
      'order_lines.*',
      'products.name as product_name',
      'products.unit_of_measure',
      'product_variants.value as variant_value',
      'product_variants.attribute_name as variant_attribute'
    )
    .leftJoin('products', 'order_lines.product_id', 'products.id')
    .leftJoin('product_variants', 'order_lines.variant_id', 'product_variants.id')
    .where('order_lines.order_id', id);

  return { ...order, lines };
};

const archive = async (id) => {
  const [order] = await db('orders')
    .where({ id })
    .update({ status: 'archived', updated_at: db.fn.now() })
    .returning('*');
  return order;
};

const remove = async (id) => {
  const order = await db('orders').where({ id, status: 'draft' }).first();
  if (!order) {
    const err = new Error('Only draft orders can be deleted');
    err.statusCode = 400;
    throw err;
  }
  await db('order_lines').where({ order_id: id }).delete();
  await db('orders').where({ id }).delete();
};

module.exports = { create, addLine, updateLine, removeLine, setCustomer, list, getById, archive, remove };
