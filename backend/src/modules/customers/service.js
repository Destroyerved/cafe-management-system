const db = require('../../db');

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const list = async ({ search, page = 1, limit = 30 } = {}) => {
  page  = parseInt(page);
  limit = parseInt(limit);

  const applyFilters = (q) => {
    if (search) {
      q.where(function () {
        this.whereIlike('name', `%${search}%`)
            .orWhereIlike('email', `%${search}%`)
            .orWhereIlike('phone', `%${search}%`);
      });
    }
    return q;
  };

  const [{ count }] = await applyFilters(db('customers').clone()).count('id as count');
  const total  = parseInt(count);
  const pages  = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const data = await applyFilters(db('customers').clone())
    .select('*')
    .orderBy('total_sales', 'desc')
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
  const customer = await db('customers').where({ id }).first();
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
};

const create = async ({ name, email, phone, street1, street2, city, state, country = 'India' }) => {
  if (email) {
    const existing = await db('customers').where({ email }).first();
    if (existing) {
      const err = new Error('A customer with this email already exists');
      err.statusCode = 409;
      throw err;
    }
  }
  const [customer] = await db('customers')
    .insert({ name, email: email || null, phone, street1, street2, city, state, country })
    .returning('*');
  return customer;
};

const update = async (id, { name, email, phone, street1, street2, city, state, country }) => {
  const [customer] = await db('customers')
    .where({ id })
    .update({ name, email: email || null, phone, street1, street2, city, state, country, updated_at: db.fn.now() })
    .returning('*');
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
};

const getStates = () => INDIAN_STATES;

module.exports = { list, getById, create, update, getStates };
