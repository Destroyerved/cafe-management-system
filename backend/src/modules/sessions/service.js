const db = require('../../db');

const openSession = async ({ pos_config_id, user_id, opening_cash = 0 }) => {
  const existing = await db('sessions')
    .where({ pos_config_id, status: 'open' })
    .first();
  if (existing) {
    const err = new Error('A session is already open for this POS config');
    err.statusCode = 409;
    throw err;
  }

  const [session] = await db('sessions')
    .insert({ pos_config_id, opened_by: user_id, opening_cash, status: 'open' })
    .returning('*');

  await db('pos_configs')
    .where({ id: pos_config_id })
    .update({ last_session_id: session.id });

  return session;
};

const closeSession = async ({ id, user_id, closing_cash = 0 }) => {
  const session = await db('sessions').where({ id, status: 'open' }).first();
  if (!session) {
    const err = new Error('Session not found or already closed');
    err.statusCode = 404;
    throw err;
  }

  const [updated] = await db('sessions')
    .where({ id })
    .update({ status: 'closed', closed_at: db.fn.now(), closing_cash })
    .returning('*');

  return updated;
};

const getActiveSession = async (pos_config_id) => {
  return db('sessions')
    .where({ pos_config_id, status: 'open' })
    .first();
};

const getById = async (id) => {
  const session = await db('sessions')
    .select('sessions.*', 'users.name as opened_by_name', 'pos_configs.name as pos_config_name')
    .leftJoin('users', 'sessions.opened_by', 'users.id')
    .leftJoin('pos_configs', 'sessions.pos_config_id', 'pos_configs.id')
    .where('sessions.id', id)
    .first();
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }
  return session;
};

const list = async () => {
  return db('sessions')
    .select('sessions.*', 'users.name as opened_by_name', 'pos_configs.name as pos_config_name')
    .leftJoin('users', 'sessions.opened_by', 'users.id')
    .leftJoin('pos_configs', 'sessions.pos_config_id', 'pos_configs.id')
    .orderBy('sessions.created_at', 'desc');
};

module.exports = { openSession, closeSession, getActiveSession, getById, list };
