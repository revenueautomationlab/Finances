/**
 * RAL Finance data layer: talks to the RAL Finance API on the VPS (server/server.js).
 * Replaced supabase-js on 2026-11-17 (Phase 2 of the Supabase to VPS move). Every exported
 * function keeps its old name, arguments and return shape so src/App.jsx is unchanged.
 * Auth: the API JWT from POST /auth/google lives in localStorage (see AuthContext).
 */

export const API_URL = (import.meta.env.VITE_API_URL || "https://finance-api.raltech.dev").replace(/\/+$/, "");

// ---------- token storage + 401 handling ----------
const TOKEN_KEY = "ral_finance_api_token";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}
/** Seconds since epoch when the token expires, or 0 if unreadable. */
export function tokenExpiry(token) {
  try {
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number(p.exp) || 0;
  } catch { return 0; }
}
export function isTokenValid(token) {
  return !!token && tokenExpiry(token) > Date.now() / 1000 + 30;
}

let unauthorizedHandler = null;
/** AuthContext registers this so a 401 (or an expired token) signs the user out. */
export function setUnauthorizedHandler(fn) { unauthorizedHandler = fn; }
function unauthorized(msg) {
  clearToken();
  if (unauthorizedHandler) unauthorizedHandler(msg);
  return new Error(msg || "Session expired, please sign in again");
}

