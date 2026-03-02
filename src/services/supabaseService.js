/**
 * Updated backend API service for Supabase
 * Replace the db-plugin in vite.config.js with API calls to this service
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase credentials. Please check your .env.local file.",
  );
  console.error("VITE_SUPABASE_URL:", SUPABASE_URL);
  console.error("VITE_SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export supabase instance for use in other modules (like AuthContext)
export { supabase };
export async function fetchState() {
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

    // Transform database format to application format
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

    return {
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
    };
  } catch (error) {
    console.error("Error fetching state:", error);
    throw error;
  }
}

// Save state (used for updates)
export async function saveState(data) {
  try {
    // This function would handle bulk updates
    // For now, individual operations are handled by specific functions below
    return { ok: true };
  } catch (error) {
    console.error("Error saving state:", error);
    throw error;
  }
}

// Project operations
export async function addProject(name, totalValue) {
  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        id: generateId(),
        name,
        total_value: totalValue,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateProject(id, name, totalValue) {
  const { error } = await supabase
    .from("projects")
    .update({ name, total_value: totalValue })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) throw error;
}

// Payment operations
export async function addPayment(projectId, amount, date, note) {
  const { data, error } = await supabase
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
  return data[0];
}

export async function deletePayment(projectId, paymentId) {
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) throw error;
}

// Expense operations
export async function addExpense(projectId, amount, date, description) {
  const { data, error } = await supabase
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
  return data[0];
}

export async function deleteExpense(projectId, expenseId) {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) throw error;
}

// Bank spending operations
export async function addBankSpending(amount, date, description) {
  const { data, error } = await supabase
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
  return data[0];
}

export async function deleteBankSpending(id) {
  const { error } = await supabase.from("bank_spending").delete().eq("id", id);

  if (error) throw error;
}

// Charity spending operations
export async function addCharitySpending(amount, date, description) {
  const { data, error } = await supabase
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
  return data[0];
}

export async function deleteCharitySpending(id) {
  const { error } = await supabase
    .from("charity_spending")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Utility function to generate IDs (same as in App.jsx)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
