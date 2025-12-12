# Hunter Autoworks Backend API

Node.js backend API for Hunter Autoworks booking system with PostgreSQL database.

## Features

- **Bookings API**: Complete booking management
- **Services API**: Service catalog with pricing
- **Admin Authentication**: JWT-based admin login
- **Quotes API**: Quote request management
- **PostgreSQL Database**: Persistent data storage

## Environment Variables

```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-secret-key
PORT=5000
```

## Railway Deployment

1. Push this code to GitHub
2. Connect to Railway
3. Auto-deploy with PostgreSQL database
4. Get live API URL

## API Endpoints

### Public
- `GET /api/services` - Get all services
- `POST /api/bookings` - Create booking
- `POST /api/quotes` - Create quote
- `POST /api/admin/login` - Admin login

### Protected (Admin)
- `GET /api/bookings` - Get all bookings
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking
- `GET /api/quotes` - Get all quotes
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote

## Default Admin
- Username: `hunter`
- Password: `hunter_admin1234`

## Database Schema

Automatically creates PostgreSQL tables:
- `bookings` - Customer bookings
- `quotes` - Quote requests  
- `services` - Service catalog
- `admins` - Admin users
