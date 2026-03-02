# Code Integration - What Changed

This document shows the exact code changes made to integrate Supabase.

---

## 1. Import Supabase Functions (App.jsx - Top)

**BEFORE:**
```jsx
import React, { useState, useEffect, useMemo } from 'react'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
// ... rest of imports
const API = '/api/data'

async function fetchState() {
  try {
    const res = await fetch(API)
    const data = await res.json()
    return { ...initialState, ...data }
  } catch { return initialState }
}

async function saveState(data) {
  try {
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  } catch (e) { console.error('Failed to save:', e) }
}
```

**AFTER:**
```jsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  fetchState as fetchStateFromDB,
  addProject as dbAddProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  addPayment as dbAddPayment,
  deletePayment as dbDeletePayment,
  addExpense as dbAddExpense,
  deleteExpense as dbDeleteExpense,
  addBankSpending as dbAddBankSpending,
  deleteBankSpending as dbDeleteBankSpending,
  addCharitySpending as dbAddCharitySpending,
  deleteCharitySpending as dbDeleteCharitySpending,
} from './services/supabaseService'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
```

---

## 2. Initialize with Supabase Data (App.jsx - useEffect)

**BEFORE:**
```jsx
useEffect(() => { 
  fetchState().then(data => { setState(data); setLoaded(true) }) 
}, [])
useEffect(() => { 
  if (loaded) saveState(state) 
}, [state, loaded])
```

**AFTER:**
```jsx
// Load data from Supabase on mount
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchStateFromDB()
      setState(data)
      setLoaded(true)
    } catch (error) {
      console.error('Failed to load data:', error)
      setLoaded(true) // Still load even if error
    }
  }
  loadData()
}, [])

const refreshData = async () => {
  try {
    const data = await fetchStateFromDB()
    setState(data)
  } catch (error) {
    console.error('Failed to refresh data:', error)
  }
}
```

**Key change:** No more auto-save effect. Data only writes when user takes action.

---

## 3. Async CRUD Operations

**EXAMPLE - Add Project**

**BEFORE (Local):**
```jsx
const addProject = (name, totalValue) => {
  updateProjects(ps => [...ps, { 
    id: uid(), 
    name, 
    totalValue: Number(totalValue), 
    payments: [], 
    expenses: [], 
    createdAt: new Date().toISOString() 
  }])
  showToast('Project created')
}
```

**AFTER (Database):**
```jsx
const addProject = async (name, totalValue) => {
  try {
    await dbAddProject(name, totalValue)
    await refreshData()
    showToast('Project created')
  } catch (error) {
    console.error('Failed to add project:', error)
    showToast('Failed to create project', 'error')
  }
}
```

**Same pattern for all operations:**
- Delete Project
- Add Payment
- Delete Payment
- Add Expense
- Delete Expense
- Add Bank Spending
- Delete Bank Spending
- Add Charity Spending
- Delete Charity Spending

---

## 4. Vite Config Cleanup

**BEFORE:**
```javascript
// 40+ lines of database plugin code
function dbPlugin() {
  return {
    name: "db-plugin",
    configureServer(server) {
      server.middlewares.use("/api/data", (req, res) => {
        // ... middleware code
      })
      // ... more middleware
    },
  };
}

export default defineConfig({
  plugins: [react(), dbPlugin()],  // ← dbPlugin removed
  // ...
})
```

**AFTER:**
```javascript
export default defineConfig({
  plugins: [react()],  // Clean and simple
  server: {
    middlewareMode: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

---

## 5. Supabase Service - Environment Variables

**BEFORE:**
```javascript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL  // ❌ Wrong for browser
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY  // ❌ Wrong
```

**AFTER:**
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL  // ✅ Correct for Vite
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY  // ✅ Correct

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please check your .env.local file.')
}
```

---

## 6. Data Flow Comparison

### Local JSON Approach (OLD)
```
User Action
    ↓
Update React State Optimistically
    ↓
Append to state array
    ↓
Auto-save triggers
    ↓
POST entire state to /api/data
    ↓
Write to db.json
    ↓
(No guarantee of persistence)
```

