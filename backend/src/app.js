require('dotenv').config();
const express = require('express');
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
  max: 20,
  message: { success: false, message: 'Too many requests, try again later' },
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', require('./modules/auth/routes'));

// Socket.io
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('join_kitchen', (sessionId) => {
    socket.join(`kitchen_${sessionId}`);
    logger.info(`Socket ${socket.id} joined kitchen_${sessionId}`);
  });
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.use(errorHandler);

module.exports = { app, server };
