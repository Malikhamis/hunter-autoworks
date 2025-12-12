require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { validateEnv } = require('./config/env-validator');
const { initializeDatabase } = require('./database');
const app = express();

// Validate environment variables before starting
validateEnv();

// Middleware
app.use(cors());
app.use(express.json());

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
app.get('/', (req, res) => res.send('Hunter Autoworks API running'));

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
