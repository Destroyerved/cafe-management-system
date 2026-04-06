require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
});

app.set('io', io);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, try again later' },
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/pos-configs', require('./modules/pos-configs/routes'));
app.use('/api/sessions', require('./modules/sessions/routes'));
app.use('/api/floors', require('./modules/floors/routes'));
app.use('/api/tables', require('./modules/tables/routes'));
app.use('/api/self-order', require('./modules/self-order/routes'));
app.use('/api/categories', require('./modules/categories/routes'));
app.use('/api/products', require('./modules/products/routes'));
app.use('/api/customers', require('./modules/customers/routes'));
app.use('/api/orders', require('./modules/orders/routes'));
app.use('/api/payments', require('./modules/payments/routes'));
app.use('/api/kitchen', require('./modules/kitchen/routes'));
app.use('/api/reports', require('./modules/reports/routes'));
app.use('/api/staff', require('./modules/staff/routes'));
app.use('/api/customer-auth', require('./modules/customer-auth/routes'));

// Socket.io
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('join_kitchen', (sessionId) => {
    if (sessionId === 'global') {
      socket.join('kitchen_global');
      logger.info(`Socket ${socket.id} joined kitchen_global`);
    } else {
      socket.join(`kitchen_${sessionId}`);
      logger.info(`Socket ${socket.id} joined kitchen_${sessionId}`);
    }
  });
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.use(errorHandler);

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

module.exports = { app, server };
