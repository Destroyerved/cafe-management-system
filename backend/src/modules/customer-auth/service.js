const db = require('../../db');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const sendOtp = async (phone) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 12 * 60 * 60 * 1000); // 5 min

  await db('customer_otps').where({ phone }).delete();
  await db('customer_otps').insert({ phone, otp, expires_at });

  // In production send SMS — for hackathon just log it
  logger.info(`��� OTP for ${phone}: ${otp}`);

  return { message: 'OTP sent', otp_preview: otp }; // remove otp_preview in prod
};

const verifyOtp = async (phone, otp) => {
  const record = await db('customer_otps')
    .where({ phone, otp, verified: false })
    .where('expires_at', '>', new Date())
    .first();

  if (!record) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 401;
    throw err;
  }

  await db('customer_otps').where({ id: record.id }).update({ verified: true });

  // Find or create customer
  let customer = await db('customers').where({ phone }).first();
  if (!customer) {
    [customer] = await db('customers')
      .insert({ name: `Guest ${phone.slice(-4)}`, phone, visit_count: 1, last_visit: new Date() })
      .returning('*');
  } else {
    [customer] = await db('customers')
      .where({ id: customer.id })
      .update({
        visit_count: customer.visit_count + 1,
        last_visit: new Date(),
        updated_at: new Date()
      })
      .returning('*');
  }

  // Create session token
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await db('customer_sessions').insert({ customer_id: customer.id, phone, token, expires_at });

  return { customer, token };
};

const getCustomerByToken = async (token) => {
  const session = await db('customer_sessions')
    .where({ token })
    .where('expires_at', '>', new Date())
    .first();

  if (!session) {
    const err = new Error('Invalid or expired session');
    err.statusCode = 401;
    throw err;
  }

  const customer = await db('customers').where({ id: session.customer_id }).first();
  return customer;
};

module.exports = { sendOtp, verifyOtp, getCustomerByToken };
