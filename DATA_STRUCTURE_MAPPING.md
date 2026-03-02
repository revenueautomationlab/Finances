# Data Structure: JSON vs PostgreSQL

## Overview

Your current `db.json` will be structured differently in PostgreSQL. This document shows the mapping.

## JSON Structure (Current)

```json
{
  "projects": [
    {
      "id": "mm457g4t2wqqsz8f0qd",
      "name": "Project Name",
      "totalValue": 500,
      "payments": [
        {
          "id": "mm4581opwydhkb1dvqn",
          "amount": 250,
          "date": "2026-02-27",
          "note": "payment note"
        }
      ],
      "expenses": [
        {
          "id": "mm458h9t4nrkx3r1v0n",
          "amount": 38,
          "date": "2026-02-27",
          "description": "expense description"
        }
      ],
      "createdAt": "2026-02-27T00:17:11.789Z"
    }
  ],
  "bankSpending": [
    {
      "id": "mm45951le3bdx78o6rm",
      "amount": 5,
      "date": "2026-02-27",
      "description": "spending description"
    }
  ],
  "charitySpending": [
    {
      "id": "...",
      "amount": 10,
      "date": "2026-02-27",
      "description": "charity spending"
    }
  ]
}
```

## PostgreSQL Structure (New)

### Table: `projects`
```sql
SELECT * FROM projects;

id                  | name          | total_value | created_at              | updated_at
--------------------|---------------|-------------|-------------------------|---
mm457g4t2wqqsz...  | Project Name  | 500.000     | 2026-02-27 00:17:11... | ...
```

### Table: `payments`
```sql
SELECT * FROM payments;

id                  | project_id              | amount  | date       | note
--------------------|-------------------------|---------|------------|------
mm4581opwydhkb...  | mm457g4t2wqqsz...      | 250.000 | 2026-02-27 | payment note
```

### Table: `expenses`
```sql
SELECT * FROM expenses;

id                  | project_id              | amount  | date       | description
--------------------|-------------------------|---------|------------|-------
mm458h9t4nrkx3r... | mm457g4t2wqqsz...      | 38.000  | 2026-02-27 | expense description
```

### Table: `bank_spending`
```sql
SELECT * FROM bank_spending;

id                  | amount  | date       | description
--------------------|---------|------------|-------
mm45951le3bdx7...  | 5.000   | 2026-02-27 | spending description
```

### Table: `charity_spending`
```sql
SELECT * FROM charity_spending;

id                  | amount  | date       | description
--------------------|---------|------------|-------
...                | 10.000  | 2026-02-27 | charity spending
```

## Data Type Mapping

| JSON Type | PostgreSQL Type | Notes |
|-----------|-----------------|-------|
| String ID | `TEXT` | Same format: `mm45951le3bdx7...` |
| Number ($) | `DECIMAL(15, 3)` | Stores up to 15 digits with 3 decimals |
| Date String | `DATE` | Format: YYYY-MM-DD |
| ISO Timestamp | `TIMESTAMP` | Format: YYYY-MM-DD HH:MM:SS |
| Text | `VARCHAR/TEXT` | Notes and descriptions |

## Key Differences

### Nested vs Normalized

**JSON (Nested):**
```
Project {
  payments: [
    { id, amount, date, note }
  ],
  expenses: [
    { id, amount, date, description }
  ]
}
```

**PostgreSQL (Normalized):**
```
Projects table
Payments table → linked by project_id
Expenses table → linked by project_id
```

### Benefits of PostgreSQL Structure

1. **Data Integrity**
   - Foreign key constraints ensure payments/expenses belong to valid projects
   - Can't delete a project without handling related payments

2. **Query Performance**
   - Indexes on frequently queried columns (project_id, date)
   - Faster filtering and sorting of large datasets

3. **Scalability**
   - Can handle millions of records efficiently
   - Easier to add features like reporting and analytics

4. **Backup & Recovery**
   - Professional backup tools and point-in-time recovery
   - Better disaster recovery options

## Automatic Transformation

The `supabaseService.js` file automatically converts between formats:

```javascript
// From database (snake_case):
{
  id: "mm45951le3bdx7..." ,
  project_id: "mm457g4t2wqqsz...",
  total_value: 500,
  created_at: "2026-02-27T00:17:11..."
}

// To frontend (camelCase):
{
  id: "mm45951le3bdx7...",
  projectId: "mm457g4t2wqqsz...",
  totalValue: 500,
  createdAt: "2026-02-27T00:17:11..."
}
```

**No changes needed in your React code!**

## Querying the Database

### List all projects with their payments
```sql
SELECT p.*, json_agg(pay.*) as payments
FROM projects p
LEFT JOIN payments pay ON p.id = pay.project_id
GROUP BY p.id;
```

### Find expenses for a specific project
```sql
SELECT * FROM expenses
WHERE project_id = 'mm457g4t2wqqsz...'
ORDER BY date DESC;
```

### Get total bank spending for a date range
```sql
SELECT SUM(amount) as total
FROM bank_spending
WHERE date BETWEEN '2026-02-01' AND '2026-02-28';
```

## Migration Verification

After running `migrate-to-supabase.js`, verify in Supabase SQL Editor:

```sql
-- Count projects
SELECT COUNT(*) FROM projects;

-- Count all payments
SELECT COUNT(*) FROM payments;

-- List all projects with payment count
SELECT p.name, COUNT(pay.id) as payment_count
FROM projects p
LEFT JOIN payments pay ON p.id = pay.project_id
GROUP BY p.id;
```

These should match your original data!
