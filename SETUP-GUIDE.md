# LMS Phase 1 Setup Guide

## 🚀 Quick Start

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Click "New Project"
4. Fill in:
   - **Project Name**: `LMS Jigjiga` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait ~2 minutes for provisioning

---

### Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
3. Keep this page open - you'll need these values in Step 4

---

### Step 3: Run the Database Migration

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"+ New Query"**
3. Open the file `supabase-migration.sql` from this project
4. Copy ALL the contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. Wait for the migration to complete (~30 seconds)
7. You should see a success message

**What this does:**
- Creates all database tables (users, customers, properties, tax, etc.)
- Sets up Row Level Security (RLS) policies
- Creates lookup tables with sample data
- Adds districts, carriers, property types
- Sets up helper functions

---

### Step 4: Configure Your Application

1. In your project root, create a file named `.env`
2. Copy the contents from `.env.example`
3. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Save the file

---

### Step 5: Create Your First Admin User

Since this is a fresh installation, you need to create your first administrator account manually:

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: `admin@lms.com` (or your preferred email)
   - **Password**: `Admin123!` (or create your own secure password)
   - **Auto Confirm User**: ✅ Check this box
4. Click **"Create user"**
5. Now you need to set the user's role. Go to **SQL Editor** and run:

```sql
-- Replace 'admin@lms.com' with your actual admin email
UPDATE public.users 
SET role = 'ADMINISTRATOR', 
    full_name = 'System Administrator'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@lms.com'
);
```

---

### Step 6: Start the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:8080`

4. Login with your admin credentials:
   - **Email**: `admin@lms.com` (or whatever you used)
   - **Password**: `Admin123!` (or whatever you set)

---

## ✅ Verify Setup

After logging in, you should see:

1. **Dashboard** with welcome message and your role
2. **Sidebar** showing all menu items (including Admin sections)
3. **User Management** page working
4. **Lookup Management** page with tabs for Districts, Carriers, etc.

---

## 🔐 Security Configuration (Important!)

### Disable Email Confirmation for Testing

For faster testing during development, you can disable email confirmation:

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. **Uncheck** "Enable email confirmations"
4. Click **Save**

**Note**: Re-enable this before production deployment!

---

## 📊 What's Included in Phase 1

### Database Tables Created:
- ✅ Users (with roles)
- ✅ Customers (all 6 types)
- ✅ Properties
- ✅ Property Boundaries, Photos, Ownership
- ✅ Tax Assessments, Payments, Renter Details
- ✅ Activity Logs (audit trail)
- ✅ Notifications
- ✅ Lookup Tables (Districts, Sub-Districts, Property Types, Carriers, Countries)

### Features Implemented:
- ✅ Authentication (Login, Logout, Password Reset)
- ✅ Role-Based Access Control (4 roles)
- ✅ User Management (Admin only)
- ✅ Lookup Management (Admin only)
- ✅ Dashboard with statistics
- ✅ Responsive layout with sidebar navigation

### Seed Data Included:
- 4 Districts (Jigjiga, Hargeisa, Dire Dawa, Addis Ababa)
- 4 Carriers (Ethio Telecom, Safaricom, Telesom, Hormuud)
- 11 Property Types (Residential, Commercial, Industrial, etc.)
- 6 Countries (Ethiopia, Somalia, Djibouti, Kenya, US, UK)

---

## 🎯 Next Steps (Future Phases)

Phase 1 establishes the foundation. Future phases will add:

- **Phase 2**: Customer CRUD operations with workflow
- **Phase 3**: Property CRUD operations with map integration
- **Phase 4**: Tax assessment and payment tracking
- **Phase 5**: Bulk upload, reports, and advanced features

---

## 🆘 Troubleshooting

### "Missing environment variables" error
- Make sure `.env` file exists in project root
- Verify the credentials are correct (no extra spaces)
- Restart the dev server after creating `.env`

### Can't login / "Invalid credentials" error
- Verify you created the admin user in Supabase Auth
- Check the email/password are correct
- Make sure you ran the UPDATE query to set the role to 'ADMINISTRATOR'

### "Failed to fetch" or connection errors
- Verify your Supabase project is running (not paused)
- Check your internet connection
- Verify the VITE_SUPABASE_URL is correct

### Database tables not showing
- Make sure you ran the complete `supabase-migration.sql`
- Check for errors in the SQL Editor
- Verify the migration completed successfully

### Navigation menu items missing
- Verify your user role is set correctly
- Run this SQL to check your role:
```sql
SELECT u.email, p.role, p.is_active 
FROM auth.users u
JOIN public.users p ON u.id = p.id
WHERE u.email = 'your-email@example.com';
```

---

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the Supabase logs in your dashboard
3. Verify all migration steps completed successfully
4. Make sure your `.env` file has the correct credentials

---

## 🎉 Success!

Once you can login and see the dashboard, Phase 1 is complete! You now have:
- A secure authentication system
- Role-based access control
- Complete database schema ready for future phases
- Admin tools for user and lookup management

Ready to build Phase 2! 🚀
