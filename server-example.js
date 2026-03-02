/**
 * Alternative Backend Setup: Express.js Server with Supabase
 *
 * This is an example of how to create a backend server that handles
 * all Supabase operations. This is more robust for multi-user scenarios.
 *
 * Installation:
 * npm install express cors @supabase/supabase-js dotenv
 *
 * Usage:
 * 1. Create a .env file with Supabase credentials
 * 2. Run: node server.js
 * 3. Update your App.jsx to use http://localhost:3001 instead of /api/data
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role for server-side operations
);

// ============= API ENDPOINTS =============

// GET all data
app.get("/api/data", async (req, res) => {
  try {
    const [
      { data: projects },
      { data: bankSpending },
      { data: charitySpending },
    ] = await Promise.all([
      supabase.from("projects").select("*, payments(*), expenses(*)"),
      supabase.from("bank_spending").select("*"),
      supabase.from("charity_spending").select("*"),
    ]);

    // Transform database format to app format
    const transformedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      totalValue: parseFloat(p.total_value),
      payments: (p.payments || []).map((pay) => ({
        id: pay.id,
        amount: parseFloat(pay.amount),
        date: pay.date,
        note: pay.note,
      })),
      expenses: (p.expenses || []).map((exp) => ({
        id: exp.id,
        amount: parseFloat(exp.amount),
        date: exp.date,
        description: exp.description,
      })),
      createdAt: p.created_at,
    }));

    res.json({
      projects: transformedProjects,
      bankSpending: (bankSpending || []).map((b) => ({
        id: b.id,
        amount: parseFloat(b.amount),
        date: b.date,
        description: b.description,
      })),
      charitySpending: (charitySpending || []).map((c) => ({
        id: c.id,
        amount: parseFloat(c.amount),
        date: c.date,
        description: c.description,
      })),
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// POST save state / perform operations
app.post("/api/data", async (req, res) => {
  try {
    const { operation, data } = req.body;

    switch (operation) {
      // Projects
      case "addProject":
        const project = await addProjectOp(data);
        res.json(project);
        break;

      case "updateProject":
        await updateProjectOp(data.id, data.name, data.totalValue);
        res.json({ ok: true });
        break;

      case "deleteProject":
        await deleteProjectOp(data.id);
        res.json({ ok: true });
        break;

      // Payments
      case "addPayment":
        const payment = await addPaymentOp(
          data.projectId,
          data.amount,
          data.date,
          data.note,
        );
        res.json(payment);
        break;

      case "deletePayment":
        await deletePaymentOp(data.paymentId);
        res.json({ ok: true });
        break;

      // Expenses
      case "addExpense":
        const expense = await addExpenseOp(
          data.projectId,
          data.amount,
          data.date,
          data.description,
        );
        res.json(expense);
        break;

      case "deleteExpense":
        await deleteExpenseOp(data.expenseId);
        res.json({ ok: true });
        break;

      // Bank Spending
      case "addBankSpending":
        const bankSpending = await addBankSpendingOp(
          data.amount,
          data.date,
          data.description,
        );
        res.json(bankSpending);
        break;

      case "deleteBankSpending":
        await deleteBankSpendingOp(data.id);
        res.json({ ok: true });
        break;

      // Charity Spending
      case "addCharitySpending":
        const charitySpending = await addCharitySpendingOp(
          data.amount,
          data.date,
          data.description,
        );
        res.json(charitySpending);
        break;

      case "deleteCharitySpending":
        await deleteCharitySpendingOp(data.id);
        res.json({ ok: true });
        break;

      default:
        res.status(400).json({ error: "Unknown operation" });
    }
  } catch (error) {
    console.error("Error in operation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= OPERATION FUNCTIONS =============

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function addProjectOp(data) {
  const { data: result, error } = await supabase
    .from("projects")
    .insert([
      {
        id: generateId(),
        name: data.name,
        total_value: data.totalValue,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

async function updateProjectOp(id, name, totalValue) {
  const { error } = await supabase
    .from("projects")
    .update({ name, total_value: totalValue })
    .eq("id", id);

  if (error) throw error;
}

async function deleteProjectOp(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) throw error;
}

async function addPaymentOp(projectId, amount, date, note) {
  const { data: result, error } = await supabase
    .from("payments")
    .insert([
      {
        id: generateId(),
        project_id: projectId,
        amount,
        date,
        note,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

async function deletePaymentOp(paymentId) {
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) throw error;
}

async function addExpenseOp(projectId, amount, date, description) {
  const { data: result, error } = await supabase
    .from("expenses")
    .insert([
      {
        id: generateId(),
        project_id: projectId,
        amount,
        date,
        description,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

async function deleteExpenseOp(expenseId) {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) throw error;
}

async function addBankSpendingOp(amount, date, description) {
  const { data: result, error } = await supabase
    .from("bank_spending")
    .insert([
      {
        id: generateId(),
        amount,
        date,
        description,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

async function deleteBankSpendingOp(id) {
  const { error } = await supabase.from("bank_spending").delete().eq("id", id);

  if (error) throw error;
}

async function addCharitySpendingOp(amount, date, description) {
  const { data: result, error } = await supabase
    .from("charity_spending")
    .insert([
      {
        id: generateId(),
        amount,
        date,
        description,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

async function deleteCharitySpendingOp(id) {
  const { error } = await supabase
    .from("charity_spending")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Finance API server running on http://localhost:${PORT}`);
  console.log("📡 Connect your app to /api/data");
});
