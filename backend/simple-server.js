// Simple backend server for Hunter Autoworks - No external dependencies
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// In-memory data storage (for testing purposes)
let services = [
    { name: 'Engine Diagnostics', price: 15000, icon: '🔍', desc: 'Cutting-edge computer diagnostics to identify issues with precision and accuracy.', features: ['OBD-II scanning','Engine performance analysis','Electrical system testing','Detailed diagnostic report'] },
    { name: 'Oil Change & Filter', price: 35000, icon: '🛢️', desc: 'Complete oil change with premium synthetic oils and high-quality filters.', features: ['Synthetic oil options','Multi-point inspection','Fluid level checks','Service reminder sticker'] },
    { name: 'Brake Service', price: 45000, icon: '🛑', desc: 'Complete brake system service ensuring your safety on the road.', features: ['Brake pad replacement','Rotor resurfacing','Brake fluid service','Safety inspection'] },
    { name: 'Transmission Service', price: 80000, icon: '⚙️', desc: 'Expert transmission service and repair by certified specialists.', features: ['Transmission flush','Filter replacement','Performance testing','Warranty included'] },
    { name: 'AC Service', price: 25000, icon: '❄️', desc: 'Professional AC service to keep you comfortable year-round.', features: ['Refrigerant recharge','System leak detection','Component replacement','Performance optimization'] },
    { name: 'General Maintenance', price: 40000, icon: '🔧', desc: 'Comprehensive vehicle maintenance to keep your car running perfectly.', features: ['Multi-point inspection','Preventive maintenance','Fluid services','Performance optimization'] }
];

let bookings = [];
let quotes = [];

// Simple admin credentials
const adminCredentials = {
    username: 'admin',
    password: 'admin123'
};

// CORS headers
function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// JSON response helper
function sendJSON(res, statusCode, data) {
    setCORSHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Parse JSON body
function parseJSONBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            callback(null, data);
        } catch (error) {
            callback(error, null);
        }
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    console.log(`${method} ${pathname}`);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        setCORSHeaders(res);
        res.writeHead(200);
        res.end();
        return;
    }

    // Routes
    if (pathname === '/') {
        sendJSON(res, 200, { message: 'Hunter Autoworks API running', status: 'OK' });
    }
    
    // GET /api/services
    else if (pathname === '/api/services' && method === 'GET') {
        sendJSON(res, 200, services);
    }
    
    // POST /api/bookings
    else if (pathname === '/api/bookings' && method === 'POST') {
        parseJSONBody(req, (error, data) => {
            if (error) {
                sendJSON(res, 400, { error: 'Invalid JSON' });
                return;
            }
            
            const booking = {
                ...data,
                id: Date.now(),
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            bookings.push(booking);
            sendJSON(res, 201, { message: 'Booking created successfully', booking });
        });
    }
    
    // GET /api/bookings
    else if (pathname === '/api/bookings' && method === 'GET') {
        sendJSON(res, 200, bookings);
    }
    
    // POST /api/quotes
    else if (pathname === '/api/quotes' && method === 'POST') {
        parseJSONBody(req, (error, data) => {
            if (error) {
                sendJSON(res, 400, { error: 'Invalid JSON' });
                return;
            }
            
            const quote = {
                ...data,
                id: Date.now(),
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            quotes.push(quote);
            sendJSON(res, 201, { message: 'Quote request submitted successfully', quote });
        });
    }
    
    // GET /api/quotes
    else if (pathname === '/api/quotes' && method === 'GET') {
        sendJSON(res, 200, quotes);
    }
    
    // POST /api/admin/login
    else if (pathname === '/api/admin/login' && method === 'POST') {
        parseJSONBody(req, (error, data) => {
            if (error) {
                sendJSON(res, 400, { error: 'Invalid JSON' });
                return;
            }
            
            if (data.username === adminCredentials.username && data.password === adminCredentials.password) {
                sendJSON(res, 200, { 
                    message: 'Login successful', 
                    token: 'simple-jwt-token-' + Date.now(),
                    user: { username: data.username, role: 'admin' }
                });
            } else {
                sendJSON(res, 401, { error: 'Invalid credentials' });
            }
        });
    }
    
    // GET /api/admin/stats
    else if (pathname === '/api/admin/stats' && method === 'GET') {
        const stats = {
            totalBookings: bookings.length,
            pendingBookings: bookings.filter(b => b.status === 'pending').length,
            totalQuotes: quotes.length,
            totalRevenue: bookings.reduce((sum, booking) => {
                const service = services.find(s => s.name === booking.service);
                return sum + (service ? service.price : 0);
            }, 0)
        };
        sendJSON(res, 200, stats);
    }
    
    // 404 Not Found
    else {
        sendJSON(res, 404, { error: 'Not Found' });
    }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log('🚀 Hunter Autoworks Simple Backend Server Started!');
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log('🔧 Available Endpoints:');
    console.log('   GET  /api/services     - Get all services');
    console.log('   POST /api/bookings     - Create new booking');
    console.log('   GET  /api/bookings     - Get all bookings');
    console.log('   POST /api/quotes       - Create quote request');
    console.log('   GET  /api/quotes       - Get all quotes');
    console.log('   POST /api/admin/login  - Admin login');
    console.log('   GET  /api/admin/stats  - Admin statistics');
    console.log('\n👨‍💼 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n✅ Server ready for testing!');
});
