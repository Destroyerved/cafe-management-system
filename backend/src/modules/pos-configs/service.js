const db = require('../../db');

const list = async () => {
  return db('pos_configs').select('*').orderBy('created_at', 'asc');
};

const getById = async (id) => {
  const config = await db('pos_configs').where({ id }).first();
  if (!config) {
    const err = new Error('POS config not found');
    err.statusCode = 404;
    throw err;
  }
  return config;
};

const create = async ({ name }) => {
  const [config] = await db('pos_configs')
    .insert({ name, enable_cash: true, enable_digital: false, enable_upi: false })
    .returning('*');
  return config;
};

const update = async (id, { enable_cash, enable_digital, enable_upi, upi_id }) => {
  const [config] = await db('pos_configs')
    .where({ id })
    .update({ enable_cash, enable_digital, enable_upi, upi_id, updated_at: db.fn.now() })
    .returning('*');
  if (!config) {
    const err = new Error('POS config not found');
    err.statusCode = 404;
    throw err;
  }
  return config;
};

module.exports = { list, getById, create, update };
