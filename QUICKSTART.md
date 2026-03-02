# Quick Start: Migrating to Supabase

## 5-Minute Setup

### 1. Create Supabase Project
- Go to https://supabase.com and create a new project
- Save your **Project URL** and **Anon Key** from Settings > API

### 2. Create Database Tables
- Go to **SQL Editor** in Supabase
- Copy-paste contents of `migrations/001_create_tables.sql`
- Click **Run**

### 3. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 4. Add Environment Variables
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

### 5. Migrate Your Data
```bash
node migrate-to-supabase.js
```

That's it! Your data is now in PostgreSQL.

---

## What's Included

| File | Purpose |
|------|---------|
| `migrations/001_create_tables.sql` | Database schema for PostgreSQL |
| `migrate-to-supabase.js` | Script to import data from db.json |
| `src/services/supabaseService.js` | Client library for Supabase operations |
| `server-example.js` | Optional backend API server |
| `SUPABASE_MIGRATION.md` | Full migration guide |
| `SUPABASE_INTEGRATION_EXAMPLE.js` | Code examples for App.jsx |

---

## Next Steps

### Option A: Direct Browser Integration (Simplest)
Update `App.jsx` to import from `supabaseService.js`:
```jsx
import { fetchState, addProject, ... } from './services/supabaseService'
```

### Option B: Backend API Server (More Scalable)
1. Run `node server-example.js`
2. Update fetch calls to `http://localhost:3001/api/data`
3. Use same API as before - no frontend changes needed

---

## Troubleshooting

**Q: Migration script won't run?**
- Check Node.js is installed: `node --version`
- Check .env.local has correct credentials
- Check db.json exists in project root

**Q: Getting auth errors?**
- Verify Supabase URL format (should be `https://...`)
- Check you copied the ANON key, not the SERVICE ROLE key
- In Supabase SQL Editor, grants permissions to anon role

**Q: Data looks different after migration?**
- This is expected! Database stores `total_value` vs JSON's `totalValue`
- `supabaseService.js` handles transformation automatically
- Check migration ran successfully: `node migrate-to-supabase.js` shows summary

---

## File Structure After Setup

```
c:\Users\User\Desktop\RAL\Finances\
├── migrations/
│   └── 001_create_tables.sql
├── src/
│   ├── services/
│   │   └── supabaseService.js
│   ├── App.jsx
│   └── main.jsx
├── .env.local (created by you)
├── migrate-to-supabase.js
├── server-example.js (optional)
└── db.json (can delete after migration)
```

---

## Deployment to Netlify

No changes needed! Your app uses Supabase API which works from anywhere.

1. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Deploy normally:
```bash
npm run build
# Deploy dist/ folder
```

---

## Support

For detailed information, see:
- 📖 [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) - Complete guide
- 💻 [SUPABASE_INTEGRATION_EXAMPLE.js](SUPABASE_INTEGRATION_EXAMPLE.js) - Code examples
- 🔧 [server-example.js](server-example.js) - Backend server setup
- 📊 [migrations/001_create_tables.sql](migrations/001_create_tables.sql) - Database schema
