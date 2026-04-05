const db = require('../../db');
const crypto = require('crypto');
const { getCustomerByToken } = require('../customer-auth/service');

const generateToken = async (table_id, session_id) => {
  // Legacy function. The QR code generator now uses table.qr_token
  return { url: `/s/deprecated` };
};

const resolveTableState = async (token) => {
  const table = await db('tables').where({ qr_token: token, active: true }).first();
  if (!table) {
    const err = new Error('Invalid or inactive table QR code');
    err.statusCode = 404;
    throw err;
  }
  const floor = await db('floors').where({ id: table.floor_id }).first();
  const session = await db('sessions').where({ pos_config_id: floor.pos_config_id, status: 'open' }).first();
  
  if (!session) {
    const err = new Error('Ordering is currently offline for this table');
    err.statusCode = 400;
    throw err;
  }
  return { table, floor, session };
};

const getByToken = async (token) => {
  const { table, session } = await resolveTableState(token);
  const posConfig = await db('pos_configs').where({ id: session.pos_config_id }).first();
  const categories = await db('product_categories').orderBy('sequence');
  const products = await db('products').where({ is_active: true }).orderBy('name');

  return { table, session, pos_config: posConfig, categories, products };
};

const placeOrder = async (token, { customer_token, items, notes }) => {
  const { table, session } = await resolveTableState(token);

  // Verify customer
  const customer = await getCustomerByToken(customer_token);

  // Create or get existing draft order for this table
  let order = await db('orders')
    .where({ session_id: session.id, table_id: table.id, status: 'draft' })
    .first();

  if (!order) {
    const maxResult = await db('orders').where({ session_id: session.id }).max('order_number as max').first();
    const order_number = (maxResult.max || 0) + 1;
    const staff = await db('sessions').where({ id: session.id }).first();
    ;[order] = await db('orders')
      .insert({
        session_id: session.id,
        table_id: table.id,
        customer_id: customer.id,
        order_number,
        status: 'draft',
        created_by: staff.opened_by,
        notes: notes || null,
      })
      .returning('*');
  }

  // Add items
  for (const item of items) {
    const product = await db('products').where({ id: item.product_id }).first();
    if (!product) continue;
    let unit_price = parseFloat(product.price);
    if (item.variant_id) {
      const variant = await db('product_variants').where({ id: item.variant_id }).first();
      if (variant) unit_price += parseFloat(variant.extra_price);
    }
    const subtotal = (unit_price * item.quantity).toFixed(2);
    const total = (parseFloat(subtotal) * (1 + parseFloat(product.tax_percent) / 100)).toFixed(2);
    await db('order_lines').insert({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price,
      tax_percent: product.tax_percent,
      subtotal,
      total,
      notes: item.notes || null,
    });
  }

  // Recalc totals
  const lines = await db('order_lines').where({ order_id: order.id });
  const subtotal = lines.reduce((s, l) => s + parseFloat(l.subtotal), 0);
  const tax_amount = lines.reduce((s, l) => s + parseFloat(l.subtotal) * parseFloat(l.tax_percent) / 100, 0);
  const total = subtotal + tax_amount;
  await db('orders').where({ id: order.id }).update({
    subtotal: subtotal.toFixed(2),
    tax_amount: tax_amount.toFixed(2),
    total: total.toFixed(2),
    updated_at: new Date(),
  });

  return { order_id: order.id, message: 'Order placed successfully' };
};

const getOrderStatus = async (token, customer_token) => {
  const { table, session } = await resolveTableState(token);

  const customer = await getCustomerByToken(customer_token);

  const order = await db('orders')
    .where({ session_id: session.id, table_id: table.id, customer_id: customer.id })
    .orderBy('created_at', 'desc')
    .first();

  if (!order) return { order: null };

  const lines = await db('order_lines')
    .select('order_lines.*', 'products.name as product_name')
    .leftJoin('products', 'order_lines.product_id', 'products.id')
    .where({ order_id: order.id });

  const ticket = await db('kitchen_tickets').where({ order_id: order.id }).first();
  const ticket_items = ticket
    ? await db('kitchen_ticket_items').where({ ticket_id: ticket.id })
    : [];

  return {
    order: { ...order, lines },
    kitchen_status: ticket?.status || null,
    ticket_items,
  };
};

module.exports = { generateToken, getByToken, placeOrder, getOrderStatus };
