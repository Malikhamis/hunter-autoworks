require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { validateEnv } = require('./config/env-validator');
const { initializeDatabase } = require('./database');
const app = express();

// Validate environment variables before starting
validateEnv();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://hunter-autoworks.vercel.app',
      'https://hunter-autoworks-git-main-malikhamis-projects.vercel.app',
      'https://hunter-autoworks-malikhamis-projects.vercel.app',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:8082',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
      'http://127.0.0.1:8082'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/items_services', require('./routes/items_services'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/', (req, res) => res.json({ 
  status: 'ok', 
  message: 'Hunter Autoworks API running',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
}));

app.get('/api', (req, res) => res.json({ 
  status: 'ok', 
  message: 'Hunter Autoworks API v1.0',
  endpoints: [
    '/api/services',
    '/api/bookings',
    '/api/quotes',
    '/api/clients',
    '/api/admin',
    '/api/invoices',
    '/api/documents',
    '/api/dashboard',
    '/api/payments'
  ]
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't expose stack traces in production
    const error = process.env.NODE_ENV === 'production' 
        ? { error: 'Internal server error' }
        : { error: err.message, stack: err.stack };
    
    res.status(err.status || 500).json(error);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
