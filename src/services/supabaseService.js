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
      { data: secretInvestmentSpending },
      { data: partnerWithdrawals },
      { data: budgets },
      { data: recurringRevenue },
      { data: recurringExpenses },
      { data: recurringRevenuePayments },
      { data: recurringExpensePayments },
    ] = await Promise.all([
      supabase.from("projects").select("*, payments(*), expenses(*)"),
      supabase.from("bank_spending").select("*"),
      supabase.from("secret_investment_spending").select("*"),
      supabase.from("partner_withdrawals").select("*"),
      supabase.from("budgets").select("*, budget_spending(*)"),
      supabase.from("recurring_revenue").select("*"),
      supabase.from("recurring_expenses").select("*"),
      supabase.from("recurring_revenue_payments").select("*"),
      supabase.from("recurring_expense_payments").select("*"),
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
      secretInvestmentSpending: (secretInvestmentSpending || []).map((c) => ({
        id: c.id,
        amount: parseFloat(c.amount),
        date: c.date,
        description: c.description,
      })),
      partnerWithdrawals: (partnerWithdrawals || []).map((w) => ({
        id: w.id,
        partnerName: w.partner_name,
        amount: parseFloat(w.amount),
        date: w.date,
        note: w.note,
      })),
      budgets: (budgets || []).map((b) => ({
        id: b.id,
        name: b.name,
        allocatedAmount: parseFloat(b.allocated_amount),
        description: b.description,
        spending: (b.budget_spending || []).map((s) => ({
          id: s.id,
          amount: parseFloat(s.amount),
          date: s.date,
          description: s.description,
        })),
        createdAt: b.created_at,
      })),
      recurringRevenue: (recurringRevenue || []).map((r) => ({
        id: r.id,
        projectId: r.project_id,
        amount: parseFloat(r.amount),
        frequency: r.frequency,
        description: r.description,
        startDate: r.start_date,
        nextDue: r.next_due,
        active: r.active,
        createdAt: r.created_at,
      })),
      recurringExpenses: (recurringExpenses || []).map((r) => ({
        id: r.id,
        projectId: r.project_id,
        amount: parseFloat(r.amount),
        frequency: r.frequency,
        description: r.description,
        startDate: r.start_date,
        nextDue: r.next_due,
        active: r.active,
        createdAt: r.created_at,
      })),
      recurringRevenuePayments: (recurringRevenuePayments || []).map((rp) => ({
        id: rp.id,
        recurringRevenueId: rp.recurring_revenue_id,
        projectId: rp.project_id,
        periodDate: rp.period_date,
        amount: parseFloat(rp.amount),
        note: rp.note,
        createdAt: rp.created_at,
      })),
      recurringExpensePayments: (recurringExpensePayments || []).map((ep) => ({
        id: ep.id,
        recurringExpenseId: ep.recurring_expense_id,
        projectId: ep.project_id,
        periodDate: ep.period_date,
        amount: parseFloat(ep.amount),
        note: ep.note,
        createdAt: ep.created_at,
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

// Secret investment spending operations
export async function addSecretInvestmentSpending(amount, date, description) {
  const { data, error } = await supabase
    .from("secret_investment_spending")
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

export async function deleteSecretInvestmentSpending(id) {
  const { error } = await supabase
    .from("secret_investment_spending")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Partner withdrawal operations
export async function addPartnerWithdrawal(partnerName, amount, date, note) {
  const { data, error } = await supabase
    .from("partner_withdrawals")
    .insert([
      {
        id: generateId(),
        partner_name: partnerName,
        amount,
        date,
        note: note || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function deletePartnerWithdrawal(id) {
  const { error } = await supabase
    .from("partner_withdrawals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Budget operations
export async function addBudget(name, allocatedAmount, description) {
  const { data, error } = await supabase
    .from("budgets")
    .insert([
      {
        id: generateId(),
        name,
        allocated_amount: allocatedAmount,
        description: description || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateBudget(id, name, allocatedAmount, description) {
  const { error } = await supabase
    .from("budgets")
    .update({ name, allocated_amount: allocatedAmount, description: description || null })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBudget(id) {
  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) throw error;
}

// Budget spending operations
export async function addBudgetSpending(budgetId, amount, date, description) {
  const { data, error } = await supabase
    .from("budget_spending")
    .insert([
      {
        id: generateId(),
        budget_id: budgetId,
        amount,
        date,
        description,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function deleteBudgetSpending(id) {
  const { error } = await supabase
    .from("budget_spending")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Recurring revenue operations
export async function addRecurringRevenue(projectId, amount, frequency, description, startDate) {
  const { data, error } = await supabase
    .from("recurring_revenue")
    .insert([
      {
        id: generateId(),
        project_id: projectId || null,
        amount,
        frequency,
        description,
        start_date: startDate || null,
        next_due: startDate || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateRecurringRevenue(id, projectId, amount, frequency, description, active, startDate) {
  const update = { project_id: projectId || null, amount, frequency, description, active };
  if (startDate !== undefined) { update.start_date = startDate || null; update.next_due = startDate || null; }
  const { error } = await supabase.from("recurring_revenue").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringRevenue(id) {
  const { error } = await supabase.from("recurring_revenue").delete().eq("id", id);

  if (error) throw error;
}

// Recurring expense operations
export async function addRecurringExpense(projectId, amount, frequency, description, startDate) {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert([
      {
        id: generateId(),
        project_id: projectId || null,
        amount,
        frequency,
        description,
        start_date: startDate || null,
        next_due: startDate || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateRecurringExpense(id, projectId, amount, frequency, description, active, startDate) {
  const update = { project_id: projectId || null, amount, frequency, description, active };
  if (startDate !== undefined) { update.start_date = startDate || null; update.next_due = startDate || null; }
  const { error } = await supabase.from("recurring_expenses").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringExpense(id) {
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);

  if (error) throw error;
}

// Recurring revenue payment operations (project-linked period tracking)
export async function addRecurringRevenuePayment(recurringRevenueId, projectId, periodDate, amount) {
  const { data, error } = await supabase
    .from("recurring_revenue_payments")
    .insert([{ id: generateId(), recurring_revenue_id: recurringRevenueId, project_id: projectId, period_date: periodDate, amount }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteRecurringRevenuePayment(id) {
  const { error } = await supabase.from("recurring_revenue_payments").delete().eq("id", id);
  if (error) throw error;
}

// Recurring expense payment operations (project-linked period tracking)
export async function addRecurringExpensePayment(recurringExpenseId, projectId, periodDate, amount) {
  const { data, error } = await supabase
    .from("recurring_expense_payments")
    .insert([{ id: generateId(), recurring_expense_id: recurringExpenseId, project_id: projectId, period_date: periodDate, amount }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteRecurringExpensePayment(id) {
  const { error } = await supabase.from("recurring_expense_payments").delete().eq("id", id);
  if (error) throw error;
}

// Utility function to generate IDs (same as in App.jsx)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
