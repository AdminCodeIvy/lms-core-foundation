# LMS Backend API

Land Management System Backend - Node.js/Express REST API with WebSocket support

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT
- **Realtime:** Socket.io
- **Validation:** Joi
- **Logging:** Winston + Morgan

## Project Structure

```
LMS_Backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models/types
│   ├── routes/          # API routes (versioned)
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Request validation schemas
│   ├── websocket/       # WebSocket handlers
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── uploads/             # File uploads directory
├── .env                 # Environment variables
└── package.json
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

### 3. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm start
```

## API Documentation

Base URL: `http://localhost:3000/api/v1`

### Authentication Endpoints

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/session` - Get current session
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/reset-password` - Reset password

### Customer Endpoints

- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/:id` - Get customer details
- `POST /api/v1/customers` - Create customer
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer
- `POST /api/v1/customers/:id/submit` - Submit for approval
- `PATCH /api/v1/customers/:id/archive` - Archive customer

### Property Endpoints

- `GET /api/v1/properties` - List properties
- `GET /api/v1/properties/:id` - Get property details
- `POST /api/v1/properties` - Create property
- `PUT /api/v1/properties/:id` - Update property
- `DELETE /api/v1/properties/:id` - Delete property

### Tax Endpoints

- `GET /api/v1/tax/assessments` - List tax assessments
- `GET /api/v1/tax/assessments/:id` - Get assessment details
- `POST /api/v1/tax/assessments` - Create assessment
- `POST /api/v1/tax/assessments/:id/payments` - Record payment

### Admin Endpoints

- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/users` - Create user
- `PUT /api/v1/admin/users/:id` - Update user
- `GET /api/v1/admin/audit-logs` - View audit logs

## WebSocket Events

Connect to: `ws://localhost:3000`

### Events

- `customers:created` - New customer created
- `customers:updated` - Customer updated
- `customers:deleted` - Customer deleted
- `properties:created` - New property created
- `properties:updated` - Property updated
- `notifications:new` - New notification

## Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- SQL injection prevention
- XSS protection

## License

MIT
