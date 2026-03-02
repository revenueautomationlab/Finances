# Supabase Migration Guide

This guide explains how to migrate your RAL Finance application from local JSON storage to PostgreSQL via Supabase.

## Prerequisites

1. A Supabase account (https://supabase.com)
2. Node.js installed locally
3. Your current application data in `db.json`

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Go to **Project Settings > API** to find:
   - `Project URL` (your Supabase URL)
   - `anon public` key (your Supabase Key)

## Step 2: Create Database Tables

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy all SQL from `migrations/001_create_tables.sql`
4. Run the query

### Option B: Using psql

```bash
psql postgresql://[user]:[password]@[host]/postgres < migrations/001_create_tables.sql
```

## Step 3: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 4: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Migrate Data from JSON to Supabase

```bash
node migrate-to-supabase.js
```

This script will:

- Clear existing data from Supabase tables
- Import all projects, payments, expenses, and spending from `db.json`
- Verify successful insertion

## Step 6: Update Your Application

You have two options for using Supabase in your app:

### Option A: Browser-based (Recommended for single-user apps)

Update your `App.jsx` to use the Supabase service:

```jsx
import { fetchState } from "./services/supabaseService";

// Instead of:
// const res = await fetch(API)
// Use:
const data = await fetchState();
```

### Option B: API Server (Recommended for multi-user apps)

Create a backend server using the `supabaseService.js` endpoints and update your fetch calls to point to your server.

## Step 7: Remove Local JSON API

Once data is migrated:

1. Remove the `dbPlugin` from `vite.config.js`
2. Delete `db.json` (or keep as backup)
3. Update `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  // ... rest of config
});
```

## Available Functions in supabaseService.js

### Read Data

- `fetchState()` - Get all projects, bank spending, and charity spending

### Projects

- `addProject(name, totalValue)`
- `updateProject(id, name, totalValue)`
- `deleteProject(id)`

### Payments

- `addPayment(projectId, amount, date, note)`
- `deletePayment(projectId, paymentId)`

### Expenses

- `addExpense(projectId, amount, date, description)`
- `deleteExpense(projectId, expenseId)`

### Bank Spending

- `addBankSpending(amount, date, description)`
- `deleteBankSpending(id)`

### Charity Spending

- `addCharitySpending(amount, date, description)`
- `deleteCharitySpending(id)`

## Database Schema

### projects

- `id` (text, primary key)
- `name` (varchar)
- `total_value` (decimal)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### payments

- `id` (text, primary key)
- `project_id` (text, foreign key)
- `amount` (decimal)
- `date` (date)
- `note` (text)

### expenses

- `id` (text, primary key)
- `project_id` (text, foreign key)
- `amount` (decimal)
- `date` (date)
- `description` (text)

### bank_spending

- `id` (text, primary key)
- `amount` (decimal)
- `date` (date)
- `description` (text)

### charity_spending

- `id` (text, primary key)
- `amount` (decimal)
- `date` (date)
- `description` (text)

## Troubleshooting

### Migration shows "Permission denied"

- Ensure your Supabase role has write permissions
- Check that tables were created successfully

### Data not appearing in app

- Verify `.env.local` has correct Supabase URL and key
- Check browser console for errors
- Ensure `migrate-to-supabase.js` ran successfully

### Slow queries

- Check that indexes were created in step 1
- Consider creating additional indexes for frequently filtered columns

## Backing Up Data

Before migration, export your current data:

```bash
cp db.json db.json.backup
```

## Rolling Back

If you need to revert:

1. Delete data from Supabase tables (via SQL Editor)
2. Use your `db.json.backup` file
3. Revert changes to your code
