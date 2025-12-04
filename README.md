# Land Management System (LMS)

A comprehensive Land Management System for Jigjiga City, built with React (Frontend) and Node.js/Express (Backend), integrated with Supabase and ArcGIS Online.

## 🏗️ Project Structure

```
LMS/
├── lms-core-foundation/     # Frontend (React + TypeScript + Vite)
└── LMS_Backend/             # Backend (Node.js + Express + TypeScript)
```

## ✨ Features

### Core Modules
- **Customer Management** - Manage 6 types of customers (Person, Business, Government, Mosque/Hospital, Non-Profit, Contractor)
- **Property Management** - Property records with GIS integration
- **Tax Assessment & Payment** - Tax management with payment tracking
- **Workflow System** - Submit → Review → Approve/Reject workflow
- **Bulk Upload** - Excel-based bulk data import
- **Audit Logging** - Complete audit trail for all operations
- **Role-Based Access Control** - 4 roles with specific permissions

### Role-Based Permissions

#### INPUTTER (Surveyor)
- Create/edit draft records
- Submit for approval
- View own records

#### APPROVER
- Access review queue
- Approve/reject submissions
- Edit during review
- Export reports

#### ADMINISTRATOR
- Full system access
- Bulk uploads
- User/lookup management
- Archive/unarchive records

#### VIEWER
- Read-only access to approved properties and tax assessments
- Card-based view interface

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (via Supabase)
- Git

### Backend Setup

```bash
cd LMS_Backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations (if needed)
npm run migrate

# Start development server
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd lms-core-foundation

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend API URL

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **React Router** - Navigation
- **Leaflet** - Map integration

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase** - Database & Auth
- **JWT** - Authentication
- **Winston** - Logging
- **XLSX** - Excel processing

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security** enabled
- **Real-time subscriptions** support

### Integrations
- **ArcGIS Online** - GIS publishing
- **Supabase Storage** - File uploads

## 📁 Key Directories

### Backend (`LMS_Backend/`)
```
src/
├── config/          # Database & app configuration
├── controllers/     # Request handlers
├── middleware/      # Auth, error handling
├── routes/          # API routes
├── services/        # Business logic
└── types/           # TypeScript types
```

### Frontend (`lms-core-foundation/`)
```
src/
├── components/      # Reusable components
├── contexts/        # React contexts
├── pages/           # Page components
├── services/        # API services
├── lib/             # Utilities
└── types/           # TypeScript types
```

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# ArcGIS (optional)
ARCGIS_CLIENT_ID=your_client_id
ARCGIS_CLIENT_SECRET=your_client_secret
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 📚 API Documentation

### Authentication
```bash
POST /api/v1/auth/login
POST /api/v1/auth/register
GET  /api/v1/auth/session
POST /api/v1/auth/logout
```

### Customers
```bash
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id
POST   /api/v1/customers/:id/submit
POST   /api/v1/customers/:id/archive
```

### Properties
```bash
GET    /api/v1/properties
POST   /api/v1/properties
GET    /api/v1/properties/:id
PUT    /api/v1/properties/:id
DELETE /api/v1/properties/:id
POST   /api/v1/properties/:id/archive
```

### Tax Assessments
```bash
GET    /api/v1/tax
POST   /api/v1/tax
GET    /api/v1/tax/:id
PUT    /api/v1/tax/:id
DELETE /api/v1/tax/:id
POST   /api/v1/tax/:assessmentId/payment
```

### Workflow
```bash
GET  /api/v1/workflow/review-queue
POST /api/v1/workflow/customers/:id/approve
POST /api/v1/workflow/customers/:id/reject
POST /api/v1/workflow/properties/:id/approve
POST /api/v1/workflow/properties/:id/reject
```

### Bulk Upload (Admin only)
```bash
POST /api/v1/bulk-upload/validate
POST /api/v1/bulk-upload/commit
GET  /api/v1/bulk-upload/template/:entityType
```

### Admin
```bash
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/lookups
POST   /api/v1/admin/lookups
```

## 🧪 Testing

### Backend Tests
```bash
cd LMS_Backend
npm test
```

### Frontend Tests
```bash
cd lms-core-foundation
npm test
```

## 📦 Deployment

### Backend Deployment
```bash
cd LMS_Backend
npm run build
npm start
```

### Frontend Deployment
```bash
cd lms-core-foundation
npm run build
# Deploy dist/ folder to your hosting service
```

## 🔄 Workflow

1. **INPUTTER** creates draft records
2. **INPUTTER** submits for approval
3. **APPROVER** reviews in queue
4. **APPROVER** approves/rejects with feedback
5. On approval → Publishes to ArcGIS Online
6. **VIEWER** can see approved records

## 🛡️ Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Row-level security in database
- Audit logging for all operations
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation

## 📊 Database Schema

### Main Tables
- `users` - User accounts and roles
- `customers` - Customer master records
- `customer_person` - Person-type customer details
- `customer_business` - Business-type customer details
- `customer_government` - Government-type customer details
- `customer_mosque_hospital` - Mosque/Hospital details
- `customer_non_profit` - Non-profit details
- `customer_contractor` - Contractor details
- `properties` - Property records
- `tax_assessments` - Tax assessment records
- `tax_payments` - Payment records
- `audit_logs` - Audit trail
- `activity_logs` - Activity tracking
- `notifications` - User notifications
- `lookups` - System lookups (districts, carriers, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed for Jigjiga City Administration.

## 👥 Team

Developed by the Jigjiga City LMS Development Team

## 📞 Support

For support and questions, please contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** December 2025
