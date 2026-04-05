const db = require('../../db');

const sendToKitchen = async (order_id, io) => {
  const order = await db('orders')
    .select('orders.*', 'sessions.pos_config_id')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.id', order_id)
    .first();

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Check if ticket already exists
  const existing = await db('kitchen_tickets').where({ order_id }).first();
  if (existing) {
    const err = new Error('Order already sent to kitchen');
    err.statusCode = 409;
    throw err;
  }

  const lines = await db('order_lines')
    .select('order_lines.*', 'products.name as product_name')
    .leftJoin('products', 'order_lines.product_id', 'products.id')
    .where('order_lines.order_id', order_id);

  if (!lines.length) {
    const err = new Error('Order has no items');
    err.statusCode = 400;
    throw err;
  }

  // Create ticket
  const [ticket] = await db('kitchen_tickets')
    .insert({ order_id, status: 'to_cook', sent_at: db.fn.now() })
    .returning('*');

  // Create ticket items
  const items = await db('kitchen_ticket_items')
    .insert(
      lines.map(l => ({
        ticket_id: ticket.id,
        order_line_id: l.id,
        product_name: l.product_name,
        quantity: l.quantity,
        is_prepared: false,
      }))
    )
    .returning('*');

  const fullTicket = { ...ticket, items, order_number: order.order_number };

  // Emit to kitchen room
  if (io) {
    io.to(`kitchen_${order.session_id}`).emit('new_ticket', fullTicket);
    io.to('kitchen_global').emit('new_ticket', fullTicket);
  }

  return fullTicket;
};

const updateTicketStatus = async (ticket_id, status, io) => {
  const validTransitions = {
    to_cook: 'preparing',
    preparing: 'completed',
  };

  const ticket = await db('kitchen_tickets').where({ id: ticket_id }).first();
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (status !== validTransitions[ticket.status] && status !== ticket.status) {
    const err = new Error(`Cannot move from ${ticket.status} to ${status}`);
    err.statusCode = 400;
    throw err;
  }

  const updateData = { status };
  if (status === 'completed') updateData.completed_at = db.fn.now();

  const [updated] = await db('kitchen_tickets')
    .where({ id: ticket_id })
    .update(updateData)
    .returning('*');

  // Get session_id via order
  const order = await db('orders').where({ id: ticket.order_id }).first();

  if (io) {
    io.to(`kitchen_${order.session_id}`).emit('ticket_updated', updated);
    io.to('kitchen_global').emit('ticket_updated', updated);
  }

  return updated;
};

const markItemPrepared = async (item_id, io) => {
  const item = await db('kitchen_ticket_items').where({ id: item_id }).first();
  if (!item) {
    const err = new Error('Item not found');
    err.statusCode = 404;
    throw err;
  }

  const [updated] = await db('kitchen_ticket_items')
    .where({ id: item_id })
    .update({ is_prepared: !item.is_prepared })
    .returning('*');

  // Get session_id
  const ticket = await db('kitchen_tickets').where({ id: item.ticket_id }).first();
  const order = await db('orders').where({ id: ticket.order_id }).first();

  if (io) {
    io.to(`kitchen_${order.session_id}`).emit('item_prepared', updated);
    io.to('kitchen_global').emit('item_prepared', updated);
  }

  return updated;
};

const listTickets = async ({ session_id, status } = {}) => {
  const query = db('kitchen_tickets')
    .select(
      'kitchen_tickets.*',
      'orders.order_number',
      'orders.table_id',
      'tables.table_number'
    )
    .leftJoin('orders', 'kitchen_tickets.order_id', 'orders.id')
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .orderBy('kitchen_tickets.sent_at', 'asc');

  if (session_id && session_id !== 'global') query.where('orders.session_id', session_id);
  if (status) query.where('kitchen_tickets.status', status);

  const tickets = await query;

  // Attach items to each ticket
  const ticketsWithItems = await Promise.all(
    tickets.map(async (ticket) => {
      const items = await db('kitchen_ticket_items')
        .where({ ticket_id: ticket.id });
      return { ...ticket, items };
    })
  );

  return ticketsWithItems;
};

module.exports = { sendToKitchen, updateTicketStatus, markItemPrepared, listTickets };
