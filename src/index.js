const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
require('dotenv').config();

// Initialize Express app
const app = express();

// Initialize Sentry FIRST (before app.use)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }) // Use the actual app instance
  ],
  tracesSampleRate: 1.0,
});

// ======================
// Middleware Stack Order
// ======================

// 1. Sentry Request Handler (must be before routes)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// 2. Security Headers
app.use(helmet());

// 3. Rate Limiting for /api/ routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. Body Parser
app.use(express.json());

// ==============
// Route Mounting
// ==============

// Root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to AlphaWolf Backend',
    status: 'running',
    version: '1.0.0',
  });
});

// API routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const socialLinksRoutes = require('./routes/socialLinks');
const referralsRoutes = require('./routes/referrals');
const packRoutes = require('./routes/pack');

app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/social-links', socialLinksRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/pack', packRoutes);

// ===============
// Error Handling
// ===============

// 404 Handler (for undefined routes)
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Sentry Error Handler (must be after routes but before custom handler)
app.use(Sentry.Handlers.errorHandler());

// Custom Error Handler (last middleware)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==============
// Server Startup
// ==============

const PORT = process.env.PORT || 5000; // Adjusted to match your output
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Sentry monitoring ${process.env.SENTRY_DSN ? 'enabled' : 'disabled'}`);
});

module.exports = app; // For testing
