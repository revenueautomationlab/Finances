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

const initialState = {
  projects: [], bankSpending: [], secretInvestmentSpending: [],
  partnerWithdrawals: [], budgets: [], recurringRevenue: [], recurringExpenses: [],
  recurringRevenuePayments: [], recurringExpensePayments: [],
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
  const { user, signOut } = useAuth();
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

  const showConfirm = (title, message, action, onConfirm, isDangerous = false) => {
    setConfirm({ title, message, action, onConfirm, isDangerous });
  };

  const { projects, bankSpending, secretInvestmentSpending, partnerWithdrawals, budgets, recurringRevenue, recurringExpenses, recurringRevenuePayments, recurringExpensePayments } = state;

  // --- Computed Values ---
  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const contractPayments = (p.payments || []).reduce((a, x) => a + x.amount, 0);
      const projectExpenses = (p.expenses || []).reduce((a, x) => a + x.amount, 0);

      // Project-linked recurring items
      const projLinkedRev = recurringRevenue.filter((r) => r.active && r.projectId === p.id);
      const projLinkedExp = recurringExpenses.filter((r) => r.active && r.projectId === p.id);

      // All generated periods × amount (accrual basis)
      const projRecurringRevTotal = projLinkedRev.reduce((a, r) => a + generateRecurringPeriods(r.startDate, r.frequency).length * r.amount, 0);
      const projRecurringExpTotal = projLinkedExp.reduce((a, r) => a + generateRecurringPeriods(r.startDate, r.frequency).length * r.amount, 0);

      // Cash received from paid recurring revenue installments
      const projRecurringRevPaid = recurringRevenuePayments
        .filter((rp) => projLinkedRev.some((r) => r.id === rp.recurringRevenueId))
        .reduce((a, rp) => a + rp.amount, 0);

      const totalPaid = contractPayments + projRecurringRevPaid;
      const totalRevenue = totalPaid; // cash received — what's actually been paid
      // totalPotential: contract + each recurring stream projected to end of current year
      const projRecurringYearPotential = projLinkedRev.reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0);
      const totalPotential = p.totalValue + projRecurringYearPotential;
      const totalExp = projectExpenses + projRecurringExpTotal;
      const profit = totalRevenue - totalExp;
      const contractUnpaid = p.totalValue - contractPayments;
      const recurringPending = projRecurringRevTotal - projRecurringRevPaid;
      const unpaid = contractUnpaid + recurringPending;

      const bankShare = profit > 0 ? profit * 0.55 : 0;
      const suhaibShare = profit > 0 ? profit * 0.10 : 0;
      const mohammedShare = profit > 0 ? profit * 0.10 : 0;
      const secretInvestmentShare = profit > 0 ? profit * 0.25 : 0;
      return { ...p, contractPayments, totalPaid, totalRevenue, totalPotential, unpaid, contractUnpaid, recurringPending, totalExpenses: totalExp, profit, bankShare, suhaibShare, mohammedShare, secretInvestmentShare };
    });
  }, [projects, recurringRevenue, recurringExpenses, recurringRevenuePayments]);

  const generalRecurringRev = recurringRevenue.filter((r) => r.active && !r.projectId).reduce((a, r) => a + r.amount, 0);
  const generalRecurringExp = recurringExpenses.filter((r) => r.active && !r.projectId).reduce((a, r) => a + r.amount, 0);
  const generalRecurringProfit = generalRecurringRev - generalRecurringExp;
  const generalRecurringBankShare = generalRecurringProfit > 0 ? generalRecurringProfit * 0.55 : 0;
  const generalRecurringSuhaibShare = generalRecurringProfit > 0 ? generalRecurringProfit * 0.10 : 0;
  const generalRecurringMohammedShare = generalRecurringProfit > 0 ? generalRecurringProfit * 0.10 : 0;
  const generalRecurringSecretShare = generalRecurringProfit > 0 ? generalRecurringProfit * 0.25 : 0;

  const globalBank = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.bankShare, 0) + generalRecurringBankShare;
    const spent = bankSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, balance: income - spent };
  }, [projectStats, bankSpending, generalRecurringBankShare]);

  const globalSecretInvestment = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.secretInvestmentShare, 0) + generalRecurringSecretShare;
    const spent = secretInvestmentSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, balance: income - spent };
  }, [projectStats, secretInvestmentSpending, generalRecurringSecretShare]);

  const globalProfit = projectStats.reduce((a, p) => a + p.profit, 0) + generalRecurringProfit;
  const globalSuhaib = projectStats.reduce((a, p) => a + p.suhaibShare, 0) + generalRecurringSuhaibShare;
  const globalMohammed = projectStats.reduce((a, p) => a + p.mohammedShare, 0) + generalRecurringMohammedShare;
  const globalRevenue = projectStats.reduce((a, p) => a + p.totalRevenue, 0) + generalRecurringRev;
  const globalExpenses = projectStats.reduce((a, p) => a + p.totalExpenses, 0) + generalRecurringExp;
  // Year-end potential: project contracts + all recurring projected to Dec 31
  const globalPotential = projectStats.reduce((a, p) => a + p.totalPotential, 0)
    + recurringRevenue.filter((r) => r.active && !r.projectId).reduce((a, r) => a + getYearPotentialCount(r.startDate, r.frequency) * r.amount, 0);
  const suhaibWithdrawals = partnerWithdrawals.filter((w) => w.partnerName === "suhaib");
  const mohammedWithdrawals = partnerWithdrawals.filter((w) => w.partnerName === "mohammed");
  const suhaibWithdrawn = suhaibWithdrawals.reduce((a, w) => a + w.amount, 0);
  const mohammedWithdrawn = mohammedWithdrawals.reduce((a, w) => a + w.amount, 0);
  const suhaibAvailable = globalSuhaib - suhaibWithdrawn;
  const mohammedAvailable = globalMohammed - mohammedWithdrawn;

  const budgetStats = budgets.map((b) => {
    const spent = (b.spending || []).reduce((a, s) => a + s.amount, 0);
    return { ...b, spent, remaining: b.allocatedAmount - spent };
  });
  const totalBudgetAllocated = budgetStats.reduce((a, b) => a + b.allocatedAmount, 0);
  const totalBudgetSpent = budgetStats.reduce((a, b) => a + b.spent, 0);
  const totalPhysicalBank = globalRevenue - globalExpenses - suhaibWithdrawn - mohammedWithdrawn - globalSecretInvestment.spent - globalBank.spent - totalBudgetSpent;
  const bankSpendable = globalBank.income - globalBank.spent - totalBudgetSpent;
  const selectedProject = projectStats.find((p) => p.id === selectedProjectId) || null;

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

  const addRecurringRevenue = async (projectId, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      await dbAddRecurringRevenue(projectId, amount, frequency, description, startDate);
      await refreshData();
      toast.success(`Recurring revenue "${description}" added`);
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
      await dbUpdateRecurringRevenue(id, item.projectId, item.amount, item.frequency, item.description, !currentActive);
      await refreshData();
      toast.success(`Recurring revenue ${!currentActive ? "activated" : "paused"}`);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editRecurringRevenue = async (id, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      const item = recurringRevenue.find((r) => r.id === id);
      await dbUpdateRecurringRevenue(id, item.projectId, amount, frequency, description, item.active, startDate || null);
      await refreshData();
      toast.success("Recurring revenue updated");
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addRecurringExpense = async (projectId, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      await dbAddRecurringExpense(projectId, amount, frequency, description, startDate);
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
      await dbUpdateRecurringExpense(id, item.projectId, item.amount, item.frequency, item.description, !currentActive);
      await refreshData();
      toast.success(`Recurring expense ${!currentActive ? "activated" : "paused"}`);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editRecurringExpense = async (id, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      const item = recurringExpenses.find((r) => r.id === id);
      await dbUpdateRecurringExpense(id, item.projectId, amount, frequency, description, item.active, startDate || null);
      await refreshData();
      toast.success("Recurring expense updated");
      setModal(null);
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecurringRevPayment = async (recurringItem, periodDate, existingPayment) => {
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
      setValues((v) => ({ ...v, [name]: val }));
      if (errors[name]) setErrors((e) => ({ ...e, [name]: null }));
    };

    const validate = () => {
      const errs = {};
      fields.forEach((f) => {
        if (f.required && !values[f.name]) {
          errs[f.name] = `${f.label} is required`;
        }
        if (f.type === "number" && values[f.name]) {
          const num = parseFloat(values[f.name]);
          if (isNaN(num) || num <= 0) errs[f.name] = "Must be a positive number";
        }
      });
      return errs;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
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
                    <SelectTrigger className={cn(errors[f.name] && touched[f.name] && "border-red-500 ring-red-500/20 ring-2")}>
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
                ) : (
                  <Input
                    id={f.name}
                    type={f.type || "text"}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    onBlur={() => handleBlur(f.name)}
                    placeholder={f.placeholder}
                    step={f.type === "number" ? "0.001" : undefined}
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
    { key: "reports", label: "Reports", icon: FileBarChart },
    { key: "secretInvestment", label: "Secret Investment", icon: PiggyBank },
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

  // --- Dashboard ---
  function DashboardView() {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of all project finances</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Revenue Received" value={currency(globalRevenue)} sub={`Year potential: ${currency(globalPotential)}`} variant="income" />
          <StatCard icon={TrendingDown} label="Total Expenses" value={currency(globalExpenses)} variant="expense" />
          <StatCard icon={TrendingUp} label="Net Profit" value={currency(globalProfit)} variant={globalProfit >= 0 ? "income" : "expense"} />
          <StatCard icon={Landmark} label="Total in Bank" value={currency(totalPhysicalBank)} variant="bank" />
        </div>

        {globalProfit > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Profit Distribution</CardTitle>
              <CardDescription>Split per project: Bank 55%, Suhaib 10%, Mohammed 10%, Secret Investment 25%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Bank Savings", value: globalBank.income, color: "bg-indigo-500", bg: "bg-indigo-50" },
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

        {globalProfit > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Partner Balances</CardTitle>
              <CardDescription>Track withdrawals from partner shares</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: "Suhaib", partner: "suhaib", available: suhaibAvailable, earned: globalSuhaib, withdrawn: suhaibWithdrawn, variant: "partner1", icon: Users },
                  { name: "Mohammed", partner: "mohammed", available: mohammedAvailable, earned: globalMohammed, withdrawn: mohammedWithdrawn, variant: "partner2", icon: Users },
                ].map((p) => (
                  <Card key={p.name} className={cn(p.variant === "partner1" ? "border-amber-200/60" : "border-violet-200/60")}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", p.variant === "partner1" ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600")}>
                            <p.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Earned: {currency(p.earned)}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => setModal({
                          title: `Withdraw — ${p.name}`,
                          fields: [
                            { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true },
                            { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                            { name: "note", label: "Note", placeholder: "Withdrawal note (optional)" },
                          ],
                          onSubmit: (v) => addPartnerWithdrawal(p.partner, parseFloat(v.amount), v.date, v.note),
                        })}>
                          <Wallet className="mr-1.5 h-3.5 w-3.5" /> Withdraw
                        </Button>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold tabular-nums">{currency(p.available)}</span>
                        <span className="text-xs text-muted-foreground">Withdrawn: {currency(p.withdrawn)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {partnerWithdrawals.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3">Recent Withdrawals</p>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Partner</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...partnerWithdrawals].reverse().map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">{w.partnerName === "suhaib" ? "Suhaib" : "Mohammed"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(w.date)}</TableCell>
                            <TableCell><Badge variant="destructive" className="tabular-nums font-semibold">{currency(w.amount)}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{w.note || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deletePartnerWithdrawal(w.id, w.amount)}>
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
        )}

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
                <Button onClick={() => { setView("projects"); setModal({ title: "New Project", fields: [{ name: "name", label: "Project Name", placeholder: "e.g. Website Redesign", required: true }, { name: "totalValue", label: "Total Project Value (BHD)", type: "number", placeholder: "0.000", required: true }], onSubmit: (v) => addProject(v.name, parseFloat(v.totalValue)) }); }}>
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
                        <TableCell className="font-semibold">{p.name}</TableCell>
                        <TableCell className="tabular-nums">{currency(p.totalValue)}</TableCell>
                        <TableCell className="tabular-nums text-emerald-600">{currency(p.totalPaid)}</TableCell>
                        <TableCell className="tabular-nums">{currency(p.totalExpenses)}</TableCell>
                        <TableCell className={cn("font-semibold tabular-nums", p.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(p.profit)}</TableCell>
                        <TableCell>
                          <Badge variant={p.unpaid <= 0 ? "default" : p.totalPaid > 0 ? "secondary" : "outline"} className={cn(p.unpaid <= 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", p.totalPaid > 0 && p.unpaid > 0 && "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                            {p.unpaid <= 0 ? "Paid" : p.totalPaid > 0 ? "Partial" : "Unpaid"}
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
    const totPaid = projectStats.reduce((a, p) => a + p.totalPaid, 0);
    const totUnpaid = projectStats.reduce((a, p) => a + p.unpaid, 0);
    const totExp = projectStats.reduce((a, p) => a + p.totalExpenses, 0);
    const totProfit = projectStats.reduce((a, p) => a + p.profit, 0);
    const totRevenue = projectStats.reduce((a, p) => a + p.totalRevenue, 0);
    const totPotential = projectStats.reduce((a, p) => a + p.totalPotential, 0);
    const margin = totRevenue > 0 ? (totProfit / totRevenue) * 100 : 0;
    const marginColor = margin >= 50 ? "text-emerald-600" : margin >= 25 ? "text-amber-600" : "text-red-500";
    const marginBg = margin >= 50 ? "bg-emerald-50" : margin >= 25 ? "bg-amber-50" : "bg-red-50";
    const summaryStats = [
      { label: "Total Paid", value: currency(totPaid), icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Total Unpaid", value: currency(totUnpaid), icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-50" },
      { label: "Total Expenses", value: currency(totExp), icon: TrendingDown, color: "text-orange-500", bg: "bg-orange-50" },
      { label: "Total Profit", value: currency(totProfit), icon: TrendingUp, color: totProfit >= 0 ? "text-emerald-600" : "text-red-500", bg: totProfit >= 0 ? "bg-emerald-50" : "bg-red-50" },
      { label: "Margin", value: `${margin.toFixed(1)}%`, icon: Percent, color: marginColor, bg: marginBg },
      { label: "Total Potential", value: currency(totPotential), icon: CircleDollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
    ];

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
          </div>
          <Button onClick={() => setModal({ title: "New Project", fields: [{ name: "name", label: "Project Name", placeholder: "e.g. Website Redesign", required: true }, { name: "totalValue", label: "Total Project Value (BHD)", type: "number", placeholder: "0.000", required: true }], onSubmit: (v) => addProject(v.name, parseFloat(v.totalValue)) })}>
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
              const paidPct = p.totalPotential > 0 ? Math.min(100, (p.totalPaid / p.totalPotential) * 100) : 0;
              return (
                <Card key={p.id} className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1" onClick={() => openProject(p.id)}>
                  <CardContent className="p-0">
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-base">{p.name}</h3>
                        <Badge variant={p.unpaid <= 0 ? "default" : p.totalPaid > 0 ? "secondary" : "outline"} className={cn("shrink-0", p.unpaid <= 0 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", p.totalPaid > 0 && p.unpaid > 0 && "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                          {p.unpaid <= 0 ? "Paid" : p.totalPaid > 0 ? "Partial" : "Unpaid"}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold tabular-nums tracking-tight">{currency(p.totalValue)}</p>
                    </div>
                    <div className="px-5 pb-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Payment Progress</span>
                        <span className="font-semibold">{Math.round(paidPct)}%</span>
                      </div>
                      <Progress value={paidPct} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 border-t">
                      {[
                        { label: "Paid", value: currency(p.totalPaid), color: "text-emerald-600" },
                        { label: "Unpaid", value: currency(p.unpaid), color: "text-red-500" },
                        { label: "Expenses", value: currency(p.totalExpenses), color: "" },
                        { label: "Profit", value: currency(p.profit), color: p.profit >= 0 ? "text-emerald-600" : "text-red-500" },
                      ].map((s) => (
                        <div key={s.label} className="border-b border-r last:border-r-0 [&:nth-child(2)]:border-r-0 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                          <p className={cn("text-sm font-semibold tabular-nums", s.color)}>{s.value}</p>
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
    const paidPct = p.totalPotential > 0 ? Math.min(100, (p.totalPaid / p.totalPotential) * 100) : 0;
    const projLinkedRev = recurringRevenue.filter((r) => r.active && r.projectId === p.id);
    const projLinkedExp = recurringExpenses.filter((r) => r.active && r.projectId === p.id);
    return (
      <div className="animate-fade-in-up space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setView("projects")} className="mb-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Projects
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted-foreground">Contract: {currency(p.totalValue)}{projLinkedRev.length > 0 ? ` · ${projLinkedRev.length} recurring stream${projLinkedRev.length !== 1 ? "s" : ""}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal({ title: "Edit Project", fields: [{ name: "name", label: "Project Name", default: p.name, required: true }, { name: "totalValue", label: "Total Value (BHD)", type: "number", default: String(p.totalValue), required: true }], onSubmit: (v) => editProject(p.id, v.name, parseFloat(v.totalValue)) })}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteProject(p.id, p.name)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CircleDollarSign} label="Total Potential" value={currency(p.totalPotential)} variant="highlight" sub={`Contract ${currency(p.totalValue)}`} />
          <StatCard icon={ArrowUpRight} label="Paid" value={currency(p.totalPaid)} variant="income" sub={`${Math.round(paidPct)}% of potential`} />
          <StatCard icon={ArrowDownRight} label="Unpaid" value={currency(p.unpaid)} variant="expense" sub={p.recurringPending > 0 ? `${currency(p.recurringPending)} recurring pending` : undefined} />
          <StatCard icon={TrendingUp} label="Net Profit" value={currency(p.profit)} variant={p.profit >= 0 ? "income" : "expense"} />
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
              <Button size="sm" onClick={() => setModal({ title: "Add Recurring Revenue", fields: [{ name: "description", label: "Description", placeholder: "e.g. Monthly retainer", required: true }, { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true }, { name: "startDate", label: "Start Date (optional)", type: "date" }], onSubmit: (v) => addRecurringRevenue(p.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null) })}>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ title: "Edit Recurring Revenue", fields: [{ name: "description", label: "Description", default: r.description, required: true }, { name: "amount", label: "Amount (BHD)", type: "number", default: String(r.amount), required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: r.frequency, required: true }, { name: "startDate", label: "Start Date (optional)", type: "date", default: r.startDate || "" }], onSubmit: (v) => editRecurringRevenue(r.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null) })}>
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
              <Button size="sm" variant="outline" onClick={() => setModal({ title: "Add Recurring Expense", fields: [{ name: "description", label: "Description", placeholder: "e.g. Monthly hosting", required: true }, { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true }, { name: "startDate", label: "Start Date (optional)", type: "date" }], onSubmit: (v) => addRecurringExpense(p.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null) })}>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ title: "Edit Recurring Expense", fields: [{ name: "description", label: "Description", default: r.description, required: true }, { name: "amount", label: "Amount (BHD)", type: "number", default: String(r.amount), required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: r.frequency, required: true }, { name: "startDate", label: "Start Date (optional)", type: "date", default: r.startDate || "" }], onSubmit: (v) => editRecurringExpense(r.id, parseFloat(v.amount), v.frequency, v.description, v.startDate || null) })}>
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
        <div><h1 className="text-2xl font-bold tracking-tight">Bank Savings</h1><p className="text-sm text-muted-foreground">55% of all project profits go to bank savings</p></div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Landmark} label="Total in Bank" value={currency(totalPhysicalBank)} variant="highlight" />
          <StatCard icon={ArrowUpRight} label="Bank Share (55%)" value={currency(globalBank.income)} variant="income" sub="From project profits" />
          <StatCard icon={ArrowDownRight} label="Bank Spent" value={currency(globalBank.spent)} variant="expense" sub={`${bankSpending.length} transaction${bankSpending.length !== 1 ? "s" : ""}`} />
          <StatCard icon={Wallet} label="Bank Available" value={currency(bankSpendable)} variant="bank" sub="Share minus spending" />
        </div>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Money Allocation</CardTitle><CardDescription>How the total bank balance is distributed</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Bank Savings (spendable)", value: bankSpendable, color: "bg-indigo-500" },
              { label: "Suhaib (in bank)", value: suhaibAvailable, color: "bg-amber-500" },
              { label: "Mohammed (in bank)", value: mohammedAvailable, color: "bg-violet-500" },
              { label: "Secret Investment (in bank)", value: globalSecretInvestment.balance, color: "bg-pink-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={cn("h-3 w-3 rounded-full", item.color)} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{currency(item.value)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-primary">Total in Bank</span>
              <span className="text-sm font-bold text-primary tabular-nums">{currency(totalPhysicalBank)}</span>
            </div>
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
    return (
      <div className="animate-fade-in-up space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Recurring</h1><p className="text-sm text-muted-foreground">{recurringRevenue.length} revenue &middot; {recurringExpenses.length} expense items</p></div>

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
                  <Button size="sm" onClick={() => setModal({ title: "Add Recurring Revenue", fields: [{ name: "description", label: "Description", placeholder: "e.g. Monthly retainer", required: true }, { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true }, { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" }, { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }], onSubmit: (v) => addRecurringRevenue(v.projectId || null, parseFloat(v.amount), v.frequency, v.description, v.startDate) })}>
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
                        <TableRow className="bg-muted/50"><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringRevenue.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-emerald-600 tabular-nums font-semibold">{currency(item.amount)}</TableCell>
                            <TableCell><Badge variant="outline">{item.frequency}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{projects.find((p) => p.id === item.projectId)?.name || "General"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className={cn("h-7 text-xs", item.active ? "text-emerald-600" : "text-muted-foreground")} onClick={() => toggleRecurringRevenue(item.id, item.active)}>
                                <Badge variant={item.active ? "default" : "secondary"} className={cn(item.active && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
                                  {item.active ? "Active" : "Paused"}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringRevenue(item.id, item.description)}>
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
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recurring Expenses</CardTitle>
                  <Button size="sm" onClick={() => setModal({ title: "Add Recurring Expense", fields: [{ name: "description", label: "Description", placeholder: "e.g. Office rent", required: true }, { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.000", required: true }, { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true }, { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" }, { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true }], onSubmit: (v) => addRecurringExpense(v.projectId || null, parseFloat(v.amount), v.frequency, v.description, v.startDate) })}>
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
                        <TableRow className="bg-muted/50"><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringExpenses.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-red-600 tabular-nums font-semibold">{currency(item.amount)}</TableCell>
                            <TableCell><Badge variant="outline">{item.frequency}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{projects.find((p) => p.id === item.projectId)?.name || "General"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => toggleRecurringExpense(item.id, item.active)}>
                                <Badge variant={item.active ? "default" : "secondary"} className={cn(item.active && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
                                  {item.active ? "Active" : "Paused"}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteRecurringExpense(item.id, item.description)}>
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
          </TabsContent>
        </Tabs>
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
    const monthlyRevenue = monthlyPayments.reduce((a, p) => a + p.amount, 0);
    const monthlyProjectExpenses = projectStats.flatMap((p) => (p.expenses || []).filter((exp) => filterByMonth(exp.date)));
    const monthlyExpenses = monthlyProjectExpenses.reduce((a, e) => a + e.amount, 0);
    const monthlyBankSpent = bankSpending.filter((s) => filterByMonth(s.date)).reduce((a, s) => a + s.amount, 0);
    const monthlySecretSpent = secretInvestmentSpending.filter((s) => filterByMonth(s.date)).reduce((a, s) => a + s.amount, 0);
    const monthlySuhaibWithdrawn = partnerWithdrawals.filter((w) => w.partnerName === "suhaib" && filterByMonth(w.date)).reduce((a, w) => a + w.amount, 0);
    const monthlyMohammedWithdrawn = partnerWithdrawals.filter((w) => w.partnerName === "mohammed" && filterByMonth(w.date)).reduce((a, w) => a + w.amount, 0);
    const monthlyBudgetSpent = budgetStats.flatMap((b) => (b.spending || []).filter((s) => filterByMonth(s.date))).reduce((a, s) => a + s.amount, 0);
    const monthlyProfit = monthlyRevenue - monthlyExpenses;
    const monthlyTotalOutflow = monthlyExpenses + monthlyBankSpent + monthlySecretSpent + monthlySuhaibWithdrawn + monthlyMohammedWithdrawn + monthlyBudgetSpent;

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
              <StatCard label="Revenue" value={currency(monthlyRevenue)} variant="income" sub={`${monthlyPayments.length} payment${monthlyPayments.length !== 1 ? "s" : ""}`} />
              <StatCard label="Expenses" value={currency(monthlyExpenses)} variant="expense" sub={`${monthlyProjectExpenses.length} expense${monthlyProjectExpenses.length !== 1 ? "s" : ""}`} />
              <StatCard label="Net Profit" value={currency(monthlyProfit)} variant={monthlyProfit >= 0 ? "income" : "expense"} />
              <StatCard label="Total Outflow" value={currency(monthlyTotalOutflow)} variant="bank" sub="All spending combined" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4"><CardTitle className="text-base">Partner Summary</CardTitle><CardDescription>All-time earnings and withdrawals</CardDescription></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={Users} label="Suhaib" value={currency(suhaibAvailable)} variant="partner1" sub={`Earned: ${currency(globalSuhaib)} · Withdrawn: ${currency(suhaibWithdrawn)}`} />
              <StatCard icon={Users} label="Mohammed" value={currency(mohammedAvailable)} variant="partner2" sub={`Earned: ${currency(globalMohammed)} · Withdrawn: ${currency(mohammedWithdrawn)}`} />
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
                  {[
                    { cat: "Project Revenue", inflow: globalRevenue, outflow: 0 },
                    { cat: "Project Expenses", inflow: 0, outflow: globalExpenses },
                    { cat: "Bank Spending", inflow: 0, outflow: globalBank.spent },
                    { cat: "Secret Investment Spending", inflow: 0, outflow: globalSecretInvestment.spent },
                    { cat: "Partner Withdrawals", inflow: 0, outflow: suhaibWithdrawn + mohammedWithdrawn },
                    { cat: "Budget Spending", inflow: 0, outflow: totalBudgetSpent },
                  ].map((r) => (
                    <TableRow key={r.cat}>
                      <TableCell className="font-medium">{r.cat}</TableCell>
                      <TableCell className={cn("tabular-nums", r.inflow > 0 && "text-emerald-600 font-semibold")}>{r.inflow > 0 ? currency(r.inflow) : "-"}</TableCell>
                      <TableCell className={cn("tabular-nums", r.outflow > 0 && "text-red-600 font-semibold")}>{r.outflow > 0 ? currency(r.outflow) : "-"}</TableCell>
                      <TableCell className={cn("tabular-nums font-semibold", (r.inflow - r.outflow) >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(r.inflow - r.outflow)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Net Cash Position</TableCell>
                    <TableCell className="text-emerald-600 tabular-nums">{currency(globalRevenue)}</TableCell>
                    <TableCell className="text-red-600 tabular-nums">{currency(globalExpenses + globalBank.spent + globalSecretInvestment.spent + suhaibWithdrawn + mohammedWithdrawn + totalBudgetSpent)}</TableCell>
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
                      const margin = p.totalPaid > 0 ? ((p.profit / p.totalPaid) * 100).toFixed(1) : "0.0";
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProject(p.id)}>
                          <TableCell className="font-semibold">{p.name}</TableCell>
                          <TableCell className="tabular-nums">{currency(p.totalValue)}</TableCell>
                          <TableCell className="tabular-nums text-emerald-600">{currency(p.totalPaid)}</TableCell>
                          <TableCell className="tabular-nums text-red-600">{currency(p.totalExpenses)}</TableCell>
                          <TableCell className={cn("tabular-nums font-semibold", p.profit >= 0 ? "text-emerald-600" : "text-red-600")}>{currency(p.profit)}</TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(margin) >= 50 ? "default" : "secondary"} className={cn(parseFloat(margin) >= 50 && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", parseFloat(margin) < 0 && "bg-red-100 text-red-700 hover:bg-red-100")}>
                              {margin}%
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
          {view === "dashboard" && <DashboardView />}
          {view === "projects" && <ProjectsView />}
          {view === "project" && <ProjectDetailView />}
          {view === "bank" && <BankView />}
          {view === "budgets" && <BudgetsView />}
          {view === "recurring" && <RecurringView />}
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
            <Button variant={confirm?.isDangerous ? "destructive" : "default"} onClick={async () => { await confirm?.onConfirm(); }} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : confirm?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
