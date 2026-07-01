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
// DEV-ONLY: mock data for local layout/UI testing when auth is bypassed (see AuthContext).
// Guarded by import.meta.env.DEV so the production build strips it entirely.
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === "true";
function mockState() {
  const d = (m, day) => `2026-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    projects: [
      { id: "p1", name: "Acme Website Redesign", totalValue: 4500, createdAt: d(1, 5),
        payments: [{ id: "pay1", amount: 2000, date: d(2, 1), note: "Deposit" }, { id: "pay2", amount: 2500, date: d(4, 10), note: "Final" }],
        expenses: [{ id: "e1", amount: 300, date: d(2, 15), description: "Stock photos" }] },
      { id: "p2", name: "Beta App (Free + Recurring)", totalValue: 0, createdAt: d(3, 1), payments: [], expenses: [] },
    ],
    bankSpending: [{ id: "bs1", amount: 150, date: d(3, 20), description: "Domain tools" }],
    secretInvestmentSpending: [],
    partnerWithdrawals: [{ id: "w1", partnerName: "suhaib", amount: 100, date: d(5, 1), note: "" }],
    partnerDividends: [{ id: "dv1", partnerName: "mohammed", amount: 200, date: d(5, 15), note: "May" }],
    budgets: [{ id: "b1", name: "Marketing", allocatedAmount: 1000, description: "Ads", createdAt: d(1, 1), spending: [{ id: "bsp1", amount: 250, date: d(4, 1), description: "Google Ads" }] }],
    recurringRevenue: [
      { id: "rr1", projectId: "p1", amount: 120, frequency: "monthly", description: "Acme hosting", startDate: d(2, 1), nextDue: null, endDate: null, active: true, createdAt: d(2, 1) },
      { id: "rr2", projectId: null, amount: 300, frequency: "monthly", description: "General retainer (untagged)", startDate: d(1, 1), nextDue: null, endDate: null, active: true, createdAt: d(1, 1) },
    ],
    recurringExpenses: [{ id: "re1", projectId: null, amount: 40, frequency: "monthly", description: "VPS hosting", startDate: d(1, 1), nextDue: null, endDate: null, active: true, createdAt: d(1, 1) }],
    recurringRevenuePayments: [
      { id: "rrp1", recurringRevenueId: "rr1", projectId: "p1", periodDate: d(2, 1), amount: 120, note: null, createdAt: d(2, 1) },
      { id: "rrp2", recurringRevenueId: "rr1", projectId: "p1", periodDate: d(3, 1), amount: 120, note: null, createdAt: d(3, 1) },
    ],
    recurringExpensePayments: [{ id: "rep1", recurringExpenseId: "re1", projectId: null, periodDate: d(1, 1), amount: 40, note: null, createdAt: d(1, 1) }],
    domains: [{ id: "dom1", name: "acme-client-portal.com", expiryDate: d(9, 15), projectId: "p1", recurringRevenueId: null, registrar: "Cloudflare", autoRenew: true, renewalCost: 12, notes: "", createdAt: d(1, 1) }],
    paymentSchedule: [
      { id: "ps1", direction: "outgoing", category: "apple", name: "Apple Developer Program Membership", amount: 37.7, frequency: "yearly", startDate: d(1, 20), endDate: null, projectId: null, active: true, notes: "", createdAt: d(1, 1) },
      { id: "ps2", direction: "outgoing", category: "vps", name: "Hetzner VPS", amount: 15, frequency: "monthly", startDate: d(1, 1), endDate: null, projectId: null, active: true, notes: "", createdAt: d(1, 1) },
      { id: "ps3", direction: "incoming", category: "amc", name: "Acme Annual Maintenance Contract", amount: 800, frequency: "yearly", startDate: d(2, 1), endDate: null, projectId: "p1", active: true, notes: "", createdAt: d(1, 1) },
    ],
    paymentSchedulePayments: [
      { id: "psp1", paymentScheduleId: "ps2", periodDate: d(1, 1), paidDate: d(1, 2), amount: 15, note: null, createdAt: d(1, 2) },
      { id: "psp2", paymentScheduleId: "ps2", periodDate: d(2, 1), paidDate: d(2, 3), amount: 15, note: null, createdAt: d(2, 3) },
    ],
    secretInvestmentTransfers: [{ id: "sit1", year: 2025, amount: 320.5, movedDate: "2025-12-31", note: "Year-end 2025", createdAt: "2025-12-31" }],
  };
}

export async function fetchState() {
  if (DEV_AUTH_BYPASS) return mockState();
  try {
    const [
      { data: projects },
      { data: bankSpending },
      { data: secretInvestmentSpending },
      { data: partnerWithdrawals },
      { data: partnerDividends },
      { data: budgets },
      { data: recurringRevenue },
      { data: recurringExpenses },
      { data: recurringRevenuePayments },
      { data: recurringExpensePayments },
      { data: domains },
      { data: paymentSchedule },
      { data: paymentSchedulePayments },
      { data: secretInvestmentTransfers },
    ] = await Promise.all([
      supabase.from("projects").select("*, payments(*), expenses(*)"),
      supabase.from("bank_spending").select("*"),
      supabase.from("secret_investment_spending").select("*"),
      supabase.from("partner_withdrawals").select("*"),
      supabase.from("partner_dividends").select("*"),
      supabase.from("budgets").select("*, budget_spending(*)"),
      supabase.from("recurring_revenue").select("*"),
      supabase.from("recurring_expenses").select("*"),
      supabase.from("recurring_revenue_payments").select("*"),
      supabase.from("recurring_expense_payments").select("*"),
      supabase.from("domains").select("*"),
      supabase.from("payment_schedule").select("*"),
      supabase.from("payment_schedule_payments").select("*"),
      supabase.from("secret_investment_transfers").select("*"),
    ]);

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
      partnerDividends: (partnerDividends || []).map((d) => ({
        id: d.id,
        partnerName: d.partner_name,
        amount: parseFloat(d.amount),
        date: d.date,
        note: d.note,
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
        endDate: r.end_date,
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
        endDate: r.end_date,
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
      domains: (domains || []).map((d) => ({
        id: d.id,
        name: d.name,
        expiryDate: d.expiry_date,
        projectId: d.project_id,
        recurringRevenueId: d.recurring_revenue_id,
        registrar: d.registrar,
        autoRenew: d.auto_renew,
        renewalCost: parseFloat(d.renewal_cost) || 0,
        notes: d.notes,
        createdAt: d.created_at,
      })),
      paymentSchedule: (paymentSchedule || []).map((p) => ({
        id: p.id,
        direction: p.direction,
        category: p.category,
        name: p.name,
        amount: parseFloat(p.amount),
        frequency: p.frequency,
        startDate: p.start_date,
        endDate: p.end_date,
        projectId: p.project_id,
        active: p.active,
        notes: p.notes,
        createdAt: p.created_at,
      })),
      paymentSchedulePayments: (paymentSchedulePayments || []).map((pp) => ({
        id: pp.id,
        paymentScheduleId: pp.payment_schedule_id,
        periodDate: pp.period_date,
        paidDate: pp.paid_date,
        amount: pp.amount == null ? null : parseFloat(pp.amount),
        note: pp.note,
        createdAt: pp.created_at,
      })),
      secretInvestmentTransfers: (secretInvestmentTransfers || []).map((t) => ({
        id: t.id,
        year: t.year,
        amount: parseFloat(t.amount),
        movedDate: t.moved_date,
        note: t.note,
        createdAt: t.created_at,
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

// Yearly secret-investment transfers (25% of a year's net profit, physically moved out).
export async function addSecretInvestmentTransfer(year, amount, movedDate, note) {
  const { data, error } = await supabase
    .from("secret_investment_transfers")
    .insert([{ id: generateId(), year, amount, moved_date: movedDate, note: note || null }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteSecretInvestmentTransfer(id) {
  const { error } = await supabase.from("secret_investment_transfers").delete().eq("id", id);
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
export async function addRecurringRevenue(projectId, amount, frequency, description, startDate, endDate) {
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
        end_date: endDate || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateRecurringRevenue(id, projectId, amount, frequency, description, active, startDate, endDate) {
  const update = { project_id: projectId || null, amount, frequency, description, active };
  if (startDate !== undefined) { update.start_date = startDate || null; update.next_due = startDate || null; }
  if (endDate !== undefined) { update.end_date = endDate || null; }
  const { error } = await supabase.from("recurring_revenue").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringRevenue(id) {
  const { error } = await supabase.from("recurring_revenue").delete().eq("id", id);

  if (error) throw error;
}

// Recurring expense operations
export async function addRecurringExpense(projectId, amount, frequency, description, startDate, endDate) {
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
        end_date: endDate || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateRecurringExpense(id, projectId, amount, frequency, description, active, startDate, endDate) {
  const update = { project_id: projectId || null, amount, frequency, description, active };
  if (startDate !== undefined) { update.start_date = startDate || null; update.next_due = startDate || null; }
  if (endDate !== undefined) { update.end_date = endDate || null; }
  const { error } = await supabase.from("recurring_expenses").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringExpense(id) {
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);

  if (error) throw error;
}

// Partner dividend operations (bank-funded payouts)
export async function addPartnerDividend(partnerName, amount, date, note) {
  const { data, error } = await supabase
    .from("partner_dividends")
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

export async function deletePartnerDividend(id) {
  const { error } = await supabase
    .from("partner_dividends")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Domain operations
export async function addDomain(name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost) {
  const { data, error } = await supabase
    .from("domains")
    .insert([
      {
        id: generateId(),
        name,
        expiry_date: expiryDate,
        project_id: projectId || null,
        recurring_revenue_id: recurringRevenueId || null,
        registrar: registrar || null,
        auto_renew: !!autoRenew,
        renewal_cost: renewalCost || 0,
        notes: notes || null,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateDomain(id, name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost) {
  const { error } = await supabase
    .from("domains")
    .update({
      name,
      expiry_date: expiryDate,
      project_id: projectId || null,
      recurring_revenue_id: recurringRevenueId || null,
      registrar: registrar || null,
      auto_renew: !!autoRenew,
      renewal_cost: renewalCost || 0,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDomain(id) {
  const { error } = await supabase.from("domains").delete().eq("id", id);
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

// Payment schedule operations (tracking-only; does NOT affect bank/money calcs)
export async function addPaymentSchedule(direction, category, name, amount, frequency, startDate, endDate, projectId, notes) {
  const { data, error } = await supabase
    .from("payment_schedule")
    .insert([
      {
        id: generateId(),
        direction,
        category,
        name,
        amount,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        project_id: projectId || null,
        notes: notes || null,
      },
    ])
    .select();
  if (error) throw error;
  return data[0];
}

export async function updatePaymentSchedule(id, direction, category, name, amount, frequency, startDate, endDate, projectId, active, notes) {
  const update = { direction, category, name, amount, frequency, start_date: startDate, end_date: endDate || null, project_id: projectId || null, notes: notes || null };
  if (active !== undefined) update.active = active;
  const { error } = await supabase.from("payment_schedule").update(update).eq("id", id);
  if (error) throw error;
}

export async function setPaymentScheduleActive(id, active) {
  const { error } = await supabase.from("payment_schedule").update({ active }).eq("id", id);
  if (error) throw error;
}

// Edit the going-forward expected amount for a schedule item (affects only future/unpaid
// occurrences — already-paid occurrences keep their own captured amount).
export async function setPaymentScheduleAmount(id, amount) {
  const { error } = await supabase.from("payment_schedule").update({ amount }).eq("id", id);
  if (error) throw error;
}

export async function deletePaymentSchedule(id) {
  const { error } = await supabase.from("payment_schedule").delete().eq("id", id);
  if (error) throw error;
}

// Mark a single due occurrence paid / unpaid (the "todo done" toggle)
export async function addPaymentSchedulePayment(paymentScheduleId, periodDate, paidDate, note, amount) {
  const { data, error } = await supabase
    .from("payment_schedule_payments")
    .insert([{ id: generateId(), payment_schedule_id: paymentScheduleId, period_date: periodDate, paid_date: paidDate || null, note: note || null, amount: amount == null ? null : amount }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function deletePaymentSchedulePayment(id) {
  const { error } = await supabase.from("payment_schedule_payments").delete().eq("id", id);
  if (error) throw error;
}

// Admin: app users (roles) + audit log
export async function fetchAppUsers() {
  const { data, error } = await supabase.from("app_users").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((u) => ({ email: u.email, role: u.role, status: u.status, invitedBy: u.invited_by, invitedAt: u.invited_at, createdAt: u.created_at }));
}

export async function addAppUser(email, role, invitedBy) {
  const { data, error } = await supabase
    .from("app_users")
    .insert([{ email: email.toLowerCase().trim(), role, invited_by: invitedBy || null }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function updateAppUser(email, fields) {
  const { error } = await supabase.from("app_users").update(fields).eq("email", email);
  if (error) throw error;
}

export async function deleteAppUser(email) {
  const { error } = await supabase.from("app_users").delete().eq("email", email);
  if (error) throw error;
}

export async function fetchAuditLog({ limit = 200, table = null, since = null } = {}) {
  let q = supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(limit);
  if (table) q = q.eq("table_name", table);
  if (since) q = q.gte("changed_at", since);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((a) => ({
    id: a.id, tableName: a.table_name, rowId: a.row_id, action: a.action,
    actorEmail: a.actor_email, oldData: a.old_data, newData: a.new_data,
    changedAt: a.changed_at, revertedAt: a.reverted_at,
  }));
}

// Revert a single audited change (admin only; RLS enforces). The revert is itself audited.
// INSERT → delete the row · DELETE → re-insert the old row · UPDATE → restore old values.
export async function applyAuditRevert(entry) {
  const { tableName, action, rowId, oldData } = entry;
  if (action === "INSERT") {
    const { error } = await supabase.from(tableName).delete().eq("id", rowId);
    if (error) throw error;
  } else if (action === "DELETE") {
    const { error } = await supabase.from(tableName).insert([oldData]);
    if (error) throw error;
  } else if (action === "UPDATE") {
    const { error } = await supabase.from(tableName).update(oldData).eq("id", rowId);
    if (error) throw error;
  } else {
    throw new Error(`Cannot revert action: ${action}`);
  }
  const { error: e2 } = await supabase.from("audit_log").update({ reverted_at: new Date().toISOString() }).eq("id", entry.id);
  if (e2) throw e2;
}

// Admin worker actions (invite email, OTP, snapshot, restore). Calls the secure Cloudflare
// worker with the caller's Supabase JWT; the worker verifies admin + holds the service_role key.
const ADMIN_WORKER_URL = "https://ral-finance-daily-brief.revenueautomationlab.workers.dev";
async function adminAction(action, body) {
  const post = async (token) => {
    const res = await fetch(`${ADMIN_WORKER_URL}/?action=${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  };
  const freshToken = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) return data.session.access_token;
    } catch (_) { /* refresh token invalid */ }
    return null;
  };

  // Get a token, retrying getSession() (which auto-refreshes) to ride out the brief window right
  // after a login/account-switch where the session isn't attached yet. Only fall back to an
  // explicit refresh as a last resort (avoids racing the client's own auto-refresh).
  let token = null;
  for (let i = 0; i < 4 && !token; i += 1) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
    if (!token && i < 3) await new Promise((r) => setTimeout(r, 400));
  }
  if (!token) token = await freshToken();
  if (!token) throw new Error("Session expired — please sign out and sign in again");

  // Canonical pattern (per Supabase docs): on a 401/403 refresh once and retry.
  let { res, json } = await post(token);
  if (res.status === 401 || res.status === 403) {
    const t2 = await freshToken();
    if (t2) ({ res, json } = await post(t2));
  }
  if (!res.ok || !json.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
export const inviteUser = (email, role) => adminAction("invite", { email, role });
export const requestRestoreOtp = () => adminAction("otp", {});
export const restoreSnapshot = (snapshotId, code) => adminAction("restore", { snapshotId, code });
export const takeSnapshotNow = () => adminAction("snapshot", {});
export const fetchResendUsage = () => adminAction("resend-usage", {});

export async function fetchSnapshots() {
  const { data, error } = await supabase.from("db_snapshots").select("id,created_at,created_by,row_counts").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((s) => ({ id: s.id, createdAt: s.created_at, createdBy: s.created_by, rowCounts: s.row_counts || {} }));
}
export async function fetchSnapshotData(id) {
  const { data, error } = await supabase.from("db_snapshots").select("data,created_at").eq("id", id).single();
  if (error) throw error;
  return data;
}

// Utility function to generate IDs (same as in App.jsx)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
