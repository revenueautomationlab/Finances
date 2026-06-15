import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./contexts/AuthContext";
import { toast } from "sonner";
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
  addSecretInvestmentSpending as dbAddSecretInvestmentSpending,
  deleteSecretInvestmentSpending as dbDeleteSecretInvestmentSpending,
  addPartnerWithdrawal as dbAddPartnerWithdrawal,
  deletePartnerWithdrawal as dbDeletePartnerWithdrawal,
  addBudget as dbAddBudget,
  updateBudget as dbUpdateBudget,
  deleteBudget as dbDeleteBudget,
  addBudgetSpending as dbAddBudgetSpending,
  deleteBudgetSpending as dbDeleteBudgetSpending,
  addRecurringRevenue as dbAddRecurringRevenue,
  updateRecurringRevenue as dbUpdateRecurringRevenue,
  deleteRecurringRevenue as dbDeleteRecurringRevenue,
  addRecurringExpense as dbAddRecurringExpense,
  updateRecurringExpense as dbUpdateRecurringExpense,
  deleteRecurringExpense as dbDeleteRecurringExpense,
  addRecurringRevenuePayment as dbAddRecurringRevenuePayment,
  deleteRecurringRevenuePayment as dbDeleteRecurringRevenuePayment,
  addRecurringExpensePayment as dbAddRecurringExpensePayment,
  deleteRecurringExpensePayment as dbDeleteRecurringExpensePayment,
  addPartnerDividend as dbAddPartnerDividend,
  deletePartnerDividend as dbDeletePartnerDividend,
  addDomain as dbAddDomain,
  updateDomain as dbUpdateDomain,
  deleteDomain as dbDeleteDomain,
  addPaymentSchedule as dbAddPaymentSchedule,
  updatePaymentSchedule as dbUpdatePaymentSchedule,
  setPaymentScheduleActive as dbSetPaymentScheduleActive,
  deletePaymentSchedule as dbDeletePaymentSchedule,
  addPaymentSchedulePayment as dbAddPaymentSchedulePayment,
  deletePaymentSchedulePayment as dbDeletePaymentSchedulePayment,
  fetchAppUsers as dbFetchAppUsers,
  addAppUser as dbAddAppUser,
  updateAppUser as dbUpdateAppUser,
  deleteAppUser as dbDeleteAppUser,
  fetchAuditLog as dbFetchAuditLog,
  applyAuditRevert as dbApplyAuditRevert,
  inviteUser as dbInviteUser,
  fetchSnapshots as dbFetchSnapshots,
  fetchSnapshotData as dbFetchSnapshotData,
  takeSnapshotNow as dbTakeSnapshotNow,
  requestRestoreOtp as dbRequestRestoreOtp,
  restoreSnapshot as dbRestoreSnapshot,
} from "./services/supabaseService";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, FolderKanban, Landmark, PiggyBank, Repeat, FileBarChart,
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Pencil, Eye, ArrowLeft,
  Menu, LogOut, Users, Wallet, ChevronRight, CircleDollarSign, ArrowUpRight,
  ArrowDownRight, Target, Loader2, AlertTriangle, Percent, CheckCircle2, X,
  Globe, Clock, BadgeDollarSign, CalendarClock, CreditCard, ListChecks, Ban,
  RotateCcw, ChevronDown, ShieldCheck, History, UserPlus, Lock,
} from "lucide-react";

