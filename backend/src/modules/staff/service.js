const db = require('../../db');

const getShifts = async ({ from, to, staff_id } = {}) => {
  const query = db('sessions')
    .select(
      'sessions.*',
      'users.name as staff_name',
      'users.email as staff_email',
      'users.role as staff_role',
      db.raw('EXTRACT(EPOCH FROM (COALESCE(sessions.closed_at, NOW()) - sessions.opened_at))/3600 as hours_worked')
    )
    .leftJoin('users', 'sessions.opened_by', 'users.id')
    .orderBy('sessions.opened_at', 'desc');

  if (staff_id) query.where('sessions.opened_by', staff_id);
  if (from) query.where('sessions.opened_at', '>=', from);
  if (to) query.where('sessions.opened_at', '<=', to);

  const shifts = await query;

  // Attach order count + revenue per session
  const result = await Promise.all(shifts.map(async (shift) => {
    const stats = await db('orders')
      .where({ session_id: shift.id, status: 'paid' })
      .select(
        db.raw('COUNT(*) as order_count'),
        db.raw('COALESCE(SUM(total), 0) as revenue')
      )
      .first();

    const payments = await db('staff_payments')
      .where({ session_id: shift.id })
      .select(db.raw('COALESCE(SUM(amount), 0) as total_paid'))
      .first();

    return {
      ...shift,
      hours_worked: parseFloat(shift.hours_worked).toFixed(2),
      order_count: parseInt(stats.order_count),
      revenue: parseFloat(stats.revenue).toFixed(2),
      total_paid: parseFloat(payments.total_paid).toFixed(2),
    };
  }));

  return result;
};

const getAllStaff = async () => {
  return db('users')
    .select('id', 'name', 'email', 'role', 'is_active', 'created_at')
    .orderBy('name', 'asc');
};

const payStaff = async ({ staff_id, session_id, amount, note, paid_by }) => {
  const staff = await db('users').where({ id: staff_id }).first();
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    throw err;
  }

  const [payment] = await db('staff_payments')
    .insert({ staff_id, session_id: session_id || null, amount, note, paid_by, status: 'paid' })
    .returning('*');

  return payment;
};

const getStaffPayments = async ({ staff_id } = {}) => {
  const query = db('staff_payments')
    .select(
      'staff_payments.*',
      'users.name as staff_name',
      'payer.name as paid_by_name',
      'sessions.opened_at as session_date'
    )
    .leftJoin('users', 'staff_payments.staff_id', 'users.id')
    .leftJoin('users as payer', 'staff_payments.paid_by', 'payer.id')
    .leftJoin('sessions', 'staff_payments.session_id', 'sessions.id')
    .orderBy('staff_payments.created_at', 'desc');

  if (staff_id) query.where('staff_payments.staff_id', staff_id);

  return query;
};

const getStaffSummary = async () => {
  const staff = await db('users')
    .select('users.id', 'users.name', 'users.email', 'users.role')
    .where('users.is_active', true);

  const result = await Promise.all(staff.map(async (s) => {
    const sessions = await db('sessions')
      .where({ opened_by: s.id })
      .select(
        db.raw('COUNT(*) as total_sessions'),
        db.raw('COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - opened_at))/3600), 0) as total_hours')
      )
      .first();

    const orders = await db('orders')
      .leftJoin('sessions', 'orders.session_id', 'sessions.id')
      .where('sessions.opened_by', s.id)
      .where('orders.status', 'paid')
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('COALESCE(SUM(orders.total), 0) as total_revenue')
      )
      .first();

    const paid = await db('staff_payments')
      .where({ staff_id: s.id })
      .select(db.raw('COALESCE(SUM(amount), 0) as total_paid'))
      .first();

    const avg_order = parseInt(orders.total_orders) > 0 ? parseFloat(orders.total_revenue) / parseInt(orders.total_orders) : 0;
    
    // Calculate cafe-wide ATPT for kitchen staff
    const atpt = await db('kitchen_tickets')
      .where('status', 'completed')
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - sent_at))/60) as avg_mins'))
      .first();
    const avg_prep_time = parseFloat(atpt?.avg_mins || 0).toFixed(1);

    return {
      ...s,
      total_sessions: parseInt(sessions.total_sessions),
      total_hours: parseFloat(sessions.total_hours).toFixed(2),
      total_orders: parseInt(orders.total_orders),
      total_revenue: parseFloat(orders.total_revenue).toFixed(2),
      total_paid: parseFloat(paid.total_paid).toFixed(2),
      avg_order: avg_order.toFixed(2),
      avg_prep_time: avg_prep_time
    };
  }));

  return result;
};

module.exports = { getShifts, getAllStaff, payStaff, getStaffPayments, getStaffSummary };