/** fetch wrapper: JSON in/out, bearer token, errors thrown as Error(message) like supabase-js. */
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (!isTokenValid(token)) throw unauthorized("Session expired, please sign in again");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (res.status === 401 && auth) throw unauthorized(json?.error ? `Signed out: ${json.error}` : undefined);
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`);
    err.status = res.status;
    if (json?.code) err.code = json.code;
    throw err;
  }
  return json;
}

const enc = encodeURIComponent;
const insert = async (table, row, onConflict) =>
  (await api(`/tables/${table}${onConflict ? `?on_conflict=${enc(onConflict)}` : ""}`, { method: "POST", body: [row] }))[0];
const update = (table, id, fields) => api(`/tables/${table}/${enc(id)}`, { method: "PATCH", body: fields });
const remove = (table, id) => api(`/tables/${table}/${enc(id)}`, { method: "DELETE" });

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
    partners: [
      { id: "partner_suhaib", partnerName: "suhaib", vestingStart: d(1, 1), createdAt: d(1, 1) },
      { id: "partner_mohammed", partnerName: "mohammed", vestingStart: d(1, 1), createdAt: d(1, 1) },
      { id: "partner_hisham", partnerName: "hisham", vestingStart: null, createdAt: d(1, 1) },
    ],
  };
}

export async function fetchState() {
  if (DEV_AUTH_BYPASS) return mockState();
  try {
    // GET /state returns every business table keyed by table name; projects carry nested
    // payments/expenses and budgets carry budget_spending (same shape the old selects produced).
    const s = await api("/state");
    const projects = s.projects || [];
    const bankSpending = s.bank_spending;
    const secretInvestmentSpending = s.secret_investment_spending;
    const partnerWithdrawals = s.partner_withdrawals;
    const partnerDividends = s.partner_dividends;
    const budgets = s.budgets;
    const recurringRevenue = s.recurring_revenue;
    const recurringExpenses = s.recurring_expenses;
    const recurringRevenuePayments = s.recurring_revenue_payments;
    const recurringExpensePayments = s.recurring_expense_payments;
    const domains = s.domains;
    const paymentSchedule = s.payment_schedule;
    const paymentSchedulePayments = s.payment_schedule_payments;
    const secretInvestmentTransfers = s.secret_investment_transfers;
    const partners = s.partners;

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
      partners: (partners || []).map((p) => ({
        id: p.id,
        partnerName: p.partner_name,
        vestingStart: p.vesting_start,
        createdAt: p.created_at,
      })),
    };
  } catch (error) {
    console.error("Error fetching state:", error);
    throw error;
  }
}

// Save state (kept for API compatibility; individual operations below do the writes)
export async function saveState() {
  return { ok: true };
}

// Project operations
export const addProject = (name, totalValue) =>
  insert("projects", { id: generateId(), name, total_value: totalValue });
export async function updateProject(id, name, totalValue) { await update("projects", id, { name, total_value: totalValue }); }
export async function deleteProject(id) { await remove("projects", id); }

// Payment operations
export const addPayment = (projectId, amount, date, note) =>
  insert("payments", { id: generateId(), project_id: projectId, amount, date, note });
export async function deletePayment(projectId, paymentId) { await remove("payments", paymentId); }

// Expense operations
export const addExpense = (projectId, amount, date, description) =>
  insert("expenses", { id: generateId(), project_id: projectId, amount, date, description });
export async function deleteExpense(projectId, expenseId) { await remove("expenses", expenseId); }

// Bank spending operations
export const addBankSpending = (amount, date, description) =>
  insert("bank_spending", { id: generateId(), amount, date, description });
export async function deleteBankSpending(id) { await remove("bank_spending", id); }

// Secret investment spending operations
export const addSecretInvestmentSpending = (amount, date, description) =>
  insert("secret_investment_spending", { id: generateId(), amount, date, description });
export async function deleteSecretInvestmentSpending(id) { await remove("secret_investment_spending", id); }

// Yearly secret-investment transfers (25% of a year's net profit, physically moved out).
export const addSecretInvestmentTransfer = (year, amount, movedDate, note) =>
  insert("secret_investment_transfers", { id: generateId(), year, amount, moved_date: movedDate, note: note || null });
export async function deleteSecretInvestmentTransfer(id) { await remove("secret_investment_transfers", id); }

// Partner vesting: set/change/clear a partner's vesting start date (upsert on partner_name).
export async function setPartnerVestingStart(partnerName, startDate) {
  await insert("partners", { id: `partner_${partnerName}`, partner_name: partnerName, vesting_start: startDate || null }, "partner_name");
}

// Partner withdrawal operations
export const addPartnerWithdrawal = (partnerName, amount, date, note) =>
  insert("partner_withdrawals", { id: generateId(), partner_name: partnerName, amount, date, note: note || null });
export async function deletePartnerWithdrawal(id) { await remove("partner_withdrawals", id); }

// Budget operations
export const addBudget = (name, allocatedAmount, description) =>
  insert("budgets", { id: generateId(), name, allocated_amount: allocatedAmount, description: description || null });
export async function updateBudget(id, name, allocatedAmount, description) {
  await update("budgets", id, { name, allocated_amount: allocatedAmount, description: description || null });
}
export async function deleteBudget(id) { await remove("budgets", id); }

// Budget spending operations
export const addBudgetSpending = (budgetId, amount, date, description) =>
  insert("budget_spending", { id: generateId(), budget_id: budgetId, amount, date, description });
export async function deleteBudgetSpending(id) { await remove("budget_spending", id); }

// Recurring revenue / expense operations
const recurringRow = (projectId, amount, frequency, description, startDate, endDate) => ({
  id: generateId(), project_id: projectId || null, amount, frequency, description,
  start_date: startDate || null, next_due: startDate || null, end_date: endDate || null,
});
const recurringUpdate = (projectId, amount, frequency, description, active, startDate, endDate) => {
  const u = { project_id: projectId || null, amount, frequency, description, active };
  if (startDate !== undefined) { u.start_date = startDate || null; u.next_due = startDate || null; }
  if (endDate !== undefined) { u.end_date = endDate || null; }
  return u;
};
export const addRecurringRevenue = (...a) => insert("recurring_revenue", recurringRow(...a));
export async function updateRecurringRevenue(id, ...a) { await update("recurring_revenue", id, recurringUpdate(...a)); }
export async function deleteRecurringRevenue(id) { await remove("recurring_revenue", id); }
export const addRecurringExpense = (...a) => insert("recurring_expenses", recurringRow(...a));
export async function updateRecurringExpense(id, ...a) { await update("recurring_expenses", id, recurringUpdate(...a)); }
export async function deleteRecurringExpense(id) { await remove("recurring_expenses", id); }

// Partner dividend operations (bank-funded payouts)
export const addPartnerDividend = (partnerName, amount, date, note) =>
  insert("partner_dividends", { id: generateId(), partner_name: partnerName, amount, date, note: note || null });
export async function deletePartnerDividend(id) { await remove("partner_dividends", id); }

// Domain operations
const domainRow = (name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost) => ({
  name, expiry_date: expiryDate, project_id: projectId || null, recurring_revenue_id: recurringRevenueId || null,
  registrar: registrar || null, auto_renew: !!autoRenew, renewal_cost: renewalCost || 0, notes: notes || null,
});
export const addDomain = (...a) => insert("domains", { id: generateId(), ...domainRow(...a) });
export async function updateDomain(id, ...a) { await update("domains", id, domainRow(...a)); }
export async function deleteDomain(id) { await remove("domains", id); }

// Recurring revenue / expense payment operations (project-linked period tracking)
export const addRecurringRevenuePayment = (recurringRevenueId, projectId, periodDate, amount) =>
  insert("recurring_revenue_payments", { id: generateId(), recurring_revenue_id: recurringRevenueId, project_id: projectId, period_date: periodDate, amount });
export async function deleteRecurringRevenuePayment(id) { await remove("recurring_revenue_payments", id); }
export const addRecurringExpensePayment = (recurringExpenseId, projectId, periodDate, amount) =>
  insert("recurring_expense_payments", { id: generateId(), recurring_expense_id: recurringExpenseId, project_id: projectId, period_date: periodDate, amount });
export async function deleteRecurringExpensePayment(id) { await remove("recurring_expense_payments", id); }

// Payment schedule operations (tracking-only; does NOT affect bank/money calcs)
export const addPaymentSchedule = (direction, category, name, amount, frequency, startDate, endDate, projectId, notes) =>
  insert("payment_schedule", {
    id: generateId(), direction, category, name, amount, frequency, start_date: startDate,
    end_date: endDate || null, project_id: projectId || null, notes: notes || null,
  });
export async function updatePaymentSchedule(id, direction, category, name, amount, frequency, startDate, endDate, projectId, active, notes) {
  const u = { direction, category, name, amount, frequency, start_date: startDate, end_date: endDate || null, project_id: projectId || null, notes: notes || null };
  if (active !== undefined) u.active = active;
  await update("payment_schedule", id, u);
}
export async function setPaymentScheduleActive(id, active) { await update("payment_schedule", id, { active }); }
// Going-forward expected amount (already-paid occurrences keep their own captured amount).
export async function setPaymentScheduleAmount(id, amount) { await update("payment_schedule", id, { amount }); }
export async function deletePaymentSchedule(id) { await remove("payment_schedule", id); }

// Mark a single due occurrence paid / unpaid (the "todo done" toggle)
export const addPaymentSchedulePayment = (paymentScheduleId, periodDate, paidDate, note, amount) =>
  insert("payment_schedule_payments", {
    id: generateId(), payment_schedule_id: paymentScheduleId, period_date: periodDate,
    paid_date: paidDate || null, note: note || null, amount: amount == null ? null : amount,
  });
export async function deletePaymentSchedulePayment(id) { await remove("payment_schedule_payments", id); }

// Admin: app users (roles) + audit log
export async function fetchAppUsers() {
  const data = await api("/admin/users");
  return (data || []).map((u) => ({ email: u.email, role: u.role, status: u.status, invitedBy: u.invited_by, invitedAt: u.invited_at, createdAt: u.created_at }));
}
export const addAppUser = (email, role, invitedBy) =>
  api("/admin/users", { method: "POST", body: { email: email.toLowerCase().trim(), role, invited_by: invitedBy || null } });
export async function updateAppUser(email, fields) { await api(`/admin/users/${enc(email)}`, { method: "PATCH", body: fields }); }
export async function deleteAppUser(email) { await api(`/admin/users/${enc(email)}`, { method: "DELETE" }); }

export async function fetchAuditLog({ limit = 200, table = null, since = null } = {}) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (table) q.set("table", table);
  if (since) q.set("since", since);
  const data = await api(`/admin/audit?${q}`);
  return (data || []).map((a) => ({
    id: a.id, tableName: a.table_name, rowId: a.row_id, action: a.action,
    actorEmail: a.actor_email, oldData: a.old_data, newData: a.new_data,
    changedAt: a.changed_at, revertedAt: a.reverted_at,
  }));
}

// Revert a single audited change (admin only). The API does the undo (INSERT: delete,
// DELETE: re-insert, UPDATE: restore old values) and stamps reverted_at in one transaction.
export async function applyAuditRevert(entry) {
  await api(`/admin/audit/${enc(entry.id)}/revert`, { method: "POST", body: {} });
}

// Invite email, restore code and Resend usage are served by the API (the old Cloudflare Worker is retired).
export const inviteUser = (email, role) => api("/admin/invite", { method: "POST", body: { email, role } });
export const requestRestoreOtp = () => api("/admin/otp", { method: "POST", body: {} });
// Snapshots and restore run in the API against the live VPS DB. Restore checks the emailed code,
// takes a safety snapshot and restores, all in one transaction.
export const restoreSnapshot = (snapshotId, code) => api(`/admin/snapshots/${enc(snapshotId)}/restore`, { method: "POST", body: { code } });
export const takeSnapshotNow = () => api("/admin/snapshots", { method: "POST", body: {} });
export const fetchResendUsage = () => api("/admin/email-usage");

export async function fetchSnapshots() {
  const data = await api("/admin/snapshots");
  return (data || []).map((s) => ({ id: s.id, createdAt: s.created_at, createdBy: s.created_by, rowCounts: s.row_counts || {} }));
}
export const fetchSnapshotData = (id) => api(`/admin/snapshots/${enc(id)}`);

// Utility function to generate IDs (same as in App.jsx)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
