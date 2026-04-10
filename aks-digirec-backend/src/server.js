const path = require('path');

// Load .env first from project root (backend folder)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Log startup errors to console so they are visible (e.g. when run via node --watch)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const companyRoutes = require('./routes/company.routes');
const masterRoutes = require('./routes/master.routes');
const accountingRoutes = require('./routes/accounting.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const workerRoutes = require('./routes/worker.routes');
const compositionRoutes = require('./routes/composition.routes');
const productionRoutes = require('./routes/production.routes');
const cashRegisterRoutes = require('./routes/cashRegister.routes');
const bankRoutes = require('./routes/bank.routes');
const reportRoutes = require('./routes/report.routes');
const dictionaryRoutes = require('./routes/dictionary.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const attendanceRoutes = require('./routes/attendance.routes');

// Connect to database (non-blocking - server starts even if DB fails)
connectDB().catch(err => {
  console.error('Failed to connect to database:', err.message);
  console.warn('Server starting anyway. Start MongoDB for full API functionality.');
});

const app = express();

// Security Middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id']
}));

// Rate limiting (disabled for development mode)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // Much higher default for development
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AKS DigiRec API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({
    success: true,
    message: 'AKS DigiRec API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/composition', compositionRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/attendance', attendanceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Start server (try PORT, then PORT+1 if EADDRINUSE)
const PORT = parseInt(process.env.PORT, 10) || 5000;
let server;

function tryListen(port) {
  server = app.listen(port, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
    if (port !== PORT) {
      console.warn(`Port ${PORT} was in use. Using port ${port}. Set PORT in .env if you need a specific port.`);
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      server.close(() => {
        if (port < PORT + 5) {
          tryListen(port + 1);
        } else {
          console.error(`Could not start server: ports ${PORT}-${port} are in use.`);
          process.exit(1);
        }
      });
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
}

tryListen(PORT);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') return; // handled by tryListen
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
