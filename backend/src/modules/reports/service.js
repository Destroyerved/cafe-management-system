const db = require('../../db');

const getPeriodDates = ({ period, start_date, end_date }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === 'custom' && start_date && end_date) {
    return { from: new Date(start_date), to: new Date(new Date(end_date).setHours(23, 59, 59, 999)) };
  }

  switch (period) {
    case 'today':
      return { from: today, to: now };
    case 'weekly':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      return { from: weekStart, to: now };
    case 'monthly':
      const monthStart = new Date(today);
      monthStart.setDate(today.getDate() - 30);
      return { from: monthStart, to: now };
    case 'yearly':
      const yearStart = new Date(today);
      yearStart.setDate(today.getDate() - 365);
      return { from: yearStart, to: now };
    default:
      return { from: today, to: now };
  }
};

const getDashboard = async ({ pos_config_id, period = 'today', start_date, end_date, session_id, responsible_id, product_id } = {}) => {
  const { from, to } = getPeriodDates({ period, start_date, end_date });

  const query = db('orders')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', from)
    .where('orders.created_at', '<=', to);

  if (pos_config_id) query.where('sessions.pos_config_id', pos_config_id);
  if (session_id) query.where('orders.session_id', session_id);
  if (responsible_id) query.where('orders.created_by', responsible_id);

  if (product_id) {
    query.whereExists(
      db('order_lines')
        .where('order_lines.order_id', db.raw('orders.id'))
        .where('order_lines.product_id', product_id)
    );
  }

  const orders = await query.select('orders.total', 'orders.tax_amount', 'orders.id');
  const total_orders = orders.length;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total), 0);
  const tax = orders.reduce((s, o) => s + parseFloat(o.tax_amount || 0), 0);
  const gross = revenue - tax;
  const avg_order = total_orders > 0 ? revenue / total_orders : 0;

  // Previous period for % change
  const periodMs = to - from;
  const prevFrom = new Date(from - periodMs);
  const prevTo = new Date(from);

  const prevQuery = db('orders')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', prevFrom)
    .where('orders.created_at', '<=', prevTo);

  if (pos_config_id) prevQuery.where('sessions.pos_config_id', pos_config_id);

  const prevOrders = await prevQuery.select('orders.total');
  const prev_revenue = prevOrders.reduce((s, o) => s + parseFloat(o.total), 0);
  const revenue_change = prev_revenue > 0 ? ((revenue - prev_revenue) / prev_revenue * 100).toFixed(1) : 0;

  return {
    total_orders,
    revenue: revenue.toFixed(2),
    tax: tax.toFixed(2),
    gross: gross.toFixed(2),
    avg_order: avg_order.toFixed(2),
    revenue_change,
    period,
  };
};

const getSalesChart = async ({ period = 'today', start_date, end_date, pos_config_id, session_id } = {}) => {
  const { from, to } = getPeriodDates({ period, start_date, end_date });

  const orders = await db('orders')
    .select('orders.total', 'orders.created_at')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', from)
    .where('orders.created_at', '<=', to)
    .modify((q) => {
      if (pos_config_id) q.where('sessions.pos_config_id', pos_config_id);
      if (session_id) q.where('orders.session_id', session_id);
    })
    .orderBy('orders.created_at', 'asc');

  // Group by hour for today, by day for weekly/monthly
  const grouped = {};
  orders.forEach(o => {
    const d = new Date(o.created_at);
    const key = period === 'today'
      ? `${d.getHours()}:00`
      : `${d.getDate()}/${d.getMonth() + 1}`;
    if (!grouped[key]) grouped[key] = 0;
    grouped[key] += parseFloat(o.total);
  });

  return Object.entries(grouped).map(([time, revenue]) => ({ time, revenue: revenue.toFixed(2) }));
};

const getTopCategories = async ({ period = 'today', start_date, end_date, pos_config_id } = {}) => {
  const { from, to } = getPeriodDates({ period, start_date, end_date });

  const rows = await db('order_lines')
    .select('product_categories.name as category', db.raw('SUM(order_lines.total) as revenue'))
    .leftJoin('products', 'order_lines.product_id', 'products.id')
    .leftJoin('product_categories', 'products.category_id', 'product_categories.id')
    .leftJoin('orders', 'order_lines.order_id', 'orders.id')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', from)
    .where('orders.created_at', '<=', to)
    .modify((q) => { if (pos_config_id) q.where('sessions.pos_config_id', pos_config_id); })
    .groupBy('product_categories.name')
    .orderBy('revenue', 'desc');

  const total = rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
  return rows.map(r => ({
    category: r.category || 'Uncategorized',
    revenue: parseFloat(r.revenue).toFixed(2),
    percent: total > 0 ? ((parseFloat(r.revenue) / total) * 100).toFixed(1) : 0,
  }));
};

