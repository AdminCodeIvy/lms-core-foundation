# Land Management System (LMS)

A comprehensive Land Management System for Jigjiga City, built with React (Frontend) and Node.js/Express (Backend), integrated with Supabase and ArcGIS Online.

## 🏗️ Project Structure

```
LMS/
├── LMS_Frontend/          # Frontend (React + TypeScript + Vite)
└── LMS_Backend/           # Backend (Node.js + Express + TypeScript)
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

**INPUTTER (Surveyor)**
- Create/edit draft records
- Submit for approval
- View own records

**APPROVER**
- Access review queue
- Approve/reject submissions
- Edit during review
- Export reports

**ADMINISTRATOR**
- Full system access
- Bulk uploads
- User/lookup management
- Archive/unarchive records

**VIEWER**
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

# Start development server
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd LMS_Frontend

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env
# Edit .env with backend API URL

# Start development server
npm run dev
```

Frontend runs on `http://localhost:8080`

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
- Row Level Security enabled
- Real-time subscriptions support

### Integrations
- **ArcGIS Online** - GIS publishing
- **Supabase Storage** - File uploads

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:8080,http://localhost:3000
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 📚 API Documentation

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET  /api/v1/auth/session`
- `POST /api/v1/auth/logout`

### Customers
- `GET    /api/v1/customers`
- `POST   /api/v1/customers`
- `GET    /api/v1/customers/:id`
- `PUT    /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`
- `POST   /api/v1/customers/:id/submit`
- `POST   /api/v1/customers/:id/archive`

### Properties
- `GET    /api/v1/properties`
- `POST   /api/v1/properties`
- `GET    /api/v1/properties/:id`
- `PUT    /api/v1/properties/:id`
- `DELETE /api/v1/properties/:id`
- `POST   /api/v1/properties/:id/archive`

### Tax Assessments
- `GET    /api/v1/tax`
- `POST   /api/v1/tax`
- `GET    /api/v1/tax/:id`
- `PUT    /api/v1/tax/:id`
- `DELETE /api/v1/tax/:id`
- `POST   /api/v1/tax/:assessmentId/payment`

### Workflow
- `GET  /api/v1/workflow/review-queue`
- `POST /api/v1/workflow/customers/:id/approve`
- `POST /api/v1/workflow/customers/:id/reject`
- `POST /api/v1/workflow/properties/:id/approve`
- `POST /api/v1/workflow/properties/:id/reject`

### Bulk Upload (Admin only)
- `POST /api/v1/bulk-upload/validate`
- `POST /api/v1/bulk-upload/commit`
- `GET  /api/v1/bulk-upload/template/:entityType`

### Admin
- `GET    /api/v1/admin/users`
- `POST   /api/v1/admin/users`
- `PUT    /api/v1/admin/users/:id`
- `DELETE /api/v1/admin/users/:id`
- `GET    /api/v1/admin/audit-logs`
- `GET    /api/v1/admin/lookups`
- `POST   /api/v1/admin/lookups`

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

## 📦 Deployment

### Backend Deployment
```bash
cd LMS_Backend
npm run build
npm start
```

### Frontend Deployment
```bash
cd LMS_Frontend
npm run build
# Deploy dist/ folder to your hosting service
```

## 🧪 Testing

### Backend Tests
```bash
cd LMS_Backend
npm test
```

### Frontend Tests
```bash
cd LMS_Frontend
npm test
```

## 📝 License

This project is proprietary software developed for Jigjiga City Administration.

## 👥 Team

Developed by the Jigjiga City LMS Development Team

## 📞 Support

For support and questions, please contact the development team.