### Supabase Approach (NEW)
```
User Action
    ↓
Call Supabase function (async)
    ↓
Database insert/update/delete
    ↓
Call refreshData()
    ↓
Fetch fresh state from database
    ↓
Update React state
    ↓
UI re-renders with database truth
    ↓
Toast shows result
    ↓
Guaranteed persistence ✅
```

---

## 7. Error Handling

**BEFORE:**
```jsx
const deleteProject = (id) => {
  if (!confirm('Delete this project?')) return
  updateProjects(ps => ps.filter(p => p.id !== id))  // No error handling
  showToast('Project deleted', 'error')
}
```

**AFTER:**
```jsx
const deleteProject = async (id) => {
  if (!confirm('Delete this project and all its data?')) return
  try {
    await dbDeleteProject(id)  // Database operation
    if (selectedProjectId === id) { setSelectedProjectId(null); setView('dashboard') }
    await refreshData()  // Refresh data from DB
    showToast('Project deleted', 'error')
  } catch (error) {
    console.error('Failed to delete project:', error)
    showToast('Failed to delete project', 'error')  // User feedback
  }
}
```

---

## 8. Package.json - Dependencies Added

**BEFORE:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.98.0",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**AFTER:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.98.0",
    "cors": "^2.8.6",
    "dotenv": "^16.0.3",  // ← Added for migration script
    "express": "^5.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Storage** | `db.json` file | Supabase PostgreSQL |
| **API** | Local `/api/data` endpoint | Supabase service functions |
| **Network** | HTTP fetch to local server | HTTPS to Supabase |
| **Auto-save** | Every state change | Only on user action |
| **Reliability** | File system dependent | Database transactions |
| **Scalability** | Single file (limited) | Full PostgreSQL (scalable) |
| **Backup** | Manual | Automatic daily |
| **Code** | Simpler (synchronous) | More robust (async/await) |

---

## What Each File Does Now

### `src/App.jsx`
- **Role**: UI and business logic
- **Calls**: Supabase service functions
- **Behavior**: Async operations with error handling
- **Data**: Always in sync with database

### `src/services/supabaseService.js`
- **Role**: Database abstraction layer
- **Exports**: All CRUD functions
- **Handles**: Data transformation (JSON ↔ PostgreSQL)
- **Security**: Uses Anon Key for client access

### `vite.config.js`
- **Role**: Build configuration
- **Removed**: Local API plugin
- **Keeps**: React plugin and build settings
- **Result**: Cleaner, simpler config

### `.env.local`
- **Role**: Environment variables
- **Contains**: Supabase URL and Anon Key
- **Loaded**: By Vite at build time
- **Security**: Never exposed to public

---

## Testing the Integration

### 1. Check Browser Console
```javascript
// Open DevTools: F12
// Go to Console tab
// You should see no errors about Supabase
```

### 2. Check Network Requests
```
1. Open DevTools: F12
2. Go to Network tab
3. Click "New Project"
4. Look for requests to "supabase.co"
5. Should see successful POST request
```

### 3. Check Supabase Dashboard
```
1. Open https://app.supabase.com
2. Select your project
3. Go to "SQL Editor"
4. Run: SELECT * FROM projects;
5. Should see your new project
```

---

## How to Extend

If you want to add a new feature:

1. **Create database table** in Supabase SQL Editor
2. **Add function** to `supabaseService.js`
3. **Add state** to `App.jsx` (useMemo or useState)
4. **Add handler** for CRUD operations
5. **Add UI** component to trigger the handler

Example pattern:
```jsx
// In supabaseService.js
export async function newFeature(data) {
  const { data: result, error } = await supabase
    .from('new_table')
    .insert([{ ...data }])
    .select()
  
  if (error) throw error
  return result[0]
}

// In App.jsx
const handleNewFeature = async (data) => {
  try {
    await newFeature(data)
    await refreshData()
    showToast('Success!')
  } catch (error) {
    showToast('Error: ' + error.message, 'error')
  }
}
```

---

That's it! Full integration complete. 🎉