const getTopProducts = async ({ period = 'today', start_date, end_date, pos_config_id } = {}) => {
  const { from, to } = getPeriodDates({ period, start_date, end_date });

  return db('order_lines')
    .select(
      'products.name as product',
      db.raw('SUM(order_lines.quantity) as qty'),
      db.raw('SUM(order_lines.total) as revenue')
    )
    .leftJoin('products', 'order_lines.product_id', 'products.id')
    .leftJoin('orders', 'order_lines.order_id', 'orders.id')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', from)
    .where('orders.created_at', '<=', to)
    .modify((q) => { if (pos_config_id) q.where('sessions.pos_config_id', pos_config_id); })
    .groupBy('products.name')
    .orderBy('revenue', 'desc')
    .limit(5);
};

const getTopOrders = async ({ period = 'today', start_date, end_date, pos_config_id, session_id } = {}) => {
  const { from, to } = getPeriodDates({ period, start_date, end_date });

  return db('orders')
    .select(
      'orders.id',
      'orders.order_number',
      'orders.total',
      'orders.created_at',
      'users.name as employee',
      'tables.table_number',
      'sessions.id as session_id'
    )
    .leftJoin('users', 'orders.created_by', 'users.id')
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .where('orders.created_at', '>=', from)
    .where('orders.created_at', '<=', to)
    .modify((q) => {
      if (pos_config_id) q.where('sessions.pos_config_id', pos_config_id);
      if (session_id) q.where('orders.session_id', session_id);
    })
    .orderBy('orders.total', 'desc')
    .limit(10);
};
const getHourlyHeatmap = async ({ pos_config_id } = {}) => {
  const rows = await db('orders')
    .select(
      db.raw('EXTRACT(DOW FROM orders.created_at) as day_of_week'),
      db.raw('EXTRACT(HOUR FROM orders.created_at) as hour'),
      db.raw('COUNT(*) as order_count'),
      db.raw('COALESCE(SUM(orders.total), 0) as revenue')
    )
    .leftJoin('sessions', 'orders.session_id', 'sessions.id')
    .where('orders.status', 'paid')
    .modify(q => { if (pos_config_id) q.where('sessions.pos_config_id', pos_config_id); })
    .groupBy('day_of_week', 'hour')
    .orderBy('day_of_week')
    .orderBy('hour');

  return rows.map(r => ({
    day: parseInt(r.day_of_week),
    hour: parseInt(r.hour),
    count: parseInt(r.order_count),
    revenue: parseFloat(r.revenue),
  }));
};

const getCustomerRetention = async () => {
  const all = await db('customers').count('* as total').first();
  const returning = await db('customers').where('visit_count', '>=', 5).count('* as total').first();
  const occasional = await db('customers').whereBetween('visit_count', [2, 4]).count('* as total').first();
  const newCustomers = await db('customers').where('visit_count', 1).count('* as total').first();

  const total = parseInt(all.total);
  const ret = parseInt(returning.total);
  const occ = parseInt(occasional.total);
  const nw = parseInt(newCustomers.total);

  return {
    total,
    returning: { count: ret, percent: ((ret / total) * 100).toFixed(1) },
    occasional: { count: occ, percent: ((occ / total) * 100).toFixed(1) },
    new: { count: nw, percent: ((nw / total) * 100).toFixed(1) },
  };
};

const getStaffPerformance = async () => {
  return db('users')
    .select(
      'users.name',
      'users.role',
      db.raw('COUNT(DISTINCT sessions.id) as sessions'),
      db.raw('COUNT(DISTINCT orders.id) as orders'),
      db.raw('COALESCE(SUM(orders.total), 0) as revenue'),
      db.raw('COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(sessions.closed_at, NOW()) - sessions.opened_at))/3600), 0) as hours')
    )
    .leftJoin('sessions', 'sessions.opened_by', 'users.id')
    .leftJoin('orders', function() {
      this.on('orders.session_id', 'sessions.id').andOn('orders.status', db.raw("'paid'"));
    })
    .where('users.is_active', true)
    .whereIn('users.role', ['admin', 'staff'])
    .groupBy('users.id', 'users.name', 'users.role')
    .orderBy('revenue', 'desc');
};

const getTableRevenue = async () => {
  return db('orders')
    .select(
      'tables.table_number',
      'floors.name as floor_name',
      db.raw('COUNT(orders.id) as order_count'),
      db.raw('SUM(orders.total) as revenue')
    )
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .leftJoin('floors', 'tables.floor_id', 'floors.id')
    .where('orders.status', 'paid')
    .whereNotNull('orders.table_id')
    .groupBy('tables.id', 'tables.table_number', 'floors.name')
    .orderBy('revenue', 'desc');
};
module.exports = { getDashboard, getSalesChart, getTopCategories, getTopProducts, getTopOrders, getHourlyHeatmap, getCustomerRetention, getStaffPerformance, getTableRevenue };