// --- Helpers ---
const currency = (n) => {
  const num = Number(n) || 0;
  return "BHD " + num.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Generate all period dates from startDate up to current period (YYYY-MM-01 format)
const generateRecurringPeriods = (startDate, frequency) => {
  if (!startDate) return [];
  const periods = [];
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(now.getFullYear(), now.getMonth(), 1);
  while (current <= limit) {
    periods.push(
      current.getFullYear() +
        "-" +
        String(current.getMonth() + 1).padStart(2, "0") +
        "-01"
    );
    if (frequency === "yearly") {
      current = new Date(current.getFullYear() + 1, current.getMonth(), 1);
    } else {
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
  }
  return periods;
};

const formatPeriodLabel = (dateStr, frequency) => {
  const d = new Date(dateStr + "T00:00:00");
  return frequency === "yearly"
    ? d.toLocaleDateString("en-US", { year: "numeric" })
    : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// Count periods from start (or current month if no date) to end of current year
const getYearPotentialCount = (startDate, frequency) => {
  const now = new Date();
  if (frequency === "yearly") return 1;
  const yearEnd = new Date(now.getFullYear(), 11, 1); // December of current year
  let from;
  if (startDate) {
    const s = new Date(startDate + "T00:00:00");
    from = new Date(s.getFullYear(), s.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    if (from < yearStart) from = yearStart; // cap to this year
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (from > yearEnd) return 0;
  return (yearEnd.getFullYear() - from.getFullYear()) * 12 + yearEnd.getMonth() - from.getMonth() + 1;
};

// Days between today (local) and an ISO date string. Negative = past.
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

// Reminder threshold: 90 days for yearly cadence, 7 days for monthly
const reminderThresholdDays = (frequency) => (frequency === "monthly" ? 7 : 90);

const formatExpiryDistance = (days) => {
  if (days === null || days === undefined) return "";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
};

// --- Payment tracking helpers (a todo/reminder layer — never touches bank/profit/margin calcs) ---
const PAYMENT_CATEGORIES = [
  { id: "domain", name: "Domain" },
  { id: "cr", name: "CR / License" },
  { id: "vps", name: "VPS / Server" },
  { id: "hosting", name: "Hosting" },
  { id: "apple", name: "Apple Developer" },
  { id: "android", name: "Google Play" },
  { id: "amc", name: "AMC (maintenance)" },
  { id: "other", name: "Other" },
];
const paymentCategoryLabel = (id) => PAYMENT_CATEGORIES.find((c) => c.id === id)?.name || "Other";
const PAYMENT_FREQUENCIES = [
  { id: "monthly", name: "Monthly" },
  { id: "yearly", name: "Yearly" },
  { id: "one_time", name: "One-time" },
];
const frequencyLabel = (id) => PAYMENT_FREQUENCIES.find((f) => f.id === id)?.name || id;

// How far ahead a payment starts showing as "due soon" / triggers reminders, by cadence:
// monthly = 2 weeks before, yearly = 3 months before, one-time = 30 days before.
const paymentLeadDays = (frequency) => (frequency === "monthly" ? 14 : frequency === "one_time" ? 30 : 90);
const leadLabel = (frequency) => (frequency === "monthly" ? "2 weeks ahead" : frequency === "one_time" ? "30 days ahead" : "3 months ahead");

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Advance a date by one frequency step, clamping monthly to the month's last valid day.
const addFrequencyStep = (date, frequency) => {
  if (frequency === "yearly") return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  const totalMonth = date.getMonth() + 1;
  const year = date.getFullYear() + Math.floor(totalMonth / 12);
  const month = ((totalMonth % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
};

// All due-date occurrences from startDate up to (today + horizonDays), bounded by endDate. one_time => single date.
const generatePaymentOccurrences = (startDate, frequency, endDate, horizonDays = 550) => {
  if (!startDate) return [];
  const occ = [];
  let cur = new Date(startDate + "T00:00:00");
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizonDays);
  const end = endDate ? new Date(endDate + "T00:00:00") : null;
  let guard = 0;
  while (cur <= horizon && (!end || cur <= end) && guard < 2400) {
    occ.push(toISODate(cur));
    if (frequency === "one_time") break;
    cur = addFrequencyStep(cur, frequency);
    guard += 1;
  }
  return occ;
};

// Next unpaid occurrence + overdue/paid counts, given a Set of paid period dates for this item.
// "Next due" anchors on the CURRENT cycle (latest occurrence on/before today) and future cycles —
// older unpaid cycles stay visible in the history panel but don't nag as overdue.
const paymentItemStatus = (item, paidPeriods) => {
  const occurrences = generatePaymentOccurrences(item.startDate, item.frequency, item.endDate);
  const today = toISODate(new Date());
  let anchorIdx = -1;
  for (let i = 0; i < occurrences.length; i += 1) {
    if (occurrences[i] <= today) anchorIdx = i; else break;
  }
  const relevant = anchorIdx >= 0 ? occurrences.slice(anchorIdx) : occurrences;
  const unpaidRelevant = relevant.filter((o) => !paidPeriods.has(o));
  const nextDue = unpaidRelevant.length ? unpaidRelevant[0] : null;
  const overdueCount = unpaidRelevant.filter((o) => o < today).length;
  const paidCount = occurrences.filter((o) => paidPeriods.has(o)).length;
  // The "current period" = the cycle covering today (anchor), or the first cycle if it hasn't started.
  const currentPeriod = anchorIdx >= 0 ? occurrences[anchorIdx] : (occurrences[0] || null);
  const currentPaid = currentPeriod ? paidPeriods.has(currentPeriod) : false;
  const curIdx = currentPeriod ? occurrences.indexOf(currentPeriod) : -1;
  // The next time a payment becomes due after the current one (when it's "next available to pay").
  const nextPeriod = curIdx >= 0 ? (occurrences[curIdx + 1] || null) : null;
  return { occurrences, nextDue, overdueCount, paidCount, settled: nextDue === null, currentPeriod, currentPaid, nextPeriod };
};

const initialState = {
  projects: [], bankSpending: [], secretInvestmentSpending: [],
  partnerWithdrawals: [], partnerDividends: [],
  budgets: [], recurringRevenue: [], recurringExpenses: [],
  recurringRevenuePayments: [], recurringExpensePayments: [],
  domains: [],
  paymentSchedule: [], paymentSchedulePayments: [],
};

// --- Stat Card Component ---
function StatCard({ icon: Icon, label, value, sub, variant = "default", className, onClick }) {
  const variants = {
    default: "bg-card",
    income: "bg-emerald-50 border-emerald-200/60",
    expense: "bg-red-50 border-red-200/60",
    bank: "bg-indigo-50 border-indigo-200/60",
    partner1: "bg-amber-50 border-amber-200/60",
    partner2: "bg-violet-50 border-violet-200/60",
    secret: "bg-pink-50 border-pink-200/60",
    highlight: "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
  };
  const iconVariants = {
    default: "bg-primary/10 text-primary",
    income: "bg-emerald-500/10 text-emerald-600",
    expense: "bg-red-500/10 text-red-600",
    bank: "bg-indigo-500/10 text-indigo-600",
    partner1: "bg-amber-500/10 text-amber-600",
    partner2: "bg-violet-500/10 text-violet-600",
    secret: "bg-pink-500/10 text-pink-600",
    highlight: "bg-primary/10 text-primary",
  };
  const valueVariants = {
    default: "text-foreground",
    income: "text-emerald-700",
    expense: "text-red-600",
    bank: "text-indigo-700",
    partner1: "text-amber-700",
    partner2: "text-violet-700",
    secret: "text-pink-700",
    highlight: "text-primary",
  };
  return (
    <Card
      className={cn("transition-all hover:shadow-md", variants[variant], onClick && "cursor-pointer hover:-translate-y-0.5", className)}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-5">
        {Icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconVariants[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("text-xl font-bold tabular-nums tracking-tight", valueVariants[variant])}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Empty State ---
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl bg-muted/50 p-5">
        <Icon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function App() {
  const { user, signOut, role, isAdmin, canWrite } = useAuth();
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [modal, setModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  // Payments tab UI state lifted to App scope so it survives data refreshes (mark-paid etc.)
  const [paymentsTab, setPaymentsTab] = useState("upcoming");
  const [paymentsExpandedId, setPaymentsExpandedId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchStateFromDB();
        setState(data);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchStateFromDB();
      setState(data);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, []);

  // Readers (role !== full/admin) can't mutate — RLS enforces this server-side; this is the clean UX guard.
  const guardWrite = () => {
    if (!canWrite) { toast.error("Read-only access — ask an admin for edit rights."); return false; }
    return true;
  };

  const showConfirm = (title, message, action, onConfirm, isDangerous = false) => {
    setConfirm({ title, message, action, onConfirm, isDangerous });
  };

  const { projects, bankSpending, secretInvestmentSpending, partnerWithdrawals, partnerDividends, budgets, recurringRevenue, recurringExpenses, recurringRevenuePayments, recurringExpensePayments, domains, paymentSchedule, paymentSchedulePayments } = state;

  // --- Computed Values ---
  // Project profit credits the project for recurring revenue tagged to it (paid installments).
  // Recurring expenses linked to a project also count as project costs. So a project earning
  // recurring isn't shown as a money-loser. The 4-way split (55/10/10/25) applies to this
  // combined profit, so paid project-linked recurring still ends up flowing to the bank pool
  // through the bank's 55% share — no double counting.
  // General (untagged) recurring revenue flows 100% to the bank pool directly.
  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const contractPayments = (p.payments || []).reduce((a, x) => a + x.amount, 0);
      const projectExpenses = (p.expenses || []).reduce((a, x) => a + x.amount, 0);

      // Project-linked recurring streams
      const projLinkedRev = recurringRevenue.filter((r) => r.active && r.projectId === p.id);
      const projLinkedExp = recurringExpenses.filter((r) => r.active && r.projectId === p.id);

      // Paid project-linked recurring revenue is credited to the project as earned income
      const projRecurringPaid = recurringRevenuePayments
        .filter((rp) => projLinkedRev.some((r) => r.id === rp.recurringRevenueId))
        .reduce((a, rp) => a + rp.amount, 0);

      // Recurring expenses linked to this project — accrual basis (all generated periods)
      const projRecurringExpTotal = projLinkedExp.reduce(
        (a, r) => a + generateRecurringPeriods(r.startDate, r.frequency).length * r.amount,
        0,
      );

      const totalPaid = contractPayments + projRecurringPaid;
      const totalRevenue = totalPaid;
      const totalPotential = p.totalValue; // contract-only — "paid" status is contract-based
      const totalExp = projectExpenses + projRecurringExpTotal;
      const profit = totalRevenue - totalExp;
      // "Paid" status reflects the contract only — recurring is extra/ongoing
      const unpaid = Math.max(0, p.totalValue - contractPayments);
      const isPaid = unpaid <= 0;

      const bankShare = profit > 0 ? profit * 0.55 : 0;
      const suhaibShare = profit > 0 ? profit * 0.10 : 0;
      const mohammedShare = profit > 0 ? profit * 0.10 : 0;
      const secretInvestmentShare = profit > 0 ? profit * 0.25 : 0;
      return {
        ...p,
        contractPayments,
        projRecurringPaid,
        projRecurringExpTotal,
        totalPaid, totalRevenue, totalPotential,
        unpaid, contractUnpaid: unpaid, isPaid,
        totalExpenses: totalExp,
        profit, bankShare, suhaibShare, mohammedShare, secretInvestmentShare,
      };
    });
  }, [projects, recurringRevenue, recurringExpenses, recurringRevenuePayments]);

  // Recurring revenue inflow breakdown.
  // - projectLinkedPaid: already credited to the relevant project (and split 55/10/10/25 via projectStats)
  // - generalActive: untagged streams flow 100% directly to bank pool
  const recurringRevenueIncome = useMemo(() => {
    const projectLinkedPaid = recurringRevenuePayments.reduce((a, rp) => a + rp.amount, 0);
    const generalActive = recurringRevenue
      .filter((r) => r.active && !r.projectId)
      .reduce((a, r) => a + r.amount, 0);
    return { projectLinkedPaid, generalActive, total: projectLinkedPaid + generalActive };
  }, [recurringRevenuePayments, recurringRevenue]);

  // General recurring expenses (no project link) come out of the bank pool
  const generalRecurringExp = recurringExpenses
    .filter((r) => r.active && !r.projectId)
    .reduce((a, r) => a + r.amount, 0);

  const globalBank = useMemo(() => {
    // Bank gets 55% of project profit (which now already includes paid project-linked recurring)
    // plus 100% of general (untagged) active recurring revenue.
    const projectShare = projectStats.reduce((a, p) => a + p.bankShare, 0);
    const income = projectShare + recurringRevenueIncome.generalActive;
    const spent = bankSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, projectShare, balance: income - spent };
  }, [projectStats, bankSpending, recurringRevenueIncome]);

  const globalSecretInvestment = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.secretInvestmentShare, 0);
    const spent = secretInvestmentSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, balance: income - spent };
  }, [projectStats, secretInvestmentSpending]);

  const globalProjectProfit = projectStats.reduce((a, p) => a + p.profit, 0);
  const globalSuhaib = projectStats.reduce((a, p) => a + p.suhaibShare, 0);
  const globalMohammed = projectStats.reduce((a, p) => a + p.mohammedShare, 0);
  // Project revenue includes contract payments + tagged paid recurring (already credited per project)
  const globalProjectRevenue = projectStats.reduce((a, p) => a + p.totalRevenue, 0);
  const globalContractRevenue = projectStats.reduce((a, p) => a + p.contractPayments, 0);
  // Total revenue = project-attributed revenue (contract + tagged recurring paid) + general (untagged) recurring
  const globalRevenue = globalProjectRevenue + recurringRevenueIncome.generalActive;
  // Operating expenses (true costs, NOT including owner distributions like withdrawals/dividends)
  const globalExpenses = projectStats.reduce((a, p) => a + p.totalExpenses, 0) + generalRecurringExp;
  // Year-end potential: project contracts + active recurring projected to Dec 31 (informational)
  const globalPotential =
    projectStats.reduce((a, p) => a + p.totalPotential, 0)
    + recurringRevenue
      .filter((r) => r.active)
      .reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0);
  const suhaibWithdrawals = partnerWithdrawals.filter((w) => w.partnerName === "suhaib");
  const mohammedWithdrawals = partnerWithdrawals.filter((w) => w.partnerName === "mohammed");
  const suhaibWithdrawn = suhaibWithdrawals.reduce((a, w) => a + w.amount, 0);
  const mohammedWithdrawn = mohammedWithdrawals.reduce((a, w) => a + w.amount, 0);
  const suhaibAvailable = globalSuhaib - suhaibWithdrawn;
  const mohammedAvailable = globalMohammed - mohammedWithdrawn;

  // Bank-funded dividend payouts (the salary mechanism)
  const suhaibDividends = partnerDividends.filter((d) => d.partnerName === "suhaib");
  const mohammedDividends = partnerDividends.filter((d) => d.partnerName === "mohammed");
  const suhaibDividendsTotal = suhaibDividends.reduce((a, d) => a + d.amount, 0);
  const mohammedDividendsTotal = mohammedDividends.reduce((a, d) => a + d.amount, 0);
  const totalDividendsPaid = suhaibDividendsTotal + mohammedDividendsTotal;

  const budgetStats = budgets.map((b) => {
    const spent = (b.spending || []).reduce((a, s) => a + s.amount, 0);
    return { ...b, spent, remaining: b.allocatedAmount - spent };
  });
  const totalBudgetAllocated = budgetStats.reduce((a, b) => a + b.allocatedAmount, 0);
  const totalBudgetSpent = budgetStats.reduce((a, b) => a + b.spent, 0);

  // Owner distributions — money paid to ourselves (NOT counted as outflow for margin/operating purposes,
  // but obviously still leaves the bank account so it factors into totalPhysicalBank).
  const totalDistributions = suhaibWithdrawn + mohammedWithdrawn + totalDividendsPaid;

  // Operating outflow — true business costs (project + general recurring expenses + bank/budget/secret spending).
  // Does NOT include owner distributions.
  const operatingOutflow =
    globalExpenses
    + globalBank.spent
    + globalSecretInvestment.spent
    + totalBudgetSpent;

  // Operating net & margin — what the business made before paying ourselves
  const operatingNet = globalRevenue - operatingOutflow;
  const globalMargin = globalRevenue > 0 ? (operatingNet / globalRevenue) * 100 : 0;

  // Bank spendable: bank pool minus all bank-funded outflows (spending, budgets, dividends, general recurring expenses)
  const bankSpendable = globalBank.income - globalBank.spent - totalBudgetSpent - totalDividendsPaid - generalRecurringExp;

  // True cash position: revenue − operating outflow − owner distributions (everything that left the bank)
  const totalPhysicalBank = operatingNet - totalDistributions;

  const selectedProject = projectStats.find((p) => p.id === selectedProjectId) || null;

  // --- Expiry Alerts (domains + recurring revenue end_date) ---
  // Suppress an alert if a successor exists: another active recurring rev with matching project_id
  // (or matching description for general items) and start_date >= the expiring item's end_date.
  const expiryAlerts = useMemo(() => {
    const alerts = [];

    // Domain expiries — yearly cadence threshold (90d). Suppressed if a domain with same name
    // and a later expiry_date exists (renewal added as a new row), or if the same row's expiry was bumped.
    domains.forEach((d) => {
      const days = daysUntil(d.expiryDate);
      if (days === null || days > 90) return;
      const renewed = domains.some(
        (other) => other.id !== d.id && other.name.toLowerCase() === d.name.toLowerCase() && daysUntil(other.expiryDate) > days,
      );
      if (renewed) return;
      alerts.push({
        kind: "domain",
        id: d.id,
        title: d.name,
        subtitle: d.registrar ? `Registrar: ${d.registrar}` : "Domain expiry",
        date: d.expiryDate,
        days,
        severity: days < 0 ? "overdue" : days <= 30 ? "urgent" : "soon",
      });
    });

    // Recurring revenue with end_date — threshold by frequency
    recurringRevenue.forEach((r) => {
      if (!r.active || !r.endDate) return;
      const days = daysUntil(r.endDate);
      if (days === null) return;
      const threshold = reminderThresholdDays(r.frequency);
      if (days > threshold) return;
      // Successor: another active recurring revenue with same project (or matching description for general)
      // and start_date strictly after this end_date.
      const successor = recurringRevenue.some((other) => {
        if (other.id === r.id || !other.active || !other.startDate) return false;
        const startsAfter = other.startDate > r.endDate;
        if (!startsAfter) return false;
        if (r.projectId) return other.projectId === r.projectId;
        return other.description.trim().toLowerCase() === r.description.trim().toLowerCase();
      });
      if (successor) return;
      alerts.push({
        kind: "recurring",
        id: r.id,
        title: r.description,
        subtitle: `${r.frequency} · ${currency(r.amount)}${r.projectId ? ` · ${projects.find((p) => p.id === r.projectId)?.name || "project"}` : " · general"}`,
        date: r.endDate,
        days,
        severity: days < 0 ? "overdue" : days <= Math.max(7, Math.floor(threshold / 3)) ? "urgent" : "soon",
      });
    });

    return alerts.sort((a, b) => a.days - b.days);
  }, [domains, recurringRevenue, projects]);

  // --- Payment tracking (todo layer — intentionally NOT part of any bank/profit/margin computation) ---
  const paidPeriodsByScheduleItem = useMemo(() => {
    const map = {};
    paymentSchedulePayments.forEach((pp) => {
      (map[pp.paymentScheduleId] ||= new Set()).add(pp.periodDate);
    });
    return map;
  }, [paymentSchedulePayments]);

  // One entry per upcoming obligation: the next unpaid occurrence of each active schedule item,
  // plus each domain's next renewal (its expiry date). Sorted by due date.
  const paymentTimeline = useMemo(() => {
    const entries = [];
    paymentSchedule.forEach((item) => {
      if (!item.active) return;
      const paid = paidPeriodsByScheduleItem[item.id] || new Set();
      const { nextDue } = paymentItemStatus(item, paid);
      if (nextDue) entries.push({ kind: "schedule", id: `s_${item.id}`, item, dueDate: nextDue, days: daysUntil(nextDue) });
    });
    domains.forEach((d) => {
      if (!d.expiryDate) return;
      entries.push({ kind: "domain", id: `d_${d.id}`, domain: d, dueDate: d.expiryDate, days: daysUntil(d.expiryDate) });
    });
    return entries.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [paymentSchedule, paidPeriodsByScheduleItem, domains]);

  const paymentsBadgeCount = useMemo(
    () => paymentTimeline.filter((e) => e.days !== null && e.days <= 14).length,
    [paymentTimeline],
  );

  // --- CRUD Operations ---
  const addProject = async (name, totalValue) => {
    setLoading(true);
    try {
      await dbAddProject(name, totalValue);
      await refreshData();
      toast.success(`Project "${name}" created`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to create project: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editProject = async (id, name, totalValue) => {
    setLoading(true);
    try {
      await dbUpdateProject(id, name, totalValue);
      await refreshData();
      toast.success(`Project "${name}" updated`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update project: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = (id, name) => {
    showConfirm("Delete Project", `Are you sure you want to delete "${name}"? All payments and expenses will be permanently removed.`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteProject(id);
        if (selectedProjectId === id) { setSelectedProjectId(null); setView("dashboard"); }
        await refreshData();
        toast.success(`Project "${name}" deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete project: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addPayment = async (projectId, amount, date, note) => {
    setLoading(true);
    try {
      await dbAddPayment(projectId, amount, date, note);
      await refreshData();
      toast.success(`Payment of ${currency(amount)} recorded`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = (projectId, paymentId, amount) => {
    showConfirm("Delete Payment", `Delete this payment of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeletePayment(projectId, paymentId);
        await refreshData();
        toast.success(`Payment deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete payment: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addExpense = async (projectId, amount, date, description) => {
    setLoading(true);
    try {
      await dbAddExpense(projectId, amount, date, description);
      await refreshData();
      toast.success(`Expense of ${currency(amount)} recorded`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = (projectId, expenseId, amount) => {
    showConfirm("Delete Expense", `Delete this expense of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteExpense(projectId, expenseId);
        await refreshData();
        toast.success(`Expense deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete expense: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addBankSpending = async (amount, date, description) => {
    setLoading(true);
    try {
      await dbAddBankSpending(amount, date, description);
      await refreshData();
      toast.success(`Bank spending of ${currency(amount)} recorded`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record spending: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBankSpending = (id, amount) => {
    showConfirm("Delete Bank Spending", `Delete this spending of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteBankSpending(id);
        await refreshData();
        toast.success(`Spending deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete spending: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addSecretInvestmentSpending = async (amount, date, description) => {
    setLoading(true);
    try {
      await dbAddSecretInvestmentSpending(amount, date, description);
      await refreshData();
      toast.success(`Secret Investment spending of ${currency(amount)} recorded`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record spending: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteSecretInvestmentSpending = (id, amount) => {
    showConfirm("Delete Spending", `Delete this spending of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteSecretInvestmentSpending(id);
        await refreshData();
        toast.success(`Spending deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete spending: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addPartnerWithdrawal = async (partnerName, amount, date, note) => {
    setLoading(true);
    try {
      await dbAddPartnerWithdrawal(partnerName, amount, date, note);
      await refreshData();
      toast.success(`Withdrawal of ${currency(amount)} recorded for ${partnerName === "suhaib" ? "Suhaib" : "Mohammed"}`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record withdrawal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePartnerWithdrawal = (id, amount) => {
    showConfirm("Delete Withdrawal", `Delete this withdrawal of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeletePartnerWithdrawal(id);
        await refreshData();
        toast.success(`Withdrawal deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete withdrawal: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addBudget = async (name, allocatedAmount, description) => {
    setLoading(true);
    try {
      await dbAddBudget(name, allocatedAmount, description);
      await refreshData();
      toast.success(`Budget "${name}" created`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to create budget: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editBudget = async (id, name, allocatedAmount, description) => {
    setLoading(true);
    try {
      await dbUpdateBudget(id, name, allocatedAmount, description);
      await refreshData();
      toast.success(`Budget "${name}" updated`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update budget: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = (id, name) => {
    showConfirm("Delete Budget", `Delete "${name}"? All spending records will be removed.`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteBudget(id);
        await refreshData();
        toast.success(`Budget "${name}" deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete budget: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addBudgetSpending = async (budgetId, amount, date, description) => {
    setLoading(true);
    try {
      await dbAddBudgetSpending(budgetId, amount, date, description);
      await refreshData();
      toast.success(`Spending of ${currency(amount)} recorded`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record spending: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBudgetSpending = (id, amount) => {
    showConfirm("Delete Spending", `Delete this spending of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteBudgetSpending(id);
        await refreshData();
        toast.success(`Spending deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete spending: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const addRecurringRevenue = async (projectId, amount, frequency, description, startDate, endDate, domainName, domainExpiry) => {
    setLoading(true);
    try {
      const created = await dbAddRecurringRevenue(projectId, amount, frequency, description, startDate, endDate);
      if (domainName && domainExpiry) {
        await dbAddDomain(domainName, domainExpiry, projectId || null, created?.id || null, null, false, null);
      }
      await refreshData();
      toast.success(`Recurring revenue "${description}" added${domainName ? ` (with domain ${domainName})` : ""}`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to add recurring revenue: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurringRevenue = (id, description) => {
    showConfirm("Delete Recurring Revenue", `Delete "${description}"?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteRecurringRevenue(id);
        await refreshData();
        toast.success(`Recurring revenue deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const toggleRecurringRevenue = async (id, currentActive) => {
    setLoading(true);
    try {
      const item = recurringRevenue.find((r) => r.id === id);
      await dbUpdateRecurringRevenue(id, item.projectId, item.amount, item.frequency, item.description, !currentActive, item.startDate ?? null, item.endDate ?? null);
      await refreshData();
      toast.success(`Recurring revenue ${!currentActive ? "activated" : "paused"}`);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editRecurringRevenue = async (id, amount, frequency, description, startDate, endDate, projectId) => {
    setLoading(true);
    try {
      const item = recurringRevenue.find((r) => r.id === id);
      const resolvedEnd = endDate === undefined ? (item.endDate ?? null) : (endDate || null);
      const resolvedProject = projectId === undefined ? item.projectId : (projectId || null);
      await dbUpdateRecurringRevenue(id, resolvedProject, amount, frequency, description, item.active, startDate || null, resolvedEnd);
      await refreshData();
      toast.success("Recurring revenue updated");
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addRecurringExpense = async (projectId, amount, frequency, description, startDate, endDate) => {
    setLoading(true);
    try {
      await dbAddRecurringExpense(projectId, amount, frequency, description, startDate, endDate);
      await refreshData();
      toast.success(`Recurring expense "${description}" added`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to add recurring expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurringExpense = (id, description) => {
    showConfirm("Delete Recurring Expense", `Delete "${description}"?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteRecurringExpense(id);
        await refreshData();
        toast.success(`Recurring expense deleted`);
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const toggleRecurringExpense = async (id, currentActive) => {
    setLoading(true);
    try {
      const item = recurringExpenses.find((r) => r.id === id);
      await dbUpdateRecurringExpense(id, item.projectId, item.amount, item.frequency, item.description, !currentActive, item.startDate ?? null, item.endDate ?? null);
      await refreshData();
      toast.success(`Recurring expense ${!currentActive ? "activated" : "paused"}`);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editRecurringExpense = async (id, amount, frequency, description, startDate, endDate, projectId) => {
    setLoading(true);
    try {
      const item = recurringExpenses.find((r) => r.id === id);
      const resolvedEnd = endDate === undefined ? (item.endDate ?? null) : (endDate || null);
      const resolvedProject = projectId === undefined ? item.projectId : (projectId || null);
      await dbUpdateRecurringExpense(id, resolvedProject, amount, frequency, description, item.active, startDate || null, resolvedEnd);
      await refreshData();
      toast.success("Recurring expense updated");
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Partner Dividends (bank-funded payouts) ---
  const addPartnerDividend = async (partnerName, amount, date, note) => {
    setLoading(true);
    try {
      await dbAddPartnerDividend(partnerName, amount, date, note);
      await refreshData();
      toast.success(`Dividend of ${currency(amount)} paid to ${partnerName === "suhaib" ? "Suhaib" : "Mohammed"}`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to record dividend: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePartnerDividend = (id, amount) => {
    showConfirm("Delete Dividend", `Delete this dividend of ${currency(amount)}?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeletePartnerDividend(id);
        await refreshData();
        toast.success("Dividend deleted");
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete dividend: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  // --- Domains ---
  const addDomain = async (name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost) => {
    setLoading(true);
    try {
      await dbAddDomain(name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost);
      await refreshData();
      toast.success(`Domain "${name}" added`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to add domain: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editDomain = async (id, name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost) => {
    setLoading(true);
    try {
      await dbUpdateDomain(id, name, expiryDate, projectId, recurringRevenueId, registrar, autoRenew, notes, renewalCost);
      await refreshData();
      toast.success(`Domain "${name}" updated`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update domain: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = (id, name) => {
    showConfirm("Delete Domain", `Delete domain "${name}"?`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeleteDomain(id);
        await refreshData();
        toast.success("Domain deleted");
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete domain: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const toggleRecurringRevPayment = async (recurringItem, periodDate, existingPayment) => {
    if (!guardWrite()) return;
    setLoading(true);
    try {
      if (existingPayment) {
        await dbDeleteRecurringRevenuePayment(existingPayment.id);
        toast.success(`${formatPeriodLabel(periodDate, recurringItem.frequency)} marked as unpaid`);
      } else {
        await dbAddRecurringRevenuePayment(recurringItem.id, recurringItem.projectId, periodDate, recurringItem.amount);
        toast.success(`${formatPeriodLabel(periodDate, recurringItem.frequency)} marked as paid`);
      }
      await refreshData();
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecurringExpPayment = async (recurringItem, periodDate, existingPayment) => {
    if (!guardWrite()) return;
    setLoading(true);
    try {
      if (existingPayment) {
        await dbDeleteRecurringExpensePayment(existingPayment.id);
        toast.success(`${formatPeriodLabel(periodDate, recurringItem.frequency)} marked as unpaid`);
      } else {
        await dbAddRecurringExpensePayment(recurringItem.id, recurringItem.projectId, periodDate, recurringItem.amount);
        toast.success(`${formatPeriodLabel(periodDate, recurringItem.frequency)} marked as paid`);
      }
      await refreshData();
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Payment tracking CRUD (tracking-only) ---
  const addPaymentItem = async (direction, category, name, amount, frequency, startDate, endDate, projectId, notes) => {
    setLoading(true);
    try {
      await dbAddPaymentSchedule(direction, category, name, amount, frequency, startDate, endDate, projectId, notes);
      await refreshData();
      toast.success(`"${name}" added to tracking`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to add: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editPaymentItem = async (id, direction, category, name, amount, frequency, startDate, endDate, projectId, active, notes) => {
    setLoading(true);
    try {
      await dbUpdatePaymentSchedule(id, direction, category, name, amount, frequency, startDate, endDate, projectId, active, notes);
      await refreshData();
      toast.success(`"${name}" updated`);
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setPaymentItemActive = (item) => {
    const closing = item.active;
    showConfirm(
      closing ? "Close / End Item" : "Reopen Item",
      closing
        ? `Stop tracking "${item.name}"? It will no longer show upcoming dues or trigger reminders. You can reopen it later.`
        : `Reopen "${item.name}" and resume upcoming dues?`,
      closing ? "Close" : "Reopen",
      async () => {
        setLoading(true);
        try {
          await dbSetPaymentScheduleActive(item.id, !item.active);
          await refreshData();
          toast.success(closing ? `"${item.name}" closed` : `"${item.name}" reopened`);
          setConfirm(null);
        } catch (error) {
          toast.error(`Failed: ${error.message}`);
        } finally {
          setLoading(false);
        }
      },
      false,
    );
  };

  const deletePaymentItem = (id, name) => {
    showConfirm("Delete Item", `Permanently delete "${name}" and its payment history? This can't be undone.`, "Delete", async () => {
      setLoading(true);
      try {
        await dbDeletePaymentSchedule(id);
        await refreshData();
        toast.success("Item deleted");
        setConfirm(null);
      } catch (error) {
        toast.error(`Failed to delete: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, true);
  };

  const togglePaymentPaid = async (item, periodDate, existingPayment) => {
    if (!guardWrite()) return;
    setLoading(true);
    try {
      if (existingPayment) {
        await dbDeletePaymentSchedulePayment(existingPayment.id);
        toast.success(`${formatDate(periodDate)} marked unpaid`);
      } else {
        await dbAddPaymentSchedulePayment(item.id, periodDate, toISODate(new Date()), null);
        toast.success(`${formatDate(periodDate)} marked paid`);
      }
      await refreshData();
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Renewing a domain = mark its renewal "paid": bump expiry by one year.
  const renewDomain = async (d) => {
    if (!guardWrite()) return;
    const cur = new Date(d.expiryDate + "T00:00:00");
    const next = toISODate(new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate()));
    setLoading(true);
    try {
      await dbUpdateDomain(d.id, d.name, next, d.projectId, d.recurringRevenueId, d.registrar, d.autoRenew, d.notes, d.renewalCost);
      await refreshData();
      toast.success(`${d.name} renewed → ${formatDate(next)}`);
    } catch (error) {
      toast.error(`Failed to renew: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openProject = (id) => { setSelectedProjectId(id); setView("project"); };

  // --- Modal Form with Validation ---
  function ModalForm({ title, fields, onSubmit, onClose }) {
    const [values, setValues] = useState(() => {
      const v = {};
      fields.forEach((f) => { v[f.name] = f.default || ""; });
      return v;
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const set = (name, val) => {
      const normalized = val === "__none__" ? "" : val;
      setValues((v) => ({ ...v, [name]: normalized }));
      if (errors[name]) setErrors((e) => ({ ...e, [name]: null }));
    };

    const validate = () => {
      const errs = {};
      fields.forEach((f) => {
        if (f.required && !values[f.name] && values[f.name] !== "0") {
          errs[f.name] = `${f.label} is required`;
        }
        if (f.type === "number" && values[f.name] !== "" && values[f.name] !== undefined) {
          const num = parseFloat(values[f.name]);
          if (isNaN(num)) errs[f.name] = "Must be a number";
          else if (f.allowZero ? num < 0 : num <= 0) {
            errs[f.name] = f.allowZero ? "Must be 0 or greater" : "Must be a positive number";
          }
        }
      });
      return errs;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!guardWrite()) return;
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));
        return;
      }
      onSubmit(values);
    };

    const handleBlur = (name) => {
      setTouched((t) => ({ ...t, [name]: true }));
      const errs = validate();
      if (errs[name]) setErrors((e) => ({ ...e, [name]: errs[name] }));
    };

    const submitLabel = title.startsWith("Edit") ? "Update" : title.startsWith("Spend") || title.startsWith("Add Spending") ? "Record" : title.startsWith("Withdraw") ? "Withdraw" : "Add";

    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Fill in the details below. All required fields are marked.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={f.name} className="flex items-center gap-1">
                  {f.label}
                  {f.required && <span className="text-red-500">*</span>}
                </Label>
                {f.type === "select" ? (
                  <Select value={values[f.name]} onValueChange={(val) => set(f.name, val)}>
                    <SelectTrigger className={cn("w-full", errors[f.name] && touched[f.name] && "border-red-500 ring-red-500/20 ring-2")}>
                      <SelectValue placeholder={f.placeholder || "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.placeholder && <SelectItem value="__none__">{f.placeholder}</SelectItem>}
                      {(f.options || []).map((opt) => {
                        if (typeof opt === "object") return <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>;
                        return <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      id={f.name}
                      type="checkbox"
                      checked={values[f.name] === true || values[f.name] === "true"}
                      onChange={(e) => set(f.name, e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-muted-foreground">{f.checkboxLabel || "Enabled"}</span>
                  </label>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type || "text"}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    onBlur={() => handleBlur(f.name)}
                    placeholder={f.placeholder}
                    step={f.type === "number" ? "0.001" : undefined}
                    min={f.type === "number" && f.allowZero ? 0 : undefined}
                    className={cn(errors[f.name] && touched[f.name] && "border-red-500 ring-red-500/20 ring-2")}
                  />
                )}
                {errors[f.name] && touched[f.name] && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {errors[f.name]}
                  </p>
                )}
              </div>
            ))}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Processing..." : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Navigation ---
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "projects", label: "Projects", icon: FolderKanban, count: projects.length },
    { key: "bank", label: "Bank Savings", icon: Landmark },
    { key: "budgets", label: "Budgets", icon: Target, count: budgets.length },
    { key: "recurring", label: "Recurring", icon: Repeat },
    { key: "payments", label: "Payments", icon: CalendarClock, count: paymentsBadgeCount },
    { key: "reports", label: "Reports", icon: FileBarChart },
    { key: "secretInvestment", label: "Secret Investment", icon: PiggyBank },
    ...(isAdmin ? [{ key: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  function SidebarContent() {
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-lg font-extrabold text-white">
            R
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">RAL Finance</h2>
            <p className="text-xs text-sidebar-foreground/50">Project Tracker</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">Menu</p>
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => { setView(n.key); setSidebarOpen(false); }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                view === n.key || (n.key === "projects" && view === "project")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1 text-left">{n.label}</span>
              {n.count > 0 && (
                <span className="rounded-full bg-sidebar-foreground/10 px-2 py-0.5 text-[11px] font-semibold">{n.count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-sidebar-foreground/50">Total in Bank</span>
              <Landmark className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            </div>
            <p className={cn("text-sm font-bold tabular-nums", totalPhysicalBank >= 0 ? "text-emerald-400" : "text-red-400")}>
              {currency(totalPhysicalBank)}
            </p>
          </div>
          <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-sidebar-foreground/50">Spendable</span>
              <Wallet className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            </div>
            <p className={cn("text-sm font-bold tabular-nums", bankSpendable >= 0 ? "text-emerald-400" : "text-red-400")}>
              {currency(bankSpendable)}
            </p>
          </div>
          <Separator className="bg-sidebar-border" />
          <div className="space-y-1">
            <p className="text-[11px] text-sidebar-foreground/40">Signed in as</p>
            <p className="text-xs font-medium truncate">{user?.email || "user"}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // ==================== VIEWS ====================

  // --- Expiry Alerts Banner ---
  function ExpiryAlertsBanner({ alerts }) {
    return (
      <Card className="border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Upcoming Expiries</CardTitle>
                <CardDescription>{alerts.length} item{alerts.length !== 1 ? "s" : ""} need{alerts.length === 1 ? "s" : ""} renewal · adding a successor dismisses the alert</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("domains")}>
              <Globe className="mr-1.5 h-3.5 w-3.5" /> Manage Domains
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a) => {
              const sevColor =
                a.severity === "overdue" ? "border-red-300 bg-red-50" :
                a.severity === "urgent" ? "border-orange-300 bg-orange-50" :
                "border-amber-200 bg-amber-50";
              const sevText =
                a.severity === "overdue" ? "text-red-700" :
                a.severity === "urgent" ? "text-orange-700" :
                "text-amber-700";
              return (
                <div key={`${a.kind}-${a.id}`} className={cn("rounded-lg border p-3 space-y-1.5", sevColor)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {a.kind === "domain" ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <Repeat className="h-3.5 w-3.5 text-muted-foreground" />}
                      <p className="font-semibold text-sm truncate">{a.title}</p>
                    </div>
                    <Badge className={cn("text-[10px]", sevColor, sevText)}>{formatExpiryDistance(a.days)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{a.subtitle}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Expires </span><span className="font-medium">{formatDate(a.date)}</span></p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Dashboard ---
  function AdminView() {
    const [adminTab, setAdminTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [audit, setAudit] = useState([]);
    const [auditTable, setAuditTable] = useState("");
    const [expandedAudit, setExpandedAudit] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [backupBusy, setBackupBusy] = useState(false);
    const [restoreId, setRestoreId] = useState(null);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState("");

    const loadUsers = async () => { try { setUsers(await dbFetchAppUsers()); } catch (e) { toast.error(`Load users failed: ${e.message}`); } };
    const loadAudit = async (table = auditTable) => { try { setAudit(await dbFetchAuditLog({ limit: 200, table: table || null })); } catch (e) { toast.error(`Load audit failed: ${e.message}`); } };
    const loadSnapshots = async () => { try { setSnapshots(await dbFetchSnapshots()); } catch (e) { toast.error(`Load backups failed: ${e.message}`); } };
    useEffect(() => { loadUsers(); loadAudit(""); loadSnapshots(); /* eslint-disable-next-line */ }, []);

    const backupNow = async () => {
      setBackupBusy(true);
      try { await dbTakeSnapshotNow(); await loadSnapshots(); toast.success("Backup created"); }
      catch (e) { toast.error(`Backup failed: ${e.message}`); } finally { setBackupBusy(false); }
    };
    const exportSnapshot = async (id) => {
      try {
        const s = await dbFetchSnapshotData(id);
        const blob = new Blob([JSON.stringify(s.data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ral-finance-backup-${(s.created_at || "").slice(0, 10)}-${id}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) { toast.error(`Export failed: ${e.message}`); }
    };
    const sendRestoreOtp = async () => {
      try { await dbRequestRestoreOtp(); setOtpSent(true); toast.success("Confirmation code sent to revenueautomationlab@gmail.com"); }
      catch (e) { toast.error(`Couldn't send code: ${e.message}`); }
    };
    const confirmRestore = async () => {
      setBackupBusy(true);
      try {
        await dbRestoreSnapshot(restoreId, otpCode.trim());
        toast.success("Database restored from backup");
        setRestoreId(null); setOtpSent(false); setOtpCode("");
        await refreshData(); await loadSnapshots();
      } catch (e) { toast.error(`Restore failed: ${e.message}`); } finally { setBackupBusy(false); }
    };
    const snapTotal = (rc) => Object.values(rc || {}).reduce((a, n) => a + (Number(n) || 0), 0);

    const onboard = () => setModal({
      title: "Onboard User",
      fields: [
        { name: "email", label: "Google email (must be @gmail.com)", placeholder: "person@gmail.com", required: true },
        { name: "role", label: "Role", type: "select", options: [{ id: "reader", name: "Reader — view only" }, { id: "full", name: "Full — edit & delete" }, { id: "admin", name: "Admin — full + manage users" }], default: "reader", required: true },
      ],
      onSubmit: async (v) => {
        const email = (v.email || "").toLowerCase().trim();
        if (!/^[^@\s]+@gmail\.com$/.test(email)) { toast.error("Must be a valid @gmail.com address"); return; }
        try {
          await dbAddAppUser(email, v.role, user?.email);
          await loadUsers();
          setModal(null);
          try {
            await dbInviteUser(email, v.role);
            toast.success(`${email} onboarded as ${v.role} — invite email sent`);
          } catch (mailErr) {
            toast.success(`${email} onboarded as ${v.role}`);
            toast.error(`Invite email failed: ${mailErr.message}`);
          }
        } catch (e) { toast.error(`Failed: ${e.message}`); }
      },
    });

    const setUserRole = async (email, role) => { try { await dbUpdateAppUser(email, { role }); await loadUsers(); toast.success(`${email} → ${role}`); } catch (e) { toast.error(e.message); } };
    const setUserStatus = async (email, status) => { try { await dbUpdateAppUser(email, { status }); await loadUsers(); toast.success(`${email} ${status}`); } catch (e) { toast.error(e.message); } };
    const removeUser = (email) => showConfirm("Remove User", `Remove ${email}? They'll lose access immediately.`, "Remove", async () => {
      try { await dbDeleteAppUser(email); await loadUsers(); toast.success("User removed"); setConfirm(null); } catch (e) { toast.error(e.message); }
    }, true);

    const revertEntry = (entry) => showConfirm(
      "Revert this change",
      `Undo the ${entry.action} on ${entry.tableName} (${formatDate(entry.changedAt?.slice(0, 10))})? This restores the previous state and is itself logged.`,
      "Revert",
      async () => { try { await dbApplyAuditRevert(entry); await loadAudit(); await refreshData(); toast.success("Change reverted"); setConfirm(null); } catch (e) { toast.error(`Revert failed: ${e.message}`); } },
    );

    const actionBadge = (a) => a === "INSERT" ? "bg-emerald-100 text-emerald-700" : a === "DELETE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
    const changedFields = (e) => {
      if (e.action !== "UPDATE" || !e.oldData || !e.newData) return [];
      return Object.keys(e.newData).filter((k) => JSON.stringify(e.oldData[k]) !== JSON.stringify(e.newData[k]));
    };
    const auditTables = ["", "projects", "payments", "expenses", "bank_spending", "secret_investment_spending", "partner_withdrawals", "partner_dividends", "budgets", "budget_spending", "recurring_revenue", "recurring_expenses", "recurring_revenue_payments", "recurring_expense_payments", "domains", "payment_schedule", "payment_schedule_payments", "app_users"];

    return (
      <div className="animate-fade-in-up space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ShieldCheck className="h-6 w-6 text-primary" /> Admin</h1>
          <p className="text-sm text-muted-foreground">Manage who can access the system, review every change, and revert mistakes. Visible only to {user?.email}.</p>
        </div>

        <Tabs value={adminTab} onValueChange={setAdminTab}>
          <TabsList>
            <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="backups">Backups &amp; Restore</TabsTrigger>
          </TabsList>

          {/* USERS */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div><CardTitle className="text-base">Team access</CardTitle><CardDescription>Onboard Google accounts and set their role</CardDescription></div>
                <Button size="sm" onClick={onboard}><UserPlus className="mr-1.5 h-4 w-4" /> Onboard user</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Added</TableHead><TableHead className="w-44" />
                    </TableRow></TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{user?.email}</TableCell>
                        <TableCell><Badge className="bg-primary/10 text-primary hover:bg-primary/10">admin</Badge></TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">active</Badge></TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-xs text-muted-foreground">owner</TableCell>
                      </TableRow>
                      {users.map((u) => (
                        <TableRow key={u.email}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(v) => setUserRole(u.email, v)}>
                              <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reader">Reader</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("hover:opacity-100", u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>{u.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs tabular-nums">{u.createdAt ? formatDate(u.createdAt.slice(0, 10)) : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => setUserStatus(u.email, u.status === "active" ? "disabled" : "active")}>{u.status === "active" ? "Disable" : "Enable"}</Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => removeUser(u.email)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No users onboarded yet. Click “Onboard user”.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground"><b>Reader</b> can view everything. <b>Full</b> can add, edit and delete. Roles are enforced by the database (RLS), not just the UI.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div><CardTitle className="text-base">Audit log</CardTitle><CardDescription>Every change, who made it, and one-click revert</CardDescription></div>
                <div className="flex items-center gap-2">
                  <select value={auditTable} onChange={(e) => { setAuditTable(e.target.value); loadAudit(e.target.value); }} className="rounded-md border bg-card px-2 py-1.5 text-xs">
                    {auditTables.map((t) => <option key={t} value={t}>{t === "" ? "All tables" : t}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => loadAudit()}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Refresh</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Table</TableHead><TableHead>Change</TableHead><TableHead className="w-28" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {audit.map((e) => {
                        const fields = changedFields(e);
                        const open = expandedAudit === e.id;
                        return (
                          <React.Fragment key={e.id}>
                            <TableRow className={cn(e.revertedAt && "opacity-50")}>
                              <TableCell className="text-xs tabular-nums whitespace-nowrap">{e.changedAt ? new Date(e.changedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                              <TableCell className="text-xs truncate max-w-[140px]">{e.actorEmail || "—"}</TableCell>
                              <TableCell><Badge className={cn("text-[10px]", actionBadge(e.action))}>{e.action}</Badge></TableCell>
                              <TableCell className="text-xs">{e.tableName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {e.action === "UPDATE" ? `${fields.length} field${fields.length !== 1 ? "s" : ""}` : e.action === "DELETE" ? "row deleted" : "row created"}
                                {" · "}<button className="underline" onClick={() => setExpandedAudit(open ? null : e.id)}>{open ? "hide" : "details"}</button>
                              </TableCell>
                              <TableCell>
                                {e.revertedAt
                                  ? <span className="text-[11px] text-muted-foreground">reverted</span>
                                  : <Button size="sm" variant="outline" className="h-7" onClick={() => revertEntry(e)}><RotateCcw className="mr-1 h-3 w-3" /> Revert</Button>}
                              </TableCell>
                            </TableRow>
                            {open && (
                              <TableRow><TableCell colSpan={6} className="bg-muted/30">
                                <pre className="max-h-64 overflow-auto text-[11px] leading-relaxed">{JSON.stringify({ old: e.oldData, new: e.newData }, null, 2)}</pre>
                              </TableCell></TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {audit.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No changes logged yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Showing the latest {audit.length} entries. Revert restores a single change and is itself logged.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BACKUPS */}
          <TabsContent value="backups" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div><CardTitle className="text-base">Backups &amp; restore</CardTitle><CardDescription>Daily snapshots (last 30 kept) · OTP-gated restore</CardDescription></div>
                <Button size="sm" onClick={backupNow} disabled={backupBusy}>{backupBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <History className="mr-1.5 h-4 w-4" />} Back up now</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>For everyday mistakes, prefer the <b>Audit Log</b> (revert a change / restore a deleted row while keeping later data). A full <b>Restore</b> below replaces all current data with the snapshot — a safety backup is taken automatically first, and it needs a code emailed to {user?.email}.</span>
                </div>
                {snapshots.length === 0 ? (
                  <EmptyState icon={History} title="No backups yet" description='Click "Back up now", or wait for the automatic daily snapshot.' />
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>When</TableHead><TableHead>By</TableHead><TableHead>Rows</TableHead><TableHead className="w-52" /></TableRow></TableHeader>
                      <TableBody>
                        {snapshots.map((s) => (
                          <React.Fragment key={s.id}>
                            <TableRow>
                              <TableCell className="text-xs tabular-nums whitespace-nowrap">{new Date(s.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">{s.createdBy || "—"}</TableCell>
                              <TableCell className="text-xs tabular-nums">{snapTotal(s.rowCounts)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" className="h-7" onClick={() => exportSnapshot(s.id)}>Export</Button>
                                  <Button size="sm" variant="outline" className="h-7" onClick={() => { setRestoreId(restoreId === s.id ? null : s.id); setOtpSent(false); setOtpCode(""); }}>Restore</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {restoreId === s.id && (
                              <TableRow><TableCell colSpan={4} className="bg-red-50/50">
                                <div className="space-y-2 py-1">
                                  <p className="text-xs text-red-700 font-medium">Restore everything to this backup ({new Date(s.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})? Current data will be replaced (a safety backup is taken first).</p>
                                  {!otpSent ? (
                                    <Button size="sm" variant="outline" className="h-8" onClick={sendRestoreOtp}>Email me a confirmation code</Button>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" className="h-8 w-32" />
                                      <Button size="sm" variant="destructive" className="h-8" disabled={backupBusy || otpCode.trim().length < 6} onClick={confirmRestore}>{backupBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Confirm restore</Button>
                                      <Button size="sm" variant="ghost" className="h-8" onClick={sendRestoreOtp}>Resend code</Button>
                                    </div>
                                  )}
                                </div>
                              </TableCell></TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  function DashboardView() {
    // Current-year cash movements (by transaction date).
    const yr = String(new Date().getFullYear());
    const inYr = (d) => typeof d === "string" && d.slice(0, 4) === yr;
    const sumF = (arr, ok, get) => arr.reduce((a, x) => a + (ok(x) ? get(x) : 0), 0);
    const yearIncome =
      projects.reduce((a, p) => a + sumF(p.payments || [], (x) => inYr(x.date), (x) => x.amount), 0)
      + sumF(recurringRevenuePayments, (rp) => inYr(rp.periodDate), (rp) => rp.amount);
    const yearOutgoing =
      projects.reduce((a, p) => a + sumF(p.expenses || [], (x) => inYr(x.date), (x) => x.amount), 0)
      + sumF(recurringExpensePayments, (ep) => inYr(ep.periodDate), (ep) => ep.amount)
      + sumF(bankSpending, (x) => inYr(x.date), (x) => x.amount)
      + sumF(secretInvestmentSpending, (x) => inYr(x.date), (x) => x.amount)
      + budgets.reduce((a, b) => a + sumF(b.spending || [], (s) => inYr(s.date), (s) => s.amount), 0)
      + sumF(partnerWithdrawals, (x) => inYr(x.date), (x) => x.amount)
      + sumF(partnerDividends, (x) => inYr(x.date), (x) => x.amount);
    const yearNet = yearIncome - yearOutgoing;
    return (
      <div className="animate-fade-in-up space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of all project finances</p>
        </div>

        {/* Always-on current-year income vs outgoing */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard icon={ArrowDownRight} label={`${yr} Income`} value={currency(yearIncome)} variant="income" sub="Money received this year" />
          <StatCard icon={ArrowUpRight} label={`${yr} Outgoing`} value={currency(yearOutgoing)} variant="expense" sub="Money spent this year (incl. payouts)" />
          <StatCard icon={Wallet} label={`${yr} Net`} value={currency(yearNet)} variant={yearNet >= 0 ? "bank" : "expense"} sub="Income − outgoing" />
        </div>

        {expiryAlerts.length > 0 && <ExpiryAlertsBanner alerts={expiryAlerts} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={DollarSign} label="Total Revenue" value={currency(globalRevenue)} sub={`Contract: ${currency(globalContractRevenue)} · Recurring: ${currency(recurringRevenueIncome.total)}`} variant="income" />
          <StatCard icon={TrendingDown} label="Total Expenses" value={currency(globalExpenses)} variant="expense" sub="Project + recurring expenses" onClick={() => setView("projects")} />
          <StatCard icon={ArrowDownRight} label="Operating Outflow" value={currency(operatingOutflow)} variant="expense" sub="All costs (excl. partner payouts)" />
          <StatCard icon={Percent} label="Operating Margin" value={`${globalMargin.toFixed(1)}%`} variant={globalMargin >= 25 ? "income" : globalMargin >= 0 ? "highlight" : "expense"} sub={`Operating net: ${currency(operatingNet)}`} />
          <StatCard icon={Landmark} label="Total in Bank" value={currency(totalPhysicalBank)} variant="bank" sub={totalDistributions > 0 ? `After ${currency(totalDistributions)} paid to partners` : undefined} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Wallet} label="Bank Spendable" value={currency(bankSpendable)} variant={bankSpendable >= 0 ? "bank" : "expense"} sub="Pool for ops + dividends" onClick={() => setView("bank")} />
          <StatCard icon={Repeat} label="Recurring Revenue" value={currency(recurringRevenueIncome.total)} variant="income" sub={`Tagged: ${currency(recurringRevenueIncome.projectLinkedPaid)} · General: ${currency(recurringRevenueIncome.generalActive)}`} onClick={() => setView("recurring")} />
          <StatCard icon={TrendingUp} label="Project Profit" value={currency(globalProjectProfit)} variant={globalProjectProfit >= 0 ? "income" : "expense"} sub="Contract + tagged recurring − costs" onClick={() => setView("projects")} />
          <StatCard icon={CircleDollarSign} label="Year Potential" value={currency(globalPotential)} variant="default" sub="Contract + recurring to Dec" />
        </div>

        {globalProjectProfit > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Project Profit Distribution</CardTitle>
              <CardDescription>Bank 55% · Suhaib 10% · Mohammed 10% · Secret Investment 25% (recurring revenue is separate — it flows to the bank pool)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Bank Share", value: globalBank.projectShare, color: "bg-indigo-500", bg: "bg-indigo-50" },
                  { label: "Suhaib", value: globalSuhaib, color: "bg-amber-500", bg: "bg-amber-50" },
                  { label: "Mohammed", value: globalMohammed, color: "bg-violet-500", bg: "bg-violet-50" },
                  { label: "Secret Investment", value: globalSecretInvestment.income, color: "bg-pink-500", bg: "bg-pink-50" },
                ].map((d) => (
                  <div key={d.label} className={cn("rounded-xl p-4", d.bg)}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("h-2 w-2 rounded-full", d.color)} />
                      <span className="text-xs font-semibold text-muted-foreground">{d.label}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{currency(d.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Partner Balances</CardTitle>
            <CardDescription>Each partner has two pots: their 10% share of project profit, and bank-funded dividend payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { name: "Suhaib", partner: "suhaib", available: suhaibAvailable, earned: globalSuhaib, withdrawn: suhaibWithdrawn, dividends: suhaibDividendsTotal, variant: "partner1", icon: Users },
                { name: "Mohammed", partner: "mohammed", available: mohammedAvailable, earned: globalMohammed, withdrawn: mohammedWithdrawn, dividends: mohammedDividendsTotal, variant: "partner2", icon: Users },
              ].map((p) => (
                <Card key={p.name} className={cn(p.variant === "partner1" ? "border-amber-200/60" : "border-violet-200/60")}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", p.variant === "partner1" ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600")}>
                          <p.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Total received: {currency(p.withdrawn + p.dividends)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">10% Share</p>
                        <p className="text-base font-bold tabular-nums">{currency(p.available)}</p>
                        <p className="text-[11px] text-muted-foreground">Earned {currency(p.earned)} · Withdrawn {currency(p.withdrawn)}</p>
                        <Button size="sm" variant="outline" className="mt-2 w-full h-7 text-xs" disabled={p.available <= 0} onClick={() => setModal({
                          title: `Withdraw Share — ${p.name}`,
                          fields: [
                            { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                            { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                            { name: "note", label: "Note", placeholder: "Withdrawal note (optional)" },
                          ],
                          onSubmit: (v) => addPartnerWithdrawal(p.partner, parseFloat(v.amount), v.date, v.note),
                        })}>
                          <Wallet className="mr-1.5 h-3 w-3" /> Withdraw Share
                        </Button>
                      </div>
                      <div className="rounded-lg border p-3 bg-emerald-50/40 border-emerald-200/60">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Bank Dividend</p>
                        <p className="text-base font-bold tabular-nums text-emerald-700">{currency(p.dividends)}</p>
                        <p className="text-[11px] text-muted-foreground">From bank spendable pool</p>
                        <Button size="sm" className="mt-2 w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={bankSpendable <= 0} onClick={() => setModal({
                          title: `Pay Dividend — ${p.name}`,
                          fields: [
                            { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                            { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                            { name: "note", label: "Note", placeholder: "Dividend note (optional)" },
                          ],
                          onSubmit: (v) => addPartnerDividend(p.partner, parseFloat(v.amount), v.date, v.note),
                        })}>
                          <BadgeDollarSign className="mr-1.5 h-3 w-3" /> Pay Dividend
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {(partnerWithdrawals.length > 0 || partnerDividends.length > 0) && (
              <div>
                <p className="text-sm font-semibold mb-3">Recent Activity</p>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ...partnerWithdrawals.map((w) => ({ ...w, kind: "withdrawal" })),
                        ...partnerDividends.map((d) => ({ ...d, kind: "dividend" })),
                      ]
                        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                        .slice(0, 8)
                        .map((row) => (
                          <TableRow key={`${row.kind}-${row.id}`}>
                            <TableCell>
                              <Badge variant={row.kind === "dividend" ? "default" : "secondary"} className={cn(row.kind === "dividend" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                                {row.kind === "dividend" ? "Dividend" : "Share"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{row.partnerName === "suhaib" ? "Suhaib" : "Mohammed"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(row.date)}</TableCell>
                            <TableCell><Badge variant="destructive" className="tabular-nums font-semibold">{currency(row.amount)}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{row.note || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => row.kind === "dividend" ? deletePartnerDividend(row.id, row.amount) : deletePartnerWithdrawal(row.id, row.amount)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(budgets.length > 0 || recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Quick Overview</CardTitle>
              <CardDescription>Budgets and recurring items at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {budgets.length > 0 && (
                  <>
                    <StatCard label="Budget Allocated" value={currency(totalBudgetAllocated)} sub={`${budgets.length} budget${budgets.length !== 1 ? "s" : ""}`} onClick={() => setView("budgets")} />
                    <StatCard label="Budget Spent" value={currency(totalBudgetSpent)} variant="expense" sub={totalBudgetAllocated > 0 ? `${Math.round((totalBudgetSpent / totalBudgetAllocated) * 100)}% used` : "0% used"} onClick={() => setView("budgets")} />
                  </>
                )}
                {(recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
                  <>
                    <StatCard label="Recurring Revenue" value={currency(recurringRevenue.filter((r) => r.active).reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0))} variant="income" sub={`${recurringRevenue.filter((r) => r.active).length} active · year potential`} onClick={() => setView("recurring")} />
                    <StatCard label="Recurring Expenses" value={currency(recurringExpenses.filter((r) => r.active).reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0))} variant="expense" sub={`${recurringExpenses.filter((r) => r.active).length} active · year potential`} onClick={() => setView("recurring")} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Projects Overview</CardTitle>
                <CardDescription>All projects at a glance</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setView("projects")}>
                <Eye className="mr-1.5 h-3.5 w-3.5" /> View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectStats.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to start tracking finances." action={
                <Button onClick={() => { setView("projects"); setModal({ title: "New Project", fields: [{ name: "name", label: "Project Name", placeholder: "e.g. Website Redesign", required: true }, { name: "totalValue", label: "Total Project Value (BHD)", type: "number", placeholder: "0.000 (use 0 for free + recurring upsell)", required: true, allowZero: true, default: "0" }], onSubmit: (v) => addProject(v.name, parseFloat(v.totalValue)) }); }}>
                  <Plus className="mr-1.5 h-4 w-4" /> New Project
                </Button>
              } />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Project</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectStats.slice().reverse().map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProject(p.id)}>
                        <TableCell className="font-semibold">{p.name}{p.totalValue === 0 && <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Free</Badge>}</TableCell>
                        <TableCell className="tabular-nums">{p.totalValue === 0 ? "Free" : currency(p.totalValue)}</TableCell>
                        <TableCell className="tabular-nums text-emerald-600">
                          <div>{currency(p.totalPaid)}</div>
                          {p.projRecurringPaid > 0 && (
                            <div className="text-[10px] font-normal text-muted-foreground">
                              Contract {currency(p.contractPayments)} + Recurring {currency(p.projRecurringPaid)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{currency(p.totalExpenses)}</TableCell>
                        <TableCell className={cn("font-semibold tabular-nums", p.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(p.profit)}</TableCell>
                        <TableCell>
                          <Badge variant={p.unpaid <= 0 ? "default" : p.contractPayments > 0 ? "secondary" : "outline"} className={cn(p.unpaid <= 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", p.contractPayments > 0 && p.unpaid > 0 && "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                            {p.unpaid <= 0 ? "Paid" : p.contractPayments > 0 ? "Partial" : "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Projects List ---
  function ProjectsView() {
    const totContractPaid = projectStats.reduce((a, p) => a + p.contractPayments, 0);
    const totRecurringPaid = projectStats.reduce((a, p) => a + p.projRecurringPaid, 0);
    const totPaid = totContractPaid + totRecurringPaid;
    const totUnpaid = projectStats.reduce((a, p) => a + p.unpaid, 0);
    const totExp = projectStats.reduce((a, p) => a + p.totalExpenses, 0);
    const totProfit = projectStats.reduce((a, p) => a + p.profit, 0);
    const margin = globalMargin;
    const marginColor = margin >= 50 ? "text-emerald-600" : margin >= 25 ? "text-amber-600" : margin >= 0 ? "text-orange-500" : "text-red-500";
    const marginBg = margin >= 50 ? "bg-emerald-50" : margin >= 25 ? "bg-amber-50" : margin >= 0 ? "bg-orange-50" : "bg-red-50";
    const summaryStats = [
      { label: "Total Paid", value: currency(totPaid), icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50", sub: totRecurringPaid > 0 ? `Contract ${currency(totContractPaid)} + Recurring ${currency(totRecurringPaid)}` : null },
      { label: "Total Unpaid", value: currency(totUnpaid), icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-50" },
      { label: "Total Expenses", value: currency(totExp), icon: TrendingDown, color: "text-orange-500", bg: "bg-orange-50" },
      { label: "Project Profit", value: currency(totProfit), icon: TrendingUp, color: totProfit >= 0 ? "text-emerald-600" : "text-red-500", bg: totProfit >= 0 ? "bg-emerald-50" : "bg-red-50" },
      { label: "Operating Margin", value: `${margin.toFixed(1)}%`, icon: Percent, color: marginColor, bg: marginBg },
      { label: "In Bank", value: currency(totalPhysicalBank), icon: Landmark, color: totalPhysicalBank >= 0 ? "text-indigo-600" : "text-red-500", bg: totalPhysicalBank >= 0 ? "bg-indigo-50" : "bg-red-50" },
    ];

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
          </div>
          <Button onClick={() => setModal({ title: "New Project", fields: [{ name: "name", label: "Project Name", placeholder: "e.g. Website Redesign", required: true }, { name: "totalValue", label: "Total Project Value (BHD)", type: "number", placeholder: "0.000 (use 0 for free + recurring upsell)", required: true, allowZero: true, default: "0" }], onSubmit: (v) => addProject(v.name, parseFloat(v.totalValue)) })}>
            <Plus className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>

        {projectStats.length > 0 && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
              {summaryStats.map((s) => (
                <div key={s.label} className="bg-card p-4 flex items-center gap-3">
                  <div className={cn("rounded-lg p-2 shrink-0", s.bg)}>
                    <s.icon className={cn("h-4 w-4", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight mb-0.5">{s.label}</p>
                    <p className={cn("text-sm font-bold tabular-nums truncate", s.color)}>{s.value}</p>
                    {s.sub && <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {projectStats.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState icon={FolderKanban} title="No projects yet" description='Click "New Project" above to create your first one.' />
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projectStats.slice().reverse().map((p) => {
              const isFree = p.totalValue === 0;
              // Progress bar tracks contract completion (recurring is ongoing/extra)
              const paidPct = isFree ? 100 : p.totalValue > 0 ? Math.min(100, (p.contractPayments / p.totalValue) * 100) : 0;
              return (
                <Card key={p.id} className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1" onClick={() => openProject(p.id)}>
                  <CardContent className="p-0">
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-base">{p.name}</h3>
                        <Badge variant={p.unpaid <= 0 ? "default" : p.contractPayments > 0 ? "secondary" : "outline"} className={cn("shrink-0", p.unpaid <= 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", p.contractPayments > 0 && p.unpaid > 0 && "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                          {isFree ? "Free" : p.unpaid <= 0 ? "Paid" : p.contractPayments > 0 ? "Partial" : "Unpaid"}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold tabular-nums tracking-tight">{isFree ? "Free" : currency(p.totalValue)}</p>
                      {p.projRecurringPaid > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">+ {currency(p.projRecurringPaid)} from recurring</p>
                      )}
                    </div>
                    <div className="px-5 pb-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Contract Progress</span>
                        <span className="font-semibold">{Math.round(paidPct)}%</span>
                      </div>
                      <Progress value={paidPct} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 border-t">
                      {[
                        { label: "Paid", value: currency(p.totalPaid), color: "text-emerald-600", sub: p.projRecurringPaid > 0 ? `incl. ${currency(p.projRecurringPaid)} recurring` : null },
                        { label: "Unpaid", value: currency(p.unpaid), color: "text-red-500" },
                        { label: "Expenses", value: currency(p.totalExpenses), color: "" },
                        { label: "Profit", value: currency(p.profit), color: p.profit >= 0 ? "text-emerald-600" : "text-red-500" },
                      ].map((s) => (
                        <div key={s.label} className="border-b border-r last:border-r-0 [&:nth-child(2)]:border-r-0 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                          <p className={cn("text-sm font-semibold tabular-nums", s.color)}>{s.value}</p>
                          {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openProject(p.id); }}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteProject(p.id, p.name); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Project Detail ---
  function ProjectDetailView() {
    if (!selectedProject) return <EmptyState icon={FolderKanban} title="Project not found" description="The selected project could not be found." />;
    const p = selectedProject;
    const isFree = p.totalValue === 0;
    const paidPct = isFree ? 100 : p.totalValue > 0 ? Math.min(100, (p.contractPayments / p.totalValue) * 100) : 0;
    const projLinkedRev = recurringRevenue.filter((r) => r.active && r.projectId === p.id);
    const projLinkedExp = recurringExpenses.filter((r) => r.active && r.projectId === p.id);
    return (
      <div className="animate-fade-in-up space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setView("projects")} className="mb-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Projects
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {p.name}
              {isFree && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Free + Recurring</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              Contract: {isFree ? "Free" : currency(p.totalValue)}
              {projLinkedRev.length > 0 ? ` · ${projLinkedRev.length} recurring stream${projLinkedRev.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal({ title: "Edit Project", fields: [{ name: "name", label: "Project Name", default: p.name, required: true }, { name: "totalValue", label: "Total Value (BHD)", type: "number", default: String(p.totalValue), required: true, allowZero: true }], onSubmit: (v) => editProject(p.id, v.name, parseFloat(v.totalValue)) })}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteProject(p.id, p.name)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CircleDollarSign} label="Contract Value" value={isFree ? "Free" : currency(p.totalValue)} variant="highlight" sub={projLinkedRev.length > 0 ? `+ ${currency(p.projRecurringPaid)} earned from recurring` : "No recurring streams"} />
          <StatCard icon={ArrowUpRight} label="Total Paid" value={currency(p.totalPaid)} variant="income" sub={p.projRecurringPaid > 0 ? `Contract ${currency(p.contractPayments)} + Recurring ${currency(p.projRecurringPaid)}` : `${Math.round(paidPct)}% of contract`} />
          <StatCard icon={ArrowDownRight} label="Unpaid" value={currency(p.unpaid)} variant={p.unpaid > 0 ? "expense" : "default"} sub={isFree ? "No contract value" : "Contract only"} />
          <StatCard icon={TrendingUp} label="Net Profit" value={currency(p.profit)} variant={p.profit >= 0 ? "income" : "expense"} sub="Revenue (incl. recurring) − costs" />
        </div>

        {p.profit > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Profit Split</CardTitle>
              <CardDescription>Bank 55% · Suhaib 10% · Mohammed 10% · Secret Investment 25%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Bank Savings", value: p.bankShare, icon: Landmark, bg: "bg-indigo-50 text-indigo-600" },
                  { label: "Suhaib", value: p.suhaibShare, icon: Users, bg: "bg-amber-50 text-amber-600" },
                  { label: "Mohammed", value: p.mohammedShare, icon: Users, bg: "bg-violet-50 text-violet-600" },
                  { label: "Secret Investment", value: p.secretInvestmentShare, icon: PiggyBank, bg: "bg-pink-50 text-pink-600" },
                ].map((s) => (
                  <div key={s.label} className={cn("rounded-xl p-4 text-center", s.bg.split(" ")[0])}>
                    <s.icon className={cn("h-5 w-5 mx-auto mb-2", s.bg.split(" ")[1])} />
                    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{s.label}</p>
                    <p className="text-lg font-bold tabular-nums mt-1">{currency(s.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Payments</CardTitle>
                <CardDescription>{(p.payments || []).length} payment{(p.payments || []).length !== 1 ? "s" : ""} recorded</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({ title: "Add Payment", fields: [{ name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }, { name: "note", label: "Note", placeholder: "Payment note (optional)" }], onSubmit: (v) => addPayment(p.id, parseFloat(v.amount), v.date, v.note) })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(p.payments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No payments recorded yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Note</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {[...(p.payments || [])].reverse().map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell className="text-muted-foreground">{formatDate(pay.date)}</TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 tabular-nums font-semibold">{currency(pay.amount)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{pay.note || "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deletePayment(p.id, pay.id, pay.amount)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Expenses</CardTitle>
                <CardDescription>{(p.expenses || []).length} expense{(p.expenses || []).length !== 1 ? "s" : ""} recorded</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({ title: "Add Expense", fields: [{ name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }, { name: "description", label: "Description", placeholder: "What was this expense for?", required: true }], onSubmit: (v) => addExpense(p.id, parseFloat(v.amount), v.date, v.description) })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Expense
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(p.expenses || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No expenses recorded yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {[...(p.expenses || [])].reverse().map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-muted-foreground">{formatDate(exp.date)}</TableCell>
                        <TableCell><Badge variant="destructive" className="tabular-nums font-semibold">{currency(exp.amount)}</Badge></TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteExpense(p.id, exp.id, exp.amount)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Revenue */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Repeat className="h-4 w-4 text-emerald-600" /> Recurring Revenue</CardTitle>
                <CardDescription>{projLinkedRev.length > 0 ? `${projLinkedRev.length} stream${projLinkedRev.length !== 1 ? "s" : ""} · mark each period as received` : "Add recurring revenue streams for this project"}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setModal({
                title: "Add Recurring Revenue",
                fields: [
                  { name: "description", label: "Description", placeholder: "e.g. Monthly retainer", required: true },
                  { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                  { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                  { name: "startDate", label: "Start Date (optional)", type: "date" },
                  { name: "endDate", label: "End Date (optional, triggers expiry alert)", type: "date" },
                  { name: "domainName", label: "Add Domain? (optional)", placeholder: "e.g. example.com" },
                  { name: "domainExpiry", label: "Domain Expiry Date", type: "date" },
                ],
                onSubmit: (v) => addRecurringRevenue(p.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null, v.domainName || null, v.domainExpiry || null),
              })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projLinkedRev.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No recurring revenue streams yet. Add one to track monthly or yearly income for this project.</p>
            ) : (
              <div className="space-y-5">
                {projLinkedRev.map((r) => {
                  const periods = generateRecurringPeriods(r.startDate, r.frequency);
                  const paidItems = recurringRevenuePayments.filter((rp) => rp.recurringRevenueId === r.id);
                  const paidAmount = paidItems.reduce((a, rp) => a + rp.amount, 0);
                  const yearCount = getYearPotentialCount(r.startDate, r.frequency);
                  const yearPotential = yearCount * r.amount;
                  return (
                    <div key={r.id} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{r.description}</p>
                            {!r.startDate && <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-[10px]">Potential</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {currency(r.amount)} / {r.frequency}
                            {r.startDate ? ` · started ${formatDate(r.startDate)} · ${periods.length} period${periods.length !== 1 ? "s" : ""} to date` : " · start date not set"}
                            {" · "}<span className="text-indigo-600 font-medium">{currency(yearPotential)} year potential</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.startDate && <div className="text-right mr-2">
                            <p className="text-sm font-bold tabular-nums text-emerald-600">{currency(paidAmount)}</p>
                            <p className="text-xs text-muted-foreground">{paidItems.length}/{periods.length} paid</p>
                          </div>}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({
                            title: "Edit Recurring Revenue",
                            fields: [
                              { name: "description", label: "Description", default: r.description, required: true },
                              { name: "amount", label: "Amount (BHD)", type: "number", default: String(r.amount), required: true },
                              { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: r.frequency, required: true },
                              { name: "startDate", label: "Start Date (optional)", type: "date", default: r.startDate || "" },
                              { name: "endDate", label: "End Date (optional)", type: "date", default: r.endDate || "" },
                            ],
                            onSubmit: (v) => editRecurringRevenue(r.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null),
                          })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringRevenue(r.id, r.description)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {!r.startDate ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
                          <span>Set a start date to begin tracking payments per period.</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setModal({ title: "Set Start Date", fields: [{ name: "startDate", label: "Start Date", type: "date", required: true }], onSubmit: (v) => editRecurringRevenue(r.id, r.amount, r.frequency, r.description, v.startDate) })}>
                            Set Start Date
                          </Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader><TableRow className="bg-muted/20"><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {[...periods].reverse().map((periodDate) => {
                              const payment = paidItems.find((rp) => rp.periodDate === periodDate);
                              const isPaid = !!payment;
                              return (
                                <TableRow key={periodDate} className={cn(isPaid && "bg-emerald-50/30")}>
                                  <TableCell className="font-medium">{formatPeriodLabel(periodDate, r.frequency)}</TableCell>
                                  <TableCell className="tabular-nums text-muted-foreground">{currency(r.amount)}</TableCell>
                                  <TableCell><Badge className={cn("font-medium", isPaid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100")}>{isPaid ? "Received" : "Pending"}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className={cn("h-7 text-xs gap-1", isPaid ? "text-muted-foreground hover:text-red-600" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50")} onClick={() => toggleRecurringRevPayment(r, periodDate, payment)}>
                                      {isPaid ? <><X className="h-3 w-3" />Unmark</> : <><CheckCircle2 className="h-3 w-3" />Mark Paid</>}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Expenses */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Repeat className="h-4 w-4 text-orange-500" /> Recurring Expenses</CardTitle>
                <CardDescription>{projLinkedExp.length > 0 ? `${projLinkedExp.length} stream${projLinkedExp.length !== 1 ? "s" : ""} · track which periods have been paid out` : "Add recurring expense streams for this project"}</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setModal({
                title: "Add Recurring Expense",
                fields: [
                  { name: "description", label: "Description", placeholder: "e.g. Monthly hosting", required: true },
                  { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                  { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                  { name: "startDate", label: "Start Date (optional)", type: "date" },
                  { name: "endDate", label: "End Date (optional)", type: "date" },
                ],
                onSubmit: (v) => addRecurringExpense(p.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null),
              })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projLinkedExp.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No recurring expenses yet. Add one to track monthly or yearly costs for this project.</p>
            ) : (
              <div className="space-y-5">
                {projLinkedExp.map((r) => {
                  const periods = generateRecurringPeriods(r.startDate, r.frequency);
                  const paidItems = recurringExpensePayments.filter((ep) => ep.recurringExpenseId === r.id);
                  const paidAmount = paidItems.reduce((a, ep) => a + ep.amount, 0);
                  const yearCount = getYearPotentialCount(r.startDate, r.frequency);
                  const yearCost = yearCount * r.amount;
                  return (
                    <div key={r.id} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{r.description}</p>
                            {!r.startDate && <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-[10px]">Potential</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {currency(r.amount)} / {r.frequency}
                            {r.startDate ? ` · started ${formatDate(r.startDate)} · ${periods.length} period${periods.length !== 1 ? "s" : ""} to date` : " · start date not set"}
                            {" · "}<span className="text-orange-600 font-medium">{currency(yearCost)} year cost</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.startDate && <div className="text-right mr-2">
                            <p className="text-sm font-bold tabular-nums text-orange-500">{currency(paidAmount)}</p>
                            <p className="text-xs text-muted-foreground">{paidItems.length}/{periods.length} paid</p>
                          </div>}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({
                            title: "Edit Recurring Expense",
                            fields: [
                              { name: "description", label: "Description", default: r.description, required: true },
                              { name: "amount", label: "Amount (BHD)", type: "number", default: String(r.amount), required: true },
                              { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: r.frequency, required: true },
                              { name: "startDate", label: "Start Date (optional)", type: "date", default: r.startDate || "" },
                              { name: "endDate", label: "End Date (optional)", type: "date", default: r.endDate || "" },
                            ],
                            onSubmit: (v) => editRecurringExpense(r.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null),
                          })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringExpense(r.id, r.description)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {!r.startDate ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
                          <span>Set a start date to begin tracking payments per period.</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setModal({ title: "Set Start Date", fields: [{ name: "startDate", label: "Start Date", type: "date", required: true }], onSubmit: (v) => editRecurringExpense(r.id, r.amount, r.frequency, r.description, v.startDate) })}>
                            Set Start Date
                          </Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader><TableRow className="bg-muted/20"><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {[...periods].reverse().map((periodDate) => {
                              const payment = paidItems.find((ep) => ep.periodDate === periodDate);
                              const isPaid = !!payment;
                              return (
                                <TableRow key={periodDate} className={cn(isPaid && "bg-orange-50/30")}>
                                  <TableCell className="font-medium">{formatPeriodLabel(periodDate, r.frequency)}</TableCell>
                                  <TableCell className="tabular-nums text-muted-foreground">{currency(r.amount)}</TableCell>
                                  <TableCell><Badge className={cn("font-medium", isPaid ? "bg-orange-100 text-orange-700 hover:bg-orange-100" : "bg-muted text-muted-foreground")}>{isPaid ? "Paid Out" : "Unpaid"}</Badge></TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className={cn("h-7 text-xs gap-1", isPaid ? "text-muted-foreground hover:text-red-600" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50")} onClick={() => toggleRecurringExpPayment(r, periodDate, payment)}>
                                      {isPaid ? <><X className="h-3 w-3" />Unmark</> : <><CheckCircle2 className="h-3 w-3" />Mark Paid</>}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Bank View ---
  function BankView() {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Bank Savings</h1><p className="text-sm text-muted-foreground">Pool funded by 55% of project profit + 100% of recurring revenue. Funds dividends and ops.</p></div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Landmark} label="Total in Bank" value={currency(totalPhysicalBank)} variant="highlight" />
          <StatCard icon={ArrowUpRight} label="Bank Inflow" value={currency(globalBank.income)} variant="income" sub={`${currency(globalBank.projectShare)} share + ${currency(recurringRevenueIncome.total)} recurring`} />
          <StatCard icon={ArrowDownRight} label="Bank Outflow" value={currency(globalBank.spent + totalBudgetSpent + totalDividendsPaid + generalRecurringExp)} variant="expense" sub="Spending + budgets + dividends + general recurring" />
          <StatCard icon={Wallet} label="Bank Spendable" value={currency(bankSpendable)} variant={bankSpendable >= 0 ? "bank" : "expense"} sub="Available for ops + dividends" />
        </div>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Bank Pool Composition</CardTitle><CardDescription>How inflows and outflows shape the spendable balance</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Project profit share (55%)", value: globalBank.projectShare, color: "bg-indigo-500", isInflow: true },
              { label: "Recurring revenue (project paid)", value: recurringRevenueIncome.projectLinkedPaid, color: "bg-emerald-500", isInflow: true },
              { label: "Recurring revenue (general)", value: recurringRevenueIncome.generalActive, color: "bg-emerald-400", isInflow: true },
              { label: "Bank spending", value: -globalBank.spent, color: "bg-red-400" },
              { label: "Budget spending", value: -totalBudgetSpent, color: "bg-orange-400" },
              { label: "Partner dividends paid", value: -totalDividendsPaid, color: "bg-rose-400" },
              { label: "General recurring expenses", value: -generalRecurringExp, color: "bg-amber-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={cn("h-3 w-3 rounded-full", item.color)} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", item.value < 0 ? "text-red-600" : item.isInflow ? "text-emerald-600" : "")}>{currency(item.value)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-primary">Bank Spendable</span>
              <span className={cn("text-sm font-bold tabular-nums", bankSpendable >= 0 ? "text-primary" : "text-red-600")}>{currency(bankSpendable)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div><CardTitle className="text-base">Partner Dividends</CardTitle><CardDescription>Bank-funded payouts to Suhaib & Mohammed (the salary mechanism)</CardDescription></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={bankSpendable <= 0} onClick={() => setModal({
                  title: "Pay Dividend — Suhaib",
                  fields: [
                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                    { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                    { name: "note", label: "Note", placeholder: "Dividend note (optional)" },
                  ],
                  onSubmit: (v) => addPartnerDividend("suhaib", parseFloat(v.amount), v.date, v.note),
                })}>
                  <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" /> Pay Suhaib
                </Button>
                <Button size="sm" variant="outline" disabled={bankSpendable <= 0} onClick={() => setModal({
                  title: "Pay Dividend — Mohammed",
                  fields: [
                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                    { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                    { name: "note", label: "Note", placeholder: "Dividend note (optional)" },
                  ],
                  onSubmit: (v) => addPartnerDividend("mohammed", parseFloat(v.amount), v.date, v.note),
                })}>
                  <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" /> Pay Mohammed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div className="rounded-lg border p-3"><p className="text-[11px] uppercase font-semibold text-muted-foreground">Suhaib total dividends</p><p className="text-base font-bold tabular-nums">{currency(suhaibDividendsTotal)}</p><p className="text-xs text-muted-foreground">{suhaibDividends.length} payment{suhaibDividends.length !== 1 ? "s" : ""}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[11px] uppercase font-semibold text-muted-foreground">Mohammed total dividends</p><p className="text-base font-bold tabular-nums">{currency(mohammedDividendsTotal)}</p><p className="text-xs text-muted-foreground">{mohammedDividends.length} payment{mohammedDividends.length !== 1 ? "s" : ""}</p></div>
            </div>
            {partnerDividends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No dividends paid yet. Use the buttons above to record one.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Partner</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Note</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {[...partnerDividends].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.partnerName === "suhaib" ? "Suhaib" : "Mohammed"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(d.date)}</TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 tabular-nums font-semibold">{currency(d.amount)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{d.note || "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deletePartnerDividend(d.id, d.amount)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Spending History</CardTitle><CardDescription>Independent of project expenses</CardDescription></div>
              <Button size="sm" onClick={() => setModal({ title: "Spend from Bank", fields: [{ name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }, { name: "description", label: "Description", placeholder: "What was this for?", required: true }], onSubmit: (v) => addBankSpending(parseFloat(v.amount), v.date, v.description) })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Spending
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bankSpending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No spending recorded from bank savings yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {[...bankSpending].reverse().map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground">{formatDate(s.date)}</TableCell>
                        <TableCell><Badge variant="destructive" className="tabular-nums font-semibold">{currency(s.amount)}</Badge></TableCell>
                        <TableCell>{s.description}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteBankSpending(s.id, s.amount)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Contributions by Project</CardTitle><CardDescription>How much each project contributed to bank savings</CardDescription></CardHeader>
          <CardContent>
            {projectStats.filter((p) => p.bankShare > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No contributions yet.</p>
            ) : (
              <div className="space-y-1">
                {projectStats.filter((p) => p.bankShare > 0).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openProject(p.id)}>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{currency(p.bankShare)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {(recurringRevenue.length > 0 || recurringExpenses.length > 0) && (() => {
          const monthlyRev = recurringRevenue.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0);
          const monthlyExp = recurringExpenses.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0);
          const netMonthly = monthlyRev - monthlyExp;
          return (
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Recurring Impact</CardTitle><CardDescription>Projected monthly cash flow from recurring items</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Monthly Revenue" value={currency(monthlyRev)} variant="income" />
                  <StatCard label="Monthly Expenses" value={currency(monthlyExp)} variant="expense" />
                  <StatCard label="Net Monthly" value={currency(netMonthly)} variant={netMonthly >= 0 ? "income" : "expense"} />
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  }

  // --- Budgets View ---
  function BudgetsView() {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><h1 className="text-2xl font-bold tracking-tight">Budgets</h1><p className="text-sm text-muted-foreground">{budgets.length} budget{budgets.length !== 1 ? "s" : ""} total</p></div>
          <Button onClick={() => setModal({ title: "New Budget", fields: [{ name: "name", label: "Budget Name", placeholder: "e.g. Marketing", required: true }, { name: "allocatedAmount", label: "Allocated Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "description", label: "Description", placeholder: "Budget description" }], onSubmit: (v) => addBudget(v.name, parseFloat(v.allocatedAmount), v.description) })}>
            <Plus className="mr-1.5 h-4 w-4" /> New Budget
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Target} label="Total Allocated" value={currency(totalBudgetAllocated)} variant="income" sub={`${budgets.length} budget${budgets.length !== 1 ? "s" : ""}`} />
          <StatCard icon={ArrowDownRight} label="Total Spent" value={currency(totalBudgetSpent)} variant="expense" />
          <StatCard icon={Wallet} label="Total Remaining" value={currency(totalBudgetAllocated - totalBudgetSpent)} variant={(totalBudgetAllocated - totalBudgetSpent) >= 0 ? "income" : "expense"} />
        </div>

        {budgetStats.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState icon={Target} title="No budgets yet" description='Click "New Budget" above to create your first one.' />
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {budgetStats.map((b) => {
              const pct = b.allocatedAmount > 0 ? Math.min(100, (b.spent / b.allocatedAmount) * 100) : 0;
              return (
                <Card key={b.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{b.name}</CardTitle>
                        {b.description && <CardDescription>{b.description}</CardDescription>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModal({ title: "Edit Budget", fields: [{ name: "name", label: "Budget Name", default: b.name, required: true }, { name: "allocatedAmount", label: "Allocated Amount (BHD)", type: "number", default: String(b.allocatedAmount), required: true }, { name: "description", label: "Description", default: b.description || "", placeholder: "Budget description" }], onSubmit: (v) => editBudget(b.id, v.name, parseFloat(v.allocatedAmount), v.description) })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteBudget(b.id, b.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Usage</span>
                        <span className={cn("font-semibold", pct > 90 && "text-red-500")}>{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className={cn("h-2", pct > 90 && "[&>div]:bg-red-500")} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-[11px] font-semibold text-muted-foreground uppercase">Allocated</p><p className="text-sm font-bold tabular-nums">{currency(b.allocatedAmount)}</p></div>
                      <div><p className="text-[11px] font-semibold text-muted-foreground uppercase">Spent</p><p className="text-sm font-bold tabular-nums text-red-600">{currency(b.spent)}</p></div>
                      <div><p className="text-[11px] font-semibold text-muted-foreground uppercase">Left</p><p className={cn("text-sm font-bold tabular-nums", b.remaining >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(b.remaining)}</p></div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setModal({ title: "Add Spending — " + b.name, fields: [{ name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }, { name: "description", label: "Description", placeholder: "What was this for?", required: true }], onSubmit: (v) => addBudgetSpending(b.id, parseFloat(v.amount), v.date, v.description) })}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Spending
                    </Button>
                    {(b.spending || []).length > 0 && (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                          <TableBody>
                            {[...(b.spending || [])].reverse().map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="text-muted-foreground text-xs">{formatDate(s.date)}</TableCell>
                                <TableCell><Badge variant="destructive" className="tabular-nums text-xs">{currency(s.amount)}</Badge></TableCell>
                                <TableCell className="text-xs">{s.description}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => deleteBudgetSpending(s.id, s.amount)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Recurring View ---
  function RecurringView() {
    const activeRev = recurringRevenue.filter((r) => r.active);
    const activeExp = recurringExpenses.filter((r) => r.active);

    // Revenue counts only what we're actually collecting.
    // - General (untagged) active items: flow direct to bank, no payment tracking — count if active.
    // - Project-linked items: only count if at least one period has been paid (validated as flowing).
    const validatedRev = activeRev.filter((r) => {
      if (!r.projectId) return true;
      return recurringRevenuePayments.some((rp) => rp.recurringRevenueId === r.id);
    });
    const unvalidatedCount = activeRev.length - validatedRev.length;

    // Monthly run-rate: yearly items / 12, monthly items as-is. Revenue uses validated-only.
    const monthlyRevRate = validatedRev.reduce((a, r) => a + (r.frequency === "yearly" ? r.amount / 12 : r.amount), 0);
    const monthlyExpRate = activeExp.reduce((a, r) => a + (r.frequency === "yearly" ? r.amount / 12 : r.amount), 0);
    const netMonthlyRate = monthlyRevRate - monthlyExpRate;

    // Year potential / cost (capped to current year). Revenue uses validated-only.
    const yearRevPotential = validatedRev.reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0);
    const yearExpCost = activeExp.reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0);

    // Cash actually collected from project-linked recurring revenue
    const totalRevCollected = recurringRevenuePayments.reduce((a, rp) => a + rp.amount, 0);
    // Cash actually paid out on project-linked recurring expenses (period-tracked subset)
    const totalExpPaidOut = recurringExpensePayments.reduce((a, ep) => a + ep.amount, 0);

    // Accrual cost across all generated periods (matches profit calculation)
    const accrualExpTotal = recurringExpenses.reduce(
      (a, r) => a + (r.active ? generateRecurringPeriods(r.startDate, r.frequency).length * r.amount : 0),
      0,
    );

    // Pending revenue: sum of active project-linked unpaid periods × amount
    const pendingProjectRev = recurringRevenue
      .filter((r) => r.active && r.projectId && r.startDate)
      .reduce((a, r) => {
        const periods = generateRecurringPeriods(r.startDate, r.frequency);
        const paid = recurringRevenuePayments.filter((rp) => rp.recurringRevenueId === r.id).length;
        return a + Math.max(0, periods.length - paid) * r.amount;
      }, 0);

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recurring</h1>
            <p className="text-sm text-muted-foreground">{recurringRevenue.length} revenue &middot; {recurringExpenses.length} expense items &middot; {activeRev.length + activeExp.length} active</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ArrowUpRight} label="Revenue Collected" value={currency(totalRevCollected)} variant="income" sub={pendingProjectRev > 0 ? `+ ${currency(pendingProjectRev)} pending` : "All paid"} />
          <StatCard icon={ArrowDownRight} label="Expense Cost (accrual)" value={currency(accrualExpTotal)} variant="expense" sub={totalExpPaidOut > 0 ? `${currency(totalExpPaidOut)} paid out` : "All periods counted as cost"} />
          <StatCard icon={Repeat} label="Net Monthly Run-rate" value={currency(netMonthlyRate)} variant={netMonthlyRate >= 0 ? "income" : "expense"} sub={`${currency(monthlyRevRate)} in / ${currency(monthlyExpRate)} out${unvalidatedCount > 0 ? ` · ${unvalidatedCount} unpaid excluded` : ""}`} />
          <StatCard icon={CircleDollarSign} label="Year Potential" value={currency(yearRevPotential)} variant="highlight" sub={`Net ${currency(yearRevPotential - yearExpCost)} · only validated streams`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Revenue Streams" value={String(activeRev.length)} variant={activeRev.length > 0 ? "income" : "default"} sub={`${activeRev.filter((r) => r.frequency === "monthly").length} monthly · ${activeRev.filter((r) => r.frequency === "yearly").length} yearly`} />
          <StatCard label="Active Expense Streams" value={String(activeExp.length)} variant={activeExp.length > 0 ? "expense" : "default"} sub={`${activeExp.filter((r) => r.frequency === "monthly").length} monthly · ${activeExp.filter((r) => r.frequency === "yearly").length} yearly`} />
          <StatCard label="Tagged to Projects" value={String(recurringRevenue.filter((r) => r.projectId).length + recurringExpenses.filter((r) => r.projectId).length)} variant="default" sub="Credited to project profit" />
          <StatCard label="General (Untagged)" value={String(recurringRevenue.filter((r) => !r.projectId).length + recurringExpenses.filter((r) => !r.projectId).length)} variant="default" sub="Flow direct to bank" />
        </div>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="revenue" className="flex-1 sm:flex-initial">Revenue ({recurringRevenue.length})</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 sm:flex-initial">Expenses ({recurringExpenses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recurring Revenue</CardTitle>
                  <Button size="sm" onClick={() => setModal({
                    title: "Add Recurring Revenue",
                    fields: [
                      { name: "description", label: "Description", placeholder: "e.g. Monthly retainer", required: true },
                      { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                      { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                      { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" },
                      { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                      { name: "endDate", label: "End Date (optional, triggers expiry alert)", type: "date" },
                      { name: "domainName", label: "Add Domain? (optional)", placeholder: "e.g. example.com — leave blank to skip" },
                      { name: "domainExpiry", label: "Domain Expiry Date (only if domain set)", type: "date" },
                    ],
                    onSubmit: (v) => addRecurringRevenue(v.projectId || null, parseFloat(v.amount), v.frequency, v.description, v.startDate, v.endDate || null, v.domainName || null, v.domainExpiry || null),
                  })}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Revenue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recurringRevenue.length === 0 ? (
                  <EmptyState icon={Repeat} title="No recurring revenue" description="Add a recurring revenue stream to track projected income." />
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50"><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Project</TableHead><TableHead>Ends</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringRevenue.map((item) => {
                          const days = item.endDate ? daysUntil(item.endDate) : null;
                          const threshold = reminderThresholdDays(item.frequency);
                          const flagged = item.active && days !== null && days <= threshold;
                          const hasPayments = recurringRevenuePayments.some((rp) => rp.recurringRevenueId === item.id);
                          // Status: Paused if inactive, Unpaid if project-linked active but no payments yet, Active otherwise
                          let statusLabel, statusClass;
                          if (!item.active) { statusLabel = "Paused"; statusClass = ""; }
                          else if (item.projectId && !hasPayments) { statusLabel = "Unpaid"; statusClass = "bg-amber-100 text-amber-700 hover:bg-amber-100"; }
                          else { statusLabel = "Active"; statusClass = "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"; }
                          return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-emerald-600 tabular-nums font-semibold">{currency(item.amount)}</TableCell>
                            <TableCell><Badge variant="outline">{item.frequency}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{projects.find((p) => p.id === item.projectId)?.name || "General"}</TableCell>
                            <TableCell>
                              {item.endDate ? (
                                <span className={cn("text-xs tabular-nums", flagged ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                                  {formatDate(item.endDate)}{flagged ? ` · ${formatExpiryDistance(days)}` : ""}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleRecurringRevenue(item.id, item.active)}>
                                <Badge variant={item.active ? "default" : "secondary"} className={cn(statusClass)}>
                                  {statusLabel}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => setModal({
                                  title: "Edit Recurring Revenue",
                                  fields: [
                                    { name: "description", label: "Description", required: true, default: item.description },
                                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true, default: String(item.amount) },
                                    { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: item.frequency, required: true },
                                    { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: item.projectId || "" },
                                    { name: "startDate", label: "Start Date", type: "date", default: item.startDate || "", required: true },
                                    { name: "endDate", label: "End Date (optional)", type: "date", default: item.endDate || "" },
                                  ],
                                  onSubmit: (v) => editRecurringRevenue(item.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null, v.projectId || null),
                                })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringRevenue(item.id, item.description)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recurring Expenses</CardTitle>
                  <Button size="sm" onClick={() => setModal({
                    title: "Add Recurring Expense",
                    fields: [
                      { name: "description", label: "Description", placeholder: "e.g. Office rent", required: true },
                      { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                      { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                      { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" },
                      { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                      { name: "endDate", label: "End Date (optional)", type: "date" },
                    ],
                    onSubmit: (v) => addRecurringExpense(v.projectId || null, parseFloat(v.amount), v.frequency, v.description, v.startDate, v.endDate || null),
                  })}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Expense
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recurringExpenses.length === 0 ? (
                  <EmptyState icon={Repeat} title="No recurring expenses" description="Add recurring expenses to track projected costs." />
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50"><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Project</TableHead><TableHead>Ends</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringExpenses.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-red-600 tabular-nums font-semibold">{currency(item.amount)}</TableCell>
                            <TableCell><Badge variant="outline">{item.frequency}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{projects.find((p) => p.id === item.projectId)?.name || "General"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.endDate ? formatDate(item.endDate) : "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => toggleRecurringExpense(item.id, item.active)}>
                                <Badge variant={item.active ? "default" : "secondary"} className={cn(item.active && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
                                  {item.active ? "Active" : "Paused"}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => setModal({
                                  title: "Edit Recurring Expense",
                                  fields: [
                                    { name: "description", label: "Description", required: true, default: item.description },
                                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true, default: String(item.amount) },
                                    { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: item.frequency, required: true },
                                    { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: item.projectId || "" },
                                    { name: "startDate", label: "Start Date", type: "date", default: item.startDate || "", required: true },
                                    { name: "endDate", label: "End Date (optional)", type: "date", default: item.endDate || "" },
                                  ],
                                  onSubmit: (v) => editRecurringExpense(item.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null, v.endDate || null, v.projectId || null),
                                })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringExpense(item.id, item.description)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // --- Domains View ---
  // Color for a due-date badge by urgency, relative to the item's own reminder lead time.
  const dueBadgeClass = (days, lead = 30) =>
    days === null ? "bg-muted text-muted-foreground hover:bg-muted"
      : days < 0 ? "bg-red-100 text-red-700 hover:bg-red-100"
      : days <= Math.max(3, Math.round(lead / 3)) ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
      : days <= lead ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  // Reminder lead for a timeline entry (domains renew yearly → 3 months).
  const entryLead = (e) => (e.kind === "domain" ? 90 : paymentLeadDays(e.item.frequency));

  function PaymentsView() {
    const paymentFields = (defaults = {}) => [
      { name: "direction", label: "Direction", type: "select", options: [{ id: "outgoing", name: "Outgoing (we pay)" }, { id: "incoming", name: "Incoming (we receive)" }], default: defaults.direction || "outgoing", required: true },
      { name: "name", label: "Name / Description", placeholder: "e.g. Apple Developer Program", required: true, default: defaults.name || "" },
      { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true, allowZero: true, default: defaults.amount !== undefined && defaults.amount !== null ? String(defaults.amount) : "" },
      { name: "frequency", label: "Frequency", type: "select", options: PAYMENT_FREQUENCIES, default: defaults.frequency || "yearly", required: true },
      { name: "startDate", label: "First due / start date", type: "date", required: true, default: defaults.startDate || "" },
      { name: "endDate", label: "End date (optional — blank = recurs until you close it)", type: "date", default: defaults.endDate || "" },
      { name: "projectId", label: "Link to project (optional)", type: "select", options: projects, placeholder: "No project link", default: defaults.projectId || "" },
      { name: "notes", label: "Notes (optional)", placeholder: "Anything else", default: defaults.notes || "" },
    ];

    const openAdd = (direction = "outgoing") => setModal({
      title: "Add Payment",
      fields: paymentFields({ direction }),
      onSubmit: (v) => addPaymentItem(v.direction, "other", v.name, parseFloat(v.amount), v.frequency, v.startDate, v.endDate || null, v.projectId || null, v.notes || null),
    });
    const openEdit = (item) => setModal({
      title: "Edit Payment",
      fields: paymentFields(item),
      onSubmit: (v) => editPaymentItem(item.id, v.direction, item.category || "other", v.name, parseFloat(v.amount), v.frequency, v.startDate, v.endDate || null, v.projectId || null, item.active, v.notes || null),
    });

    // "Due soon" = within the item's own reminder lead (monthly 2wk, yearly 3mo, one-time 30d).
    const inWindow = (e) => e.days !== null && e.days >= 0 && e.days <= entryLead(e);
    const dueSoonCount = paymentTimeline.filter(inWindow).length;
    const overdueCount = paymentTimeline.filter((e) => e.days !== null && e.days < 0).length;
    const outSoon = paymentTimeline.filter((e) => (inWindow(e) || e.days < 0) && (e.kind === "domain" || e.item.direction === "outgoing")).reduce((a, e) => a + (e.kind === "domain" ? (e.domain.renewalCost || 0) : e.item.amount), 0);
    const inSoon = paymentTimeline.filter((e) => e.kind === "schedule" && e.item.direction === "incoming" && (inWindow(e) || e.days < 0)).reduce((a, e) => a + e.item.amount, 0);

    // Frequency-aware groups: an item only enters "Due soon" once inside its lead window.
    const buckets = [
      { key: "overdue", label: "Overdue", test: (e) => e.days !== null && e.days < 0 },
      { key: "soon", label: "Due soon", test: (e) => inWindow(e) },
      { key: "scheduled", label: "Scheduled (not due yet)", test: (e) => e.days === null || e.days > entryLead(e) },
    ];

    const DirectionIcon = ({ entry, className }) => {
      if (entry.kind === "domain") return <Globe className={cn("h-4 w-4 text-indigo-500", className)} />;
      return entry.item.direction === "incoming"
        ? <ArrowDownRight className={cn("h-4 w-4 text-emerald-600", className)} />
        : <ArrowUpRight className={cn("h-4 w-4 text-red-500", className)} />;
    };

    const TimelineRow = ({ entry }) => {
      const project = entry.kind === "schedule" ? projects.find((p) => p.id === entry.item.projectId) : projects.find((p) => p.id === entry.domain.projectId);
      const title = entry.kind === "domain" ? entry.domain.name : entry.item.name;
      const meta = entry.kind === "domain"
        ? `Domain renewal${entry.domain.registrar ? ` · ${entry.domain.registrar}` : ""}`
        : frequencyLabel(entry.item.frequency);
      return (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <DirectionIcon entry={entry} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{title}</span>
              {entry.kind === "schedule" && <Badge variant="outline" className="text-[10px] capitalize">{entry.item.direction}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {meta}{project ? ` · ${project.name}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            {entry.kind === "schedule"
              ? <p className={cn("font-semibold tabular-nums text-sm", entry.item.direction === "incoming" ? "text-emerald-700" : "text-red-600")}>{currency(entry.item.amount)}</p>
              : <p className="font-semibold tabular-nums text-sm text-red-600">{entry.domain.renewalCost > 0 ? currency(entry.domain.renewalCost) : "renewal"}</p>}
            <p className="text-[11px] text-muted-foreground tabular-nums">{formatDate(entry.dueDate)}</p>
          </div>
          <Badge className={cn("tabular-nums shrink-0", dueBadgeClass(entry.days, entryLead(entry)))}>{formatExpiryDistance(entry.days)}</Badge>
          {entry.kind === "schedule" ? (
            <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={loading} onClick={() => togglePaymentPaid(entry.item, entry.dueDate, null)}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark paid
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={loading} onClick={() => renewDomain(entry.domain)}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Renew
            </Button>
          )}
        </div>
      );
    };

    // Management table for a given direction (schedule items only; domains live in the Domains tab).
    const ManageList = ({ direction }) => {
      const items = paymentSchedule
        .filter((i) => i.direction === direction)
        .sort((a, b) => Number(b.active) - Number(a.active) || (a.name || "").localeCompare(b.name || ""));
      if (items.length === 0) {
        return <EmptyState icon={direction === "incoming" ? ArrowDownRight : ArrowUpRight} title={`No ${direction} items`} description={`Add an ${direction} payment to start tracking it.`} action={<Button onClick={() => openAdd(direction)}><Plus className="mr-1.5 h-4 w-4" /> Add {direction === "incoming" ? "Incoming" : "Outgoing"}</Button>} />;
      }
      return (
        <div className="space-y-2">
          {items.map((item) => {
            const paid = paidPeriodsByScheduleItem[item.id] || new Set();
            const { overdueCount, paidCount, occurrences, currentPeriod, currentPaid, nextPeriod } = paymentItemStatus(item, paid);
            const project = projects.find((p) => p.id === item.projectId);
            const expanded = paymentsExpandedId === item.id;
            const lead = paymentLeadDays(item.frequency);
            const currentDays = currentPeriod ? daysUntil(currentPeriod) : null;
            // the saved payment for the current period (lets us toggle it back to unpaid)
            const currentPayment = paymentSchedulePayments.find((pp) => pp.paymentScheduleId === item.id && pp.periodDate === currentPeriod);
            return (
              <div key={item.id} className={cn("rounded-lg border", !item.active && "opacity-60")}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted" onClick={() => setPaymentsExpandedId(expanded ? null : item.id)} title="Show payment history">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge variant="outline" className="text-[10px]">{frequencyLabel(item.frequency)}</Badge>
                      {!item.active && <Badge className="bg-muted text-muted-foreground text-[10px] hover:bg-muted">Closed</Badge>}
                      {overdueCount > 0 && item.active && <Badge className="bg-red-100 text-red-700 text-[10px] hover:bg-red-100">{overdueCount} overdue</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {currency(item.amount)}
                      {project ? ` · ${project.name}` : ""}
                      {item.endDate ? ` · ends ${formatDate(item.endDate)}` : ""}
                      {` · ✓ ${paidCount} paid`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block min-w-[92px]">
                    {currentPaid ? (
                      <>
                        <p className="text-[11px] uppercase tracking-wide text-emerald-600">Paid this period</p>
                        <p className="text-xs tabular-nums text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />{nextPeriod ? `Next ${formatDate(nextPeriod)}` : "No further dues"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{currentDays !== null && currentDays < 0 ? "Overdue" : "Due"}</p>
                        <p className="text-xs tabular-nums">{currentPeriod ? formatDate(currentPeriod) : "—"}</p>
                      </>
                    )}
                  </div>
                  {item.active && currentPeriod && !currentPaid && (
                    <Badge className={cn("tabular-nums shrink-0", dueBadgeClass(currentDays, lead))}>{formatExpiryDistance(currentDays)}</Badge>
                  )}
                  {item.active && currentPaid && (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shrink-0 gap-1" title={nextPeriod ? "Next available to pay" : undefined}>
                      <Clock className="h-3 w-3" />{nextPeriod ? formatDate(nextPeriod) : "done"}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.active && currentPeriod && (
                      currentPaid ? (
                        <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" disabled={loading} onClick={() => togglePaymentPaid(item, currentPeriod, currentPayment)} title={`Mark ${formatPeriodLabel(currentPeriod, item.frequency)} unpaid`}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Mark unpaid
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8" disabled={loading} onClick={() => togglePaymentPaid(item, currentPeriod, null)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark paid
                        </Button>
                      )
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPaymentItemActive(item)} title={item.active ? "Close / end" : "Reopen"}>
                      {item.active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deletePaymentItem(item.id, item.name)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment history</p>
                    {occurrences.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No occurrences yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {[...occurrences].reverse().slice(0, 18).map((occ) => {
                          const existing = paymentSchedulePayments.find((pp) => pp.paymentScheduleId === item.id && pp.periodDate === occ);
                          return (
                            <button
                              key={occ}
                              disabled={loading}
                              onClick={() => togglePaymentPaid(item, occ, existing)}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] tabular-nums transition-colors",
                                existing ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-input bg-card text-muted-foreground hover:bg-muted",
                              )}
                              title={existing ? "Marked paid — click to undo" : "Click to mark paid"}
                            >
                              {existing ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}
                              {formatDate(occ)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground">Track incoming &amp; outgoing payments, renewals and domains.</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Tracking &amp; reminders only — does not affect bank balances, profit or margins.
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" /> Reminder lead time: <b>monthly</b> shows 2 weeks before · <b>yearly</b> shows 3 months before · <b>one-time</b> 30 days before. Items leave “Due soon” once you mark the current period paid.
            </p>
          </div>
          <Button onClick={() => openAdd("outgoing")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Payment
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CalendarClock} label="Due Soon" value={String(dueSoonCount)} variant={dueSoonCount > 0 ? "highlight" : "default"} sub="Within reminder window" />
          <StatCard icon={AlertTriangle} label="Overdue" value={String(overdueCount)} variant={overdueCount > 0 ? "expense" : "default"} />
          <StatCard icon={ArrowUpRight} label="Outgoing due soon" value={currency(outSoon)} variant="expense" />
          <StatCard icon={ArrowDownRight} label="Incoming due soon" value={currency(inSoon)} variant="income" />
        </div>

        <Tabs value={paymentsTab} onValueChange={setPaymentsTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {paymentTimeline.length === 0 ? (
              <Card><CardContent className="p-0">
                <EmptyState icon={CalendarClock} title="Nothing scheduled" description='Add an incoming or outgoing payment, or a domain, to see it here.' action={<Button onClick={() => openAdd("outgoing")}><Plus className="mr-1.5 h-4 w-4" /> Add Payment</Button>} />
              </CardContent></Card>
            ) : (
              <div className="space-y-5">
                {buckets.map((bucket) => {
                  const entries = paymentTimeline.filter((e) => bucket.test(e));
                  if (entries.length === 0) return null;
                  return (
                    <div key={bucket.key}>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{bucket.label}</h3>
                        <Badge variant="outline" className="text-[10px]">{entries.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {entries.map((entry) => <TimelineRow key={entry.id} entry={entry} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div><CardTitle className="text-base">Outgoing payments</CardTitle><CardDescription>What we owe — expand a row for its full history</CardDescription></div>
                <Button size="sm" onClick={() => openAdd("outgoing")}><Plus className="mr-1.5 h-4 w-4" /> Add</Button>
              </CardHeader>
              <CardContent><ManageList direction="outgoing" /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div><CardTitle className="text-base">Incoming payments</CardTitle><CardDescription>What clients owe us (AMC, etc.) — expand a row for its full history</CardDescription></div>
                <Button size="sm" onClick={() => openAdd("incoming")}><Plus className="mr-1.5 h-4 w-4" /> Add</Button>
              </CardHeader>
              <CardContent><ManageList direction="incoming" /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains" className="mt-4">
            <DomainsView embedded />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  function DomainsView({ embedded = false } = {}) {
    const sorted = [...domains].sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""));
    const expiringSoon = sorted.filter((d) => {
      const days = daysUntil(d.expiryDate);
      return days !== null && days <= 90;
    });
    const upcomingCount = expiringSoon.length;

    const domainFields = (defaults = {}) => [
      { name: "name", label: "Domain Name", placeholder: "e.g. example.com", required: true, default: defaults.name || "" },
      { name: "expiryDate", label: "Expiry Date", type: "date", required: true, default: defaults.expiryDate || "" },
      { name: "renewalCost", label: "Renewal cost (BHD)", type: "number", placeholder: "0.000", allowZero: true, default: defaults.renewalCost !== undefined && defaults.renewalCost !== null ? String(defaults.renewalCost) : "" },
      { name: "registrar", label: "Registrar (optional)", placeholder: "e.g. Cloudflare, Namecheap", default: defaults.registrar || "" },
      { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "No project link", default: defaults.projectId || "" },
      { name: "recurringRevenueId", label: "Linked Recurring Revenue (optional)", type: "select", options: recurringRevenue.map((r) => ({ id: r.id, name: `${r.description} (${r.frequency})` })), placeholder: "No recurring link", default: defaults.recurringRevenueId || "" },
      { name: "autoRenew", label: "Auto-renew", type: "checkbox", checkboxLabel: "Domain renews automatically", default: defaults.autoRenew || false },
      { name: "notes", label: "Notes (optional)", placeholder: "Anything else", default: defaults.notes || "" },
    ];

    return (
      <div className={cn(!embedded && "animate-fade-in-up", "space-y-6")}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {embedded
              ? <h2 className="text-lg font-semibold tracking-tight">Domains</h2>
              : <h1 className="text-2xl font-bold tracking-tight">Domains</h1>}
            <p className="text-sm text-muted-foreground">{domains.length} domain{domains.length !== 1 ? "s" : ""} tracked · {upcomingCount} expiring within 90 days</p>
          </div>
          <Button onClick={() => setModal({
            title: "Add Domain",
            fields: domainFields(),
            onSubmit: (v) => addDomain(v.name, v.expiryDate, v.projectId || null, v.recurringRevenueId || null, v.registrar || null, v.autoRenew === true || v.autoRenew === "true", v.notes || null, parseFloat(v.renewalCost) || 0),
          })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Domain
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Globe} label="Total Domains" value={String(domains.length)} variant="default" />
          <StatCard icon={Clock} label="Expiring ≤ 90 days" value={String(upcomingCount)} variant={upcomingCount > 0 ? "expense" : "default"} />
          <StatCard icon={CheckCircle2} label="Auto-renew" value={String(domains.filter((d) => d.autoRenew).length)} variant="income" />
        </div>

        {domains.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState icon={Globe} title="No domains tracked" description='Click "Add Domain" above to start tracking expiry dates.' />
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">All Domains</CardTitle><CardDescription>Sorted by expiry · countdown alerts fire 90 days out</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Domain</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Recurring</TableHead>
                      <TableHead>Registrar</TableHead>
                      <TableHead>Auto</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((d) => {
                      const days = daysUntil(d.expiryDate);
                      const flagged = days !== null && days <= 90;
                      const overdue = days !== null && days < 0;
                      const project = projects.find((p) => p.id === d.projectId);
                      const recurring = recurringRevenue.find((r) => r.id === d.recurringRevenueId);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{d.name}</TableCell>
                          <TableCell className="text-muted-foreground tabular-nums">{formatDate(d.expiryDate)}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "tabular-nums",
                              overdue ? "bg-red-100 text-red-700 hover:bg-red-100" :
                              flagged && days <= 30 ? "bg-orange-100 text-orange-700 hover:bg-orange-100" :
                              flagged ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                              "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                            )}>
                              {formatExpiryDistance(days)}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{d.renewalCost > 0 ? currency(d.renewalCost) : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{project?.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{recurring?.description || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{d.registrar || "—"}</TableCell>
                          <TableCell>{d.autoRenew ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModal({
                                title: "Edit Domain",
                                fields: domainFields(d),
                                onSubmit: (v) => editDomain(d.id, v.name, v.expiryDate, v.projectId || null, v.recurringRevenueId || null, v.registrar || null, v.autoRenew === true || v.autoRenew === "true", v.notes || null, parseFloat(v.renewalCost) || 0),
                              })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteDomain(d.id, d.name)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // --- Secret Investment View ---
  function SecretInvestmentView() {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Secret Investment</h1><p className="text-sm text-muted-foreground">25% of all project profits go to secret investment</p></div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={ArrowUpRight} label="Total Accumulated" value={currency(globalSecretInvestment.income)} variant="income" sub="From project profits" />
          <StatCard icon={ArrowDownRight} label="Total Spent" value={currency(globalSecretInvestment.spent)} variant="expense" sub={`${secretInvestmentSpending.length} transaction${secretInvestmentSpending.length !== 1 ? "s" : ""}`} />
          <StatCard icon={PiggyBank} label="Current Balance" value={currency(globalSecretInvestment.balance)} variant="secret" />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Spending History</CardTitle><CardDescription>Independent of project expenses</CardDescription></div>
              <Button size="sm" onClick={() => setModal({ title: "Spend from Secret Investment", fields: [{ name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }, { name: "description", label: "Description", placeholder: "What was this for?", required: true }], onSubmit: (v) => addSecretInvestmentSpending(parseFloat(v.amount), v.date, v.description) })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Spending
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {secretInvestmentSpending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No spending recorded yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {[...secretInvestmentSpending].reverse().map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground">{formatDate(s.date)}</TableCell>
                        <TableCell><Badge variant="destructive" className="tabular-nums font-semibold">{currency(s.amount)}</Badge></TableCell>
                        <TableCell>{s.description}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteSecretInvestmentSpending(s.id, s.amount)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Contributions by Project</CardTitle><CardDescription>How much each project contributed</CardDescription></CardHeader>
          <CardContent>
            {projectStats.filter((p) => p.secretInvestmentShare > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No contributions yet.</p>
            ) : (
              <div className="space-y-1">
                {projectStats.filter((p) => p.secretInvestmentShare > 0).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openProject(p.id)}>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{currency(p.secretInvestmentShare)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Reports View ---
  function ReportsView() {
    const filterByMonth = (dateStr) => dateStr && dateStr.startsWith(reportMonth);
    const monthlyPayments = projectStats.flatMap((p) => (p.payments || []).filter((pay) => filterByMonth(pay.date)));
    const monthlyContractRevenue = monthlyPayments.reduce((a, p) => a + p.amount, 0);
    const monthlyRecurringPaid = recurringRevenuePayments.filter((rp) => filterByMonth(rp.periodDate)).reduce((a, rp) => a + rp.amount, 0);
    const monthlyRevenue = monthlyContractRevenue + monthlyRecurringPaid;
    const monthlyProjectExpenses = projectStats.flatMap((p) => (p.expenses || []).filter((exp) => filterByMonth(exp.date)));
    const monthlyExpenses = monthlyProjectExpenses.reduce((a, e) => a + e.amount, 0);
    const monthlyBankSpent = bankSpending.filter((s) => filterByMonth(s.date)).reduce((a, s) => a + s.amount, 0);
    const monthlySecretSpent = secretInvestmentSpending.filter((s) => filterByMonth(s.date)).reduce((a, s) => a + s.amount, 0);
    const monthlySuhaibWithdrawn = partnerWithdrawals.filter((w) => w.partnerName === "suhaib" && filterByMonth(w.date)).reduce((a, w) => a + w.amount, 0);
    const monthlyMohammedWithdrawn = partnerWithdrawals.filter((w) => w.partnerName === "mohammed" && filterByMonth(w.date)).reduce((a, w) => a + w.amount, 0);
    const monthlySuhaibDividend = partnerDividends.filter((d) => d.partnerName === "suhaib" && filterByMonth(d.date)).reduce((a, d) => a + d.amount, 0);
    const monthlyMohammedDividend = partnerDividends.filter((d) => d.partnerName === "mohammed" && filterByMonth(d.date)).reduce((a, d) => a + d.amount, 0);
    const monthlyBudgetSpent = budgetStats.flatMap((b) => (b.spending || []).filter((s) => filterByMonth(s.date))).reduce((a, s) => a + s.amount, 0);
    const monthlyProfit = monthlyRevenue - monthlyExpenses;
    const monthlyOperatingOutflow = monthlyExpenses + monthlyBankSpent + monthlySecretSpent + monthlyBudgetSpent;
    const monthlyDistributions = monthlySuhaibWithdrawn + monthlyMohammedWithdrawn + monthlySuhaibDividend + monthlyMohammedDividend;

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><h1 className="text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground">Financial reports and analytics</p></div>
          <Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-auto" />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Profit & Loss — {new Date(reportMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</CardTitle>
            <CardDescription>Revenue vs expenses for the selected month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Revenue" value={currency(monthlyRevenue)} variant="income" sub={`Contract ${currency(monthlyContractRevenue)} + Recurring ${currency(monthlyRecurringPaid)}`} />
              <StatCard label="Operating Outflow" value={currency(monthlyOperatingOutflow)} variant="expense" sub="Costs only (excl. partner payouts)" />
              <StatCard label="Net Profit" value={currency(monthlyProfit)} variant={monthlyProfit >= 0 ? "income" : "expense"} />
              <StatCard label="Owner Distributions" value={currency(monthlyDistributions)} variant="bank" sub="Withdrawals + dividends paid" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Partner Summary</CardTitle><CardDescription>All-time earnings, share withdrawals, and bank dividends</CardDescription></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={Users} label="Suhaib" value={currency(suhaibAvailable)} variant="partner1" sub={`Earned ${currency(globalSuhaib)} · Withdrawn ${currency(suhaibWithdrawn)} · Dividends ${currency(suhaibDividendsTotal)}`} />
              <StatCard icon={Users} label="Mohammed" value={currency(mohammedAvailable)} variant="partner2" sub={`Earned ${currency(globalMohammed)} · Withdrawn ${currency(mohammedWithdrawn)} · Dividends ${currency(mohammedDividendsTotal)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Budget Utilization</CardTitle><CardDescription>How budgets are being used</CardDescription></CardHeader>
          <CardContent>
            {budgetStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No budgets created yet.</p>
            ) : (
              <div className="space-y-4">
                {budgetStats.map((b) => {
                  const pct = b.allocatedAmount > 0 ? Math.min(100, (b.spent / b.allocatedAmount) * 100) : 0;
                  return (
                    <div key={b.id} className="rounded-lg bg-muted/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{b.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{currency(b.spent)} / {currency(b.allocatedAmount)}</span>
                      </div>
                      <Progress value={pct} className={cn("h-2", pct > 90 && "[&>div]:bg-red-500", pct > 70 && pct <= 90 && "[&>div]:bg-amber-500")} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(pct)}% used</span>
                        <span>{currency(b.remaining)} remaining</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {(recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Recurring Obligations</CardTitle><CardDescription>Active recurring revenue and expenses</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Monthly Revenue" value={currency(recurringRevenue.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0))} variant="income" sub={`${recurringRevenue.filter((r) => r.active && r.frequency === "monthly").length} active`} />
                <StatCard label="Monthly Expenses" value={currency(recurringExpenses.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0))} variant="expense" sub={`${recurringExpenses.filter((r) => r.active && r.frequency === "monthly").length} active`} />
                <StatCard label="Net Monthly" value={currency(recurringRevenue.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0) - recurringExpenses.filter((r) => r.active && r.frequency === "monthly").reduce((a, r) => a + r.amount, 0))} variant="bank" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Cash Flow Summary</CardTitle><CardDescription>All-time money movement</CardDescription></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Category</TableHead><TableHead>Inflow</TableHead><TableHead>Outflow</TableHead><TableHead>Net</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30"><TableCell colSpan={4} className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Operating</TableCell></TableRow>
                  {[
                    { cat: "Contract Revenue", inflow: globalContractRevenue, outflow: 0 },
                    { cat: "Recurring Revenue (paid)", inflow: recurringRevenueIncome.total, outflow: 0 },
                    { cat: "Project Expenses (incl. recurring)", inflow: 0, outflow: projectStats.reduce((a, p) => a + p.totalExpenses, 0) },
                    { cat: "General Recurring Expenses", inflow: 0, outflow: generalRecurringExp },
                    { cat: "Bank Spending", inflow: 0, outflow: globalBank.spent },
                    { cat: "Secret Investment Spending", inflow: 0, outflow: globalSecretInvestment.spent },
                    { cat: "Budget Spending", inflow: 0, outflow: totalBudgetSpent },
                  ].map((r) => (
                    <TableRow key={r.cat}>
                      <TableCell className="font-medium">{r.cat}</TableCell>
                      <TableCell className={cn("tabular-nums", r.inflow > 0 && "text-emerald-600 font-semibold")}>{r.inflow > 0 ? currency(r.inflow) : "-"}</TableCell>
                      <TableCell className={cn("tabular-nums", r.outflow > 0 && "text-red-600 font-semibold")}>{r.outflow > 0 ? currency(r.outflow) : "-"}</TableCell>
                      <TableCell className={cn("tabular-nums font-semibold", (r.inflow - r.outflow) >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(r.inflow - r.outflow)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t font-bold bg-muted/20">
                    <TableCell>Operating Net</TableCell>
                    <TableCell className="text-emerald-600 tabular-nums">{currency(globalRevenue)}</TableCell>
                    <TableCell className="text-red-600 tabular-nums">{currency(operatingOutflow)}</TableCell>
                    <TableCell className={cn("tabular-nums", operatingNet >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(operatingNet)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30"><TableCell colSpan={4} className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Owner Distributions (paid to partners)</TableCell></TableRow>
                  {[
                    { cat: "Partner Share Withdrawals", inflow: 0, outflow: suhaibWithdrawn + mohammedWithdrawn },
                    { cat: "Partner Bank Dividends", inflow: 0, outflow: totalDividendsPaid },
                  ].map((r) => (
                    <TableRow key={r.cat}>
                      <TableCell className="font-medium">{r.cat}</TableCell>
                      <TableCell className="tabular-nums">-</TableCell>
                      <TableCell className={cn("tabular-nums", r.outflow > 0 && "text-red-600 font-semibold")}>{r.outflow > 0 ? currency(r.outflow) : "-"}</TableCell>
                      <TableCell className={cn("tabular-nums font-semibold", -r.outflow >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(-r.outflow)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Net Cash Position</TableCell>
                    <TableCell className="text-emerald-600 tabular-nums">{currency(globalRevenue)}</TableCell>
                    <TableCell className="text-red-600 tabular-nums">{currency(operatingOutflow + totalDistributions)}</TableCell>
                    <TableCell className={cn("tabular-nums", totalPhysicalBank >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(totalPhysicalBank)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Project Performance</CardTitle><CardDescription>Profitability breakdown by project</CardDescription></CardHeader>
          <CardContent>
            {projectStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No projects yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Project</TableHead><TableHead>Value</TableHead><TableHead>Revenue</TableHead><TableHead>Expenses</TableHead><TableHead>Profit</TableHead><TableHead>Margin</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {projectStats.slice().reverse().map((p) => {
                      const margin = p.totalPaid > 0 ? ((p.profit / p.totalPaid) * 100).toFixed(1) : p.totalValue === 0 ? "—" : "0.0";
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProject(p.id)}>
                          <TableCell className="font-semibold">{p.name}{p.totalValue === 0 && <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Free</Badge>}</TableCell>
                          <TableCell className="tabular-nums">{p.totalValue === 0 ? "Free" : currency(p.totalValue)}</TableCell>
                          <TableCell className="tabular-nums text-emerald-600">{currency(p.totalPaid)}</TableCell>
                          <TableCell className="tabular-nums text-red-600">{currency(p.totalExpenses)}</TableCell>
                          <TableCell className={cn("tabular-nums font-semibold", p.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(p.profit)}</TableCell>
                          <TableCell>
                            <Badge variant={margin === "—" ? "outline" : parseFloat(margin) >= 50 ? "default" : "secondary"} className={cn(margin !== "—" && parseFloat(margin) >= 50 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", margin !== "—" && parseFloat(margin) < 0 && "bg-red-100 text-red-700 hover:bg-red-100")}>
                              {margin === "—" ? "—" : `${margin}%`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== RENDER ====================
  if (!loaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-xl font-extrabold text-white">
            R
          </div>
          <h2 className="text-lg font-bold tracking-tight">RAL Finance</h2>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary" style={{ animation: "loading-slide 1s ease infinite" }} />
        </div>
        <style>{`@keyframes loading-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[272px] shrink-0 border-r border-sidebar-border md:block">
        <div className="fixed top-0 left-0 bottom-0 w-[272px] overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 py-3 md:hidden">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-xs font-bold text-white">R</div>
            <span className="text-sm font-bold">RAL Finance</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          {!canWrite && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" /> <span><b>Read-only access.</b> You can view everything but can't add, edit or delete. Ask the admin for full access.</span>
            </div>
          )}
          {view === "admin" && !isAdmin && <div className="text-sm text-muted-foreground">Not authorized.</div>}
          {view === "admin" && isAdmin && <AdminView />}
          {view === "dashboard" && <DashboardView />}
          {view === "projects" && <ProjectsView />}
          {view === "project" && <ProjectDetailView />}
          {view === "bank" && <BankView />}
          {view === "budgets" && <BudgetsView />}
          {view === "recurring" && <RecurringView />}
          {view === "payments" && <PaymentsView />}
          {view === "reports" && <ReportsView />}
          {view === "secretInvestment" && <SecretInvestmentView />}
        </div>
      </main>

      {/* Modal */}
      {modal && <ModalForm {...modal} onClose={() => setModal(null)} />}

      {/* Confirm Dialog */}
      <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !loading) setConfirm(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirm?.isDangerous && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {confirm?.title}
            </DialogTitle>
            <DialogDescription>{confirm?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={loading}>Cancel</Button>
            <Button variant={confirm?.isDangerous ? "destructive" : "default"} onClick={async () => { if (!guardWrite()) return; await confirm?.onConfirm(); }} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : confirm?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
