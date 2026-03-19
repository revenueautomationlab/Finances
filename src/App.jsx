import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
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
} from "./services/supabaseService";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const currency = (n) => {
  const num = Number(n) || 0;
  return (
    "BHD " +
    num.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })
  );
};

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const initialState = { projects: [], bankSpending: [], secretInvestmentSpending: [], partnerWithdrawals: [], budgets: [], recurringRevenue: [], recurringExpenses: [] };

// --- SVG Icons ---
const Icons = {
  dashboard: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  projects: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  bank: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  charity: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  plus: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  trash: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  edit: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  back: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  eye: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  close: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  revenue: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  expense: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  profit: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  partner: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  empty: (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

export default function App() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchStateFromDB();
        setState(data);
        setLoaded(true);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoaded(true); // Still load even if error
      }
    };
    loadData();
  }, []);

  const showToast = (msg, type = "success", duration = 3000) => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), duration);
  };

  const showConfirm = (
    title,
    message,
    action,
    onConfirm,
    isDangerous = false,
  ) => {
    setConfirm({
      title,
      message,
      action,
      onConfirm,
      isDangerous,
    });
  };

  const refreshData = async () => {
    try {
      const data = await fetchStateFromDB();
      setState(data);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  };

  const { projects, bankSpending, secretInvestmentSpending, partnerWithdrawals, budgets, recurringRevenue, recurringExpenses } = state;
  const updateProjects = (fn) =>
    setState((s) => ({ ...s, projects: fn(s.projects) }));

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const totalPaid = (p.payments || []).reduce((a, x) => a + x.amount, 0);
      const unpaid = p.totalValue - totalPaid;
      const totalExpenses = (p.expenses || []).reduce(
        (a, x) => a + x.amount,
        0,
      );
      const profit = totalPaid - totalExpenses;
      const share = profit > 0 ? profit * 0.25 : 0;
      return {
        ...p,
        totalPaid,
        unpaid,
        totalExpenses,
        profit,
        bankShare: share,
        suhaibShare: share,
        mohammedShare: share,
        secretInvestmentShare: share,
      };
    });
  }, [projects]);

  const globalBank = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.bankShare, 0);
    const spent = bankSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, balance: income - spent };
  }, [projectStats, bankSpending]);

  const globalSecretInvestment = useMemo(() => {
    const income = projectStats.reduce((a, p) => a + p.secretInvestmentShare, 0);
    const spent = secretInvestmentSpending.reduce((a, x) => a + x.amount, 0);
    return { income, spent, balance: income - spent };
  }, [projectStats, secretInvestmentSpending]);

  const globalProfit = projectStats.reduce((a, p) => a + p.profit, 0);
  const globalSuhaib = projectStats.reduce((a, p) => a + p.suhaibShare, 0);
  const globalMohammed = projectStats.reduce((a, p) => a + p.mohammedShare, 0);
  const globalRevenue = projectStats.reduce((a, p) => a + p.totalPaid, 0);
  const globalExpenses = projectStats.reduce((a, p) => a + p.totalExpenses, 0);
  const suhaibWithdrawals = partnerWithdrawals.filter(w => w.partnerName === 'suhaib');
  const mohammedWithdrawals = partnerWithdrawals.filter(w => w.partnerName === 'mohammed');
  const suhaibWithdrawn = suhaibWithdrawals.reduce((a, w) => a + w.amount, 0);
  const mohammedWithdrawn = mohammedWithdrawals.reduce((a, w) => a + w.amount, 0);
  const suhaibAvailable = globalSuhaib - suhaibWithdrawn;
  const mohammedAvailable = globalMohammed - mohammedWithdrawn;

  const budgetStats = budgets.map(b => {
    const spent = (b.spending || []).reduce((a, s) => a + s.amount, 0);
    return { ...b, spent, remaining: b.allocatedAmount - spent };
  });
  const totalBudgetAllocated = budgetStats.reduce((a, b) => a + b.allocatedAmount, 0);
  const totalBudgetSpent = budgetStats.reduce((a, b) => a + b.spent, 0);

  // Total money physically in the bank
  const totalPhysicalBank = globalRevenue - globalExpenses - suhaibWithdrawn - mohammedWithdrawn - globalSecretInvestment.spent - globalBank.spent - totalBudgetSpent;

  const selectedProject =
    projectStats.find((p) => p.id === selectedProjectId) || null;

  // --- CRUD Operations ---
  const addProject = async (name, totalValue) => {
    setLoading(true);
    try {
      await dbAddProject(name, totalValue);
      await refreshData();
      showToast(`✓ Project "${name}" created successfully`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add project:", error);
      showToast(`✗ Failed to create project: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const editProject = async (id, name, totalValue) => {
    setLoading(true);
    try {
      await dbUpdateProject(id, name, totalValue);
      await refreshData();
      showToast(`✓ Project "${name}" updated successfully`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to update project:", error);
      showToast(`✗ Failed to update project: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = (id, name) => {
    showConfirm(
      "Delete Project",
      `Are you sure you want to delete "${name}"? This action cannot be undone and will remove all payments and expenses.`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteProject(id);
          if (selectedProjectId === id) {
            setSelectedProjectId(null);
            setView("dashboard");
          }
          await refreshData();
          showToast(`✓ Project "${name}" deleted successfully`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete project:", error);
          showToast(
            `✗ Failed to delete project: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addPayment = async (projectId, amount, date, note) => {
    setLoading(true);
    try {
      await dbAddPayment(projectId, amount, date, note);
      await refreshData();
      showToast(`✓ Payment of ${currency(amount)} recorded`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add payment:", error);
      showToast(`✗ Failed to record payment: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = (projectId, paymentId, amount) => {
    showConfirm(
      "Delete Payment",
      `Are you sure you want to delete this payment of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeletePayment(projectId, paymentId);
          await refreshData();
          showToast(`✓ Payment of ${currency(amount)} deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete payment:", error);
          showToast(
            `✗ Failed to delete payment: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addExpense = async (projectId, amount, date, description) => {
    setLoading(true);
    try {
      await dbAddExpense(projectId, amount, date, description);
      await refreshData();
      showToast(`✓ Expense of ${currency(amount)} recorded`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add expense:", error);
      showToast(`✗ Failed to record expense: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = (projectId, expenseId, amount) => {
    showConfirm(
      "Delete Expense",
      `Are you sure you want to delete this expense of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteExpense(projectId, expenseId);
          await refreshData();
          showToast(`✓ Expense of ${currency(amount)} deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete expense:", error);
          showToast(
            `✗ Failed to delete expense: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addBankSpending = async (amount, date, description) => {
    setLoading(true);
    try {
      await dbAddBankSpending(amount, date, description);
      await refreshData();
      showToast(`✓ Bank spending of ${currency(amount)} recorded`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add bank spending:", error);
      showToast(`✗ Failed to record spending: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteBankSpending = (id, amount) => {
    showConfirm(
      "Delete Bank Spending",
      `Are you sure you want to delete this bank spending of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteBankSpending(id);
          await refreshData();
          showToast(
            `✓ Bank spending of ${currency(amount)} deleted`,
            "success",
          );
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete bank spending:", error);
          showToast(
            `✗ Failed to delete spending: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addSecretInvestmentSpending = async (amount, date, description) => {
    setLoading(true);
    try {
      await dbAddSecretInvestmentSpending(amount, date, description);
      await refreshData();
      showToast(
        `✓ Secret Investment spending of ${currency(amount)} recorded`,
        "success",
      );
      setModal(null);
    } catch (error) {
      console.error("Failed to add secret investment spending:", error);
      showToast(`✗ Failed to record spending: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteSecretInvestmentSpending = (id, amount) => {
    showConfirm(
      "Delete Secret Investment Spending",
      `Are you sure you want to delete this secret investment spending of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteSecretInvestmentSpending(id);
          await refreshData();
          showToast(
            `✓ Secret Investment spending of ${currency(amount)} deleted`,
            "success",
          );
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete secret investment spending:", error);
          showToast(
            `✗ Failed to delete spending: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addPartnerWithdrawal = async (partnerName, amount, date, note) => {
    setLoading(true);
    try {
      await dbAddPartnerWithdrawal(partnerName, amount, date, note);
      await refreshData();
      showToast(`✓ Withdrawal of ${currency(amount)} recorded for ${partnerName === 'suhaib' ? 'Suhaib' : 'Mohammed'}`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add partner withdrawal:", error);
      showToast(`✗ Failed to record withdrawal: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deletePartnerWithdrawal = (id, amount) => {
    showConfirm(
      "Delete Withdrawal",
      `Are you sure you want to delete this withdrawal of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeletePartnerWithdrawal(id);
          await refreshData();
          showToast(`✓ Withdrawal of ${currency(amount)} deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete partner withdrawal:", error);
          showToast(
            `✗ Failed to delete withdrawal: ${error.message}`,
            "error",
            4000,
          );
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addBudget = async (name, allocatedAmount, description) => {
    setLoading(true);
    try {
      await dbAddBudget(name, allocatedAmount, description);
      await refreshData();
      showToast(`✓ Budget "${name}" created successfully`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add budget:", error);
      showToast(`✗ Failed to create budget: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const editBudget = async (id, name, allocatedAmount, description) => {
    setLoading(true);
    try {
      await dbUpdateBudget(id, name, allocatedAmount, description);
      await refreshData();
      showToast(`✓ Budget "${name}" updated successfully`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to update budget:", error);
      showToast(`✗ Failed to update budget: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = (id, name) => {
    showConfirm(
      "Delete Budget",
      `Are you sure you want to delete "${name}"? This action cannot be undone and will remove all spending records.`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteBudget(id);
          await refreshData();
          showToast(`✓ Budget "${name}" deleted successfully`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete budget:", error);
          showToast(`✗ Failed to delete budget: ${error.message}`, "error", 4000);
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const addBudgetSpending = async (budgetId, amount, date, description) => {
    setLoading(true);
    try {
      await dbAddBudgetSpending(budgetId, amount, date, description);
      await refreshData();
      showToast(`✓ Spending of ${currency(amount)} recorded`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add budget spending:", error);
      showToast(`✗ Failed to record spending: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteBudgetSpending = (id, amount) => {
    showConfirm(
      "Delete Budget Spending",
      `Are you sure you want to delete this spending of ${currency(amount)}?`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteBudgetSpending(id);
          await refreshData();
          showToast(`✓ Spending of ${currency(amount)} deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete budget spending:", error);
          showToast(`✗ Failed to delete spending: ${error.message}`, "error", 4000);
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  // --- Recurring Revenue ---
  const addRecurringRevenue = async (projectId, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      await dbAddRecurringRevenue(projectId, amount, frequency, description, startDate);
      await refreshData();
      showToast(`✓ Recurring revenue "${description}" added`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add recurring revenue:", error);
      showToast(`✗ Failed to add recurring revenue: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurringRevenue = (id, description) => {
    showConfirm(
      "Delete Recurring Revenue",
      `Are you sure you want to delete "${description}"? This action cannot be undone.`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteRecurringRevenue(id);
          await refreshData();
          showToast(`✓ Recurring revenue "${description}" deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete recurring revenue:", error);
          showToast(`✗ Failed to delete recurring revenue: ${error.message}`, "error", 4000);
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const toggleRecurringRevenue = async (id, currentActive) => {
    setLoading(true);
    try {
      const item = recurringRevenue.find((r) => r.id === id);
      await dbUpdateRecurringRevenue(id, item.projectId, item.amount, item.frequency, item.description, !currentActive);
      await refreshData();
      showToast(`✓ Recurring revenue ${!currentActive ? "activated" : "paused"}`, "success");
    } catch (error) {
      console.error("Failed to toggle recurring revenue:", error);
      showToast(`✗ Failed to update status: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  // --- Recurring Expenses ---
  const addRecurringExpense = async (projectId, amount, frequency, description, startDate) => {
    setLoading(true);
    try {
      await dbAddRecurringExpense(projectId, amount, frequency, description, startDate);
      await refreshData();
      showToast(`✓ Recurring expense "${description}" added`, "success");
      setModal(null);
    } catch (error) {
      console.error("Failed to add recurring expense:", error);
      showToast(`✗ Failed to add recurring expense: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurringExpense = (id, description) => {
    showConfirm(
      "Delete Recurring Expense",
      `Are you sure you want to delete "${description}"? This action cannot be undone.`,
      "Delete",
      async () => {
        setLoading(true);
        try {
          await dbDeleteRecurringExpense(id);
          await refreshData();
          showToast(`✓ Recurring expense "${description}" deleted`, "success");
          setConfirm(null);
        } catch (error) {
          console.error("Failed to delete recurring expense:", error);
          showToast(`✗ Failed to delete recurring expense: ${error.message}`, "error", 4000);
        } finally {
          setLoading(false);
        }
      },
      true,
    );
  };

  const toggleRecurringExpense = async (id, currentActive) => {
    setLoading(true);
    try {
      const item = recurringExpenses.find((r) => r.id === id);
      await dbUpdateRecurringExpense(id, item.projectId, item.amount, item.frequency, item.description, !currentActive);
      await refreshData();
      showToast(`✓ Recurring expense ${!currentActive ? "activated" : "paused"}`, "success");
    } catch (error) {
      console.error("Failed to toggle recurring expense:", error);
      showToast(`✗ Failed to update status: ${error.message}`, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const openProject = (id) => {
    setSelectedProjectId(id);
    setView("project");
  };

  // --- Modal Form ---
  function ModalForm({ title, fields, onSubmit, onClose }) {
    const [values, setValues] = useState(() => {
      const v = {};
      fields.forEach((f) => {
        v[f.name] = f.default || "";
      });
      return v;
    });
    const set = (name, val) => setValues((v) => ({ ...v, [name]: val }));
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(values);
      onClose();
    };
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="btn-icon" onClick={onClose}>
              {Icons.close}
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            {fields.map((f) => (
              <div key={f.name} className="form-group">
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    required={f.required}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontFamily: 'inherit',
                      background: 'var(--bg)', color: 'var(--text)', outline: 'none'
                    }}
                  >
                    {f.placeholder && <option value="">{f.placeholder}</option>}
                    {(f.options || []).map(opt => {
                      if (typeof opt === 'object') {
                        return <option key={opt.id} value={opt.id}>{opt.name}</option>;
                      }
                      return <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    type={f.type || "text"}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    step={f.type === "number" ? "0.01" : undefined}
                  />
                )}
              </div>
            ))}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : title.startsWith("Edit")
                    ? "Update"
                    : title.startsWith("Spend")
                      ? "Record"
                      : title.startsWith("Withdraw")
                        ? "Withdraw"
                        : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Sidebar ---
  function Sidebar() {
    const navItems = [
      { key: "dashboard", label: "Dashboard", icon: Icons.dashboard },
      {
        key: "projects",
        label: "Projects",
        icon: Icons.projects,
        count: projects.length,
      },
      { key: "bank", label: "Bank Savings", icon: Icons.bank },
      { key: "budgets", label: "Budgets", icon: Icons.expense, count: budgets.length },
      { key: "recurring", label: "Recurring", icon: Icons.revenue },
      { key: "reports", label: "Reports", icon: Icons.profit },
      { key: "secretInvestment", label: "Secret Investment", icon: Icons.charity },
    ];
    const handleNavClick = (key) => {
      setView(key);
      setSidebarOpen(false);
    };
    return (
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">R</div>
          <div>
            <h2>RAL Finance</h2>
            <span className="brand-sub">Project Tracker</span>
          </div>
        </div>
        <nav>
          <div className="nav-label">Menu</div>
          {navItems.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key || (n.key === "projects" && view === "project") ? "active" : ""}`}
              onClick={() => handleNavClick(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-text">{n.label}</span>
              {n.count > 0 && <span className="nav-badge">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-stat">
            <div className="sidebar-stat-icon bank-icon">{Icons.bank}</div>
            <div className="sidebar-stat-info">
              <span>Total in Bank</span>
              <strong
                className={
                  totalPhysicalBank >= 0 ? "text-income" : "text-expense"
                }
              >
                {currency(totalPhysicalBank)}
              </strong>
            </div>
          </div>
          <div className="sidebar-stat">
            <div className="sidebar-stat-icon charity-icon">
              {Icons.charity}
            </div>
            <div className="sidebar-stat-info">
              <span>Secret Investment</span>
              <strong
                className={
                  globalSecretInvestment.balance >= 0 ? "text-income" : "text-expense"
                }
              >
                {currency(globalSecretInvestment.balance)}
              </strong>
            </div>
          </div>
          <div
            style={{
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#718096",
                marginBottom: "10px",
              }}
            >
              Signed in as:
              <br />
              <strong style={{ fontSize: "11px" }}>
                {user?.email || "user@example.com"}
              </strong>
            </div>
            <button
              onClick={signOut}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#f7fafc",
                color: "#2d3748",
                border: "1px solid #cbd5e0",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#edf2f7";
                e.target.style.color = "#1a202c";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#f7fafc";
                e.target.style.color = "#2d3748";
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // --- Dashboard ---
  function DashboardView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Overview of all project finances</p>
          </div>
        </div>

        <div className="stats-grid cols-4">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue">{Icons.revenue}</div>
            <div className="stat-content">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{currency(globalRevenue)}</div>
              <div className="stat-sub">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-expense">{Icons.expense}</div>
            <div className="stat-content">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value text-expense">
                {currency(globalExpenses)}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-income">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Net Profit</div>
              <div className="stat-value text-income">
                {currency(globalProfit)}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue">{Icons.bank}</div>
            <div className="stat-content">
              <div className="stat-label">Total in Bank</div>
              <div className="stat-value text-bank">
                {currency(totalPhysicalBank)}
              </div>
            </div>
          </div>
        </div>

        {/* Profit Distribution */}
        {globalProfit > 0 && (
          <div className="card">
            <h2 className="section-title">Profit Distribution</h2>
            <p className="section-sub">
              Automatically split 25% each across all projects
            </p>
            <div className="distribution-grid">
              <div className="dist-item">
                <div
                  className="dist-bar bg-bank"
                  style={{ width: "100%" }}
                ></div>
                <div className="dist-info">
                  <span className="dist-label">Bank Savings</span>
                  <span className="dist-value">
                    {currency(globalBank.income)}
                  </span>
                </div>
              </div>
              <div className="dist-item">
                <div
                  className="dist-bar bg-partner1"
                  style={{ width: "100%" }}
                ></div>
                <div className="dist-info">
                  <span className="dist-label">Suhaib</span>
                  <span className="dist-value">{currency(globalSuhaib)}</span>
                </div>
              </div>
              <div className="dist-item">
                <div
                  className="dist-bar bg-partner2"
                  style={{ width: "100%" }}
                ></div>
                <div className="dist-info">
                  <span className="dist-label">Mohammed</span>
                  <span className="dist-value">{currency(globalMohammed)}</span>
                </div>
              </div>
              <div className="dist-item">
                <div
                  className="dist-bar bg-charity"
                  style={{ width: "100%" }}
                ></div>
                <div className="dist-info">
                  <span className="dist-label">Secret Investment</span>
                  <span className="dist-value">
                    {currency(globalSecretInvestment.income)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Partner Balances */}
        {globalProfit > 0 && (
          <div className="card">
            <h2 className="section-title">Partner Balances</h2>
            <p className="section-sub">Track withdrawals from partner shares</p>
            <div className="stats-grid cols-2" style={{marginTop: '20px'}}>
              {/* Suhaib Card */}
              <div className="stat-card">
                <div className="stat-icon-wrap bg-partner1">{Icons.partner}</div>
                <div className="stat-content">
                  <div className="stat-label">Suhaib</div>
                  <div className="stat-value">{currency(suhaibAvailable)}</div>
                  <div className="stat-sub">
                    Earned: {currency(globalSuhaib)} | Withdrawn: {currency(suhaibWithdrawn)}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{marginTop: '12px'}}
                    onClick={() => setModal({
                      title: "Withdraw — Suhaib",
                      fields: [
                        { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                        { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                        { name: "note", label: "Note", placeholder: "Withdrawal note (optional)" },
                      ],
                      onSubmit: (v) => addPartnerWithdrawal("suhaib", v.amount, v.date, v.note),
                    })}
                  >
                    {Icons.plus} <span>Withdraw</span>
                  </button>
                </div>
              </div>
              {/* Mohammed Card */}
              <div className="stat-card">
                <div className="stat-icon-wrap bg-partner2">{Icons.partner}</div>
                <div className="stat-content">
                  <div className="stat-label">Mohammed</div>
                  <div className="stat-value">{currency(mohammedAvailable)}</div>
                  <div className="stat-sub">
                    Earned: {currency(globalMohammed)} | Withdrawn: {currency(mohammedWithdrawn)}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{marginTop: '12px'}}
                    onClick={() => setModal({
                      title: "Withdraw — Mohammed",
                      fields: [
                        { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                        { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                        { name: "note", label: "Note", placeholder: "Withdrawal note (optional)" },
                      ],
                      onSubmit: (v) => addPartnerWithdrawal("mohammed", v.amount, v.date, v.note),
                    })}
                  >
                    {Icons.plus} <span>Withdraw</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Withdrawal History */}
            {partnerWithdrawals.length > 0 && (
              <div style={{marginTop: '24px'}}>
                <h3 className="section-title" style={{fontSize: '0.95rem'}}>Withdrawal History</h3>
                <div className="table-wrap" style={{marginTop: '12px'}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Partner</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Note</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...partnerWithdrawals].reverse().map(w => (
                        <tr key={w.id}>
                          <td><span className="cell-project">{w.partnerName === 'suhaib' ? 'Suhaib' : 'Mohammed'}</span></td>
                          <td>{formatDate(w.date)}</td>
                          <td><span className="amount-pill expense">{currency(w.amount)}</span></td>
                          <td>{w.note || <span className="text-muted">-</span>}</td>
                          <td>
                            <button className="btn btn-danger-ghost btn-xs"
                              onClick={() => deletePartnerWithdrawal(w.id, w.amount)}>
                              {Icons.trash}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Budget & Recurring Quick Summary */}
        {(budgets.length > 0 || recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
          <div className="card">
            <h2 className="section-title">Quick Overview</h2>
            <p className="section-sub">Budgets and recurring items at a glance</p>
            <div className="stats-grid cols-4" style={{marginTop: '20px'}}>
              {budgets.length > 0 && (
                <>
                  <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setView('budgets')}>
                    <div className="stat-content">
                      <div className="stat-label">Budget Allocated</div>
                      <div className="stat-value">{currency(totalBudgetAllocated)}</div>
                      <div className="stat-sub">{budgets.length} budget{budgets.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setView('budgets')}>
                    <div className="stat-content">
                      <div className="stat-label">Budget Spent</div>
                      <div className="stat-value text-expense">{currency(totalBudgetSpent)}</div>
                      <div className="stat-sub">
                        {totalBudgetAllocated > 0
                          ? `${Math.round((totalBudgetSpent / totalBudgetAllocated) * 100)}% used`
                          : '0% used'}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {(recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
                <>
                  <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setView('recurring')}>
                    <div className="stat-content">
                      <div className="stat-label">Recurring Revenue</div>
                      <div className="stat-value text-income">
                        {currency(recurringRevenue.filter(r => r.active).reduce((a, r) => a + r.amount, 0))}
                      </div>
                      <div className="stat-sub">
                        {recurringRevenue.filter(r => r.active).length} active / {recurringRevenue.length} total
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{cursor: 'pointer'}} onClick={() => setView('recurring')}>
                    <div className="stat-content">
                      <div className="stat-label">Recurring Expenses</div>
                      <div className="stat-value text-expense">
                        {currency(recurringExpenses.filter(r => r.active).reduce((a, r) => a + r.amount, 0))}
                      </div>
                      <div className="stat-sub">
                        {recurringExpenses.filter(r => r.active).length} active / {recurringExpenses.length} total
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Projects Overview</h2>
              <p className="section-sub">All projects at a glance</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setView("projects")}
            >
              {Icons.eye} <span>View All</span>
            </button>
          </div>
          {projectStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.empty}</div>
              <h3>No projects yet</h3>
              <p>Create your first project to start tracking finances.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setView("projects");
                  setModal({
                    title: "New Project",
                    fields: [
                      {
                        name: "name",
                        label: "Project Name",
                        placeholder: "e.g. Website Redesign",
                        required: true,
                      },
                      {
                        name: "totalValue",
                        label: "Total Project Value (BHD)",
                        type: "number",
                        placeholder: "0.00",
                        required: true,
                      },
                    ],
                    onSubmit: (v) => addProject(v.name, v.totalValue),
                  });
                }}
              >
                {Icons.plus} <span>New Project</span>
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Value</th>
                    <th>Paid</th>
                    <th>Unpaid</th>
                    <th>Expenses</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projectStats
                    .slice()
                    .reverse()
                    .map((p) => (
                      <tr
                        key={p.id}
                        className="clickable-row"
                        onClick={() => openProject(p.id)}
                      >
                        <td>
                          <span className="cell-project">{p.name}</span>
                        </td>
                        <td>{currency(p.totalValue)}</td>
                        <td className="text-income">{currency(p.totalPaid)}</td>
                        <td className="text-expense">{currency(p.unpaid)}</td>
                        <td>{currency(p.totalExpenses)}</td>
                        <td
                          className={
                            p.profit >= 0
                              ? "text-income font-semibold"
                              : "text-expense font-semibold"
                          }
                        >
                          {currency(p.profit)}
                        </td>
                        <td>
                          <span
                            className={`badge ${p.unpaid <= 0 ? "badge-income" : p.totalPaid > 0 ? "badge-warning" : "badge-muted"}`}
                          >
                            {p.unpaid <= 0
                              ? "Paid"
                              : p.totalPaid > 0
                                ? "Partial"
                                : "Unpaid"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm">
                            {Icons.eye}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Projects List ---
  function ProjectsView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-sub">
              {projects.length} project{projects.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              setModal({
                title: "New Project",
                fields: [
                  {
                    name: "name",
                    label: "Project Name",
                    placeholder: "e.g. Website Redesign",
                    required: true,
                  },
                  {
                    name: "totalValue",
                    label: "Total Project Value (BHD)",
                    type: "number",
                    placeholder: "0.00",
                    required: true,
                  },
                ],
                onSubmit: (v) => addProject(v.name, v.totalValue),
              })
            }
          >
            {Icons.plus} <span>New Project</span>
          </button>
        </div>

        {projectStats.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">{Icons.empty}</div>
            <h3>No projects yet</h3>
            <p>Click "New Project" above to create your first one.</p>
          </div>
        ) : (
          <div className="project-grid">
            {projectStats
              .slice()
              .reverse()
              .map((p) => {
                const paidPct =
                  p.totalValue > 0
                    ? Math.min(100, (p.totalPaid / p.totalValue) * 100)
                    : 0;
                return (
                  <div
                    key={p.id}
                    className="project-card"
                    onClick={() => openProject(p.id)}
                  >
                    <div className="project-card-top">
                      <div className="project-card-title">
                        <h3>{p.name}</h3>
                        <span
                          className={`badge ${p.unpaid <= 0 ? "badge-income" : p.totalPaid > 0 ? "badge-warning" : "badge-muted"}`}
                        >
                          {p.unpaid <= 0
                            ? "Fully Paid"
                            : p.totalPaid > 0
                              ? "Partial"
                              : "Unpaid"}
                        </span>
                      </div>
                      <div className="project-card-value">
                        {currency(p.totalValue)}
                      </div>
                    </div>

                    <div className="project-card-progress">
                      <div className="progress-header">
                        <span>Payment Progress</span>
                        <span>{Math.round(paidPct)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${paidPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="project-card-stats">
                      <div className="pcs-item">
                        <span className="pcs-label">Paid</span>
                        <span className="pcs-value text-income">
                          {currency(p.totalPaid)}
                        </span>
                      </div>
                      <div className="pcs-item">
                        <span className="pcs-label">Unpaid</span>
                        <span className="pcs-value text-expense">
                          {currency(p.unpaid)}
                        </span>
                      </div>
                      <div className="pcs-item">
                        <span className="pcs-label">Expenses</span>
                        <span className="pcs-value">
                          {currency(p.totalExpenses)}
                        </span>
                      </div>
                      <div className="pcs-item">
                        <span className="pcs-label">Profit</span>
                        <span
                          className={`pcs-value font-semibold ${p.profit >= 0 ? "text-income" : "text-expense"}`}
                        >
                          {currency(p.profit)}
                        </span>
                      </div>
                    </div>

                    <div className="project-card-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProject(p.id);
                        }}
                      >
                        {Icons.eye} <span>View</span>
                      </button>
                      <button
                        className="btn btn-danger-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(p.id, p.name);
                        }}
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  // --- Project Detail ---
  function ProjectDetailView() {
    if (!selectedProject)
      return (
        <div className="empty-state">
          <p>Project not found.</p>
        </div>
      );
    const p = selectedProject;
    const paidPct =
      p.totalValue > 0 ? Math.min(100, (p.totalPaid / p.totalValue) * 100) : 0;

    return (
      <div className="fade-in">
        <button
          className="btn btn-ghost btn-back"
          onClick={() => setView("projects")}
        >
          {Icons.back} <span>Back to Projects</span>
        </button>

        <div className="page-header">
          <div>
            <h1 className="page-title">{p.name}</h1>
            <p className="page-sub">Project value: {currency(p.totalValue)}</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-ghost"
              onClick={() =>
                setModal({
                  title: "Edit Project",
                  fields: [
                    {
                      name: "name",
                      label: "Project Name",
                      default: p.name,
                      required: true,
                    },
                    {
                      name: "totalValue",
                      label: "Total Value (BHD)",
                      type: "number",
                      default: String(p.totalValue),
                      required: true,
                    },
                  ],
                  onSubmit: (v) => editProject(p.id, v.name, v.totalValue),
                })
              }
            >
              {Icons.edit} <span>Edit</span>
            </button>
            <button
              className="btn btn-danger-ghost"
              onClick={() => deleteProject(p.id, p.name)}
            >
              {Icons.trash} <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="stats-grid cols-4">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue">{Icons.revenue}</div>
            <div className="stat-content">
              <div className="stat-label">Total Value</div>
              <div className="stat-value">{currency(p.totalValue)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-income">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Paid</div>
              <div className="stat-value text-income">
                {currency(p.totalPaid)}
              </div>
              <div className="progress-bar mini">
                <div
                  className="progress-fill"
                  style={{ width: `${paidPct}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-expense">{Icons.expense}</div>
            <div className="stat-content">
              <div className="stat-label">Unpaid</div>
              <div className="stat-value text-expense">
                {currency(p.unpaid)}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap bg-profit">{Icons.profit}</div>
            <div className="stat-content">
              <div className="stat-label">Net Profit</div>
              <div
                className="stat-value"
                style={{
                  color: p.profit >= 0 ? "var(--income)" : "var(--expense)",
                }}
              >
                {currency(p.profit)}
              </div>
            </div>
          </div>
        </div>

        {/* Profit Split */}
        {p.profit > 0 && (
          <div className="card">
            <h2 className="section-title">Profit Split</h2>
            <p className="section-sub">25% allocation per category</p>
            <div className="split-grid">
              <div className="split-item split-bank">
                <div className="split-icon">{Icons.bank}</div>
                <div className="split-label">Bank Savings</div>
                <div className="split-value">{currency(p.bankShare)}</div>
              </div>
              <div className="split-item split-partner1">
                <div className="split-icon">{Icons.partner}</div>
                <div className="split-label">Suhaib</div>
                <div className="split-value">{currency(p.suhaibShare)}</div>
              </div>
              <div className="split-item split-partner2">
                <div className="split-icon">{Icons.partner}</div>
                <div className="split-label">Mohammed</div>
                <div className="split-value">{currency(p.mohammedShare)}</div>
              </div>
              <div className="split-item split-charity">
                <div className="split-icon">{Icons.charity}</div>
                <div className="split-label">Secret Investment</div>
                <div className="split-value">{currency(p.secretInvestmentShare)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Payments</h2>
              <p className="section-sub">
                {(p.payments || []).length} payment
                {(p.payments || []).length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                setModal({
                  title: "Add Payment",
                  fields: [
                    {
                      name: "amount",
                      label: "Amount (BHD)",
                      type: "number",
                      placeholder: "0.00",
                      required: true,
                    },
                    {
                      name: "date",
                      label: "Date",
                      type: "date",
                      default: new Date().toISOString().split("T")[0],
                      required: true,
                    },
                    {
                      name: "note",
                      label: "Note",
                      placeholder: "Payment note (optional)",
                    },
                  ],
                  onSubmit: (v) => addPayment(p.id, v.amount, v.date, v.note),
                })
              }
            >
              {Icons.plus} <span>Add Payment</span>
            </button>
          </div>
          {(p.payments || []).length === 0 ? (
            <p className="text-muted-block">
              No payments recorded yet. Add your first payment above.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...(p.payments || [])].reverse().map((pay) => (
                    <tr key={pay.id}>
                      <td>{formatDate(pay.date)}</td>
                      <td>
                        <span className="amount-pill income">
                          {currency(pay.amount)}
                        </span>
                      </td>
                      <td>
                        {pay.note || <span className="text-muted">-</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger-ghost btn-xs"
                          onClick={() =>
                            deletePayment(p.id, pay.id, pay.amount)
                          }
                        >
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Expenses</h2>
              <p className="section-sub">
                {(p.expenses || []).length} expense
                {(p.expenses || []).length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                setModal({
                  title: "Add Expense",
                  fields: [
                    {
                      name: "amount",
                      label: "Amount (BHD)",
                      type: "number",
                      placeholder: "0.00",
                      required: true,
                    },
                    {
                      name: "date",
                      label: "Date",
                      type: "date",
                      default: new Date().toISOString().split("T")[0],
                      required: true,
                    },
                    {
                      name: "description",
                      label: "Description",
                      placeholder: "What was this expense for?",
                      required: true,
                    },
                  ],
                  onSubmit: (v) =>
                    addExpense(p.id, v.amount, v.date, v.description),
                })
              }
            >
              {Icons.plus} <span>Add Expense</span>
            </button>
          </div>
          {(p.expenses || []).length === 0 ? (
            <p className="text-muted-block">No expenses recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...(p.expenses || [])].reverse().map((exp) => (
                    <tr key={exp.id}>
                      <td>{formatDate(exp.date)}</td>
                      <td>
                        <span className="amount-pill expense">
                          {currency(exp.amount)}
                        </span>
                      </td>
                      <td>{exp.description}</td>
                      <td>
                        <button
                          className="btn btn-danger-ghost btn-xs"
                          onClick={() =>
                            deleteExpense(p.id, exp.id, exp.amount)
                          }
                        >
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Bank View ---
  function BankView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Bank Savings</h1>
            <p className="page-sub">
              25% of all project profits go to bank savings
            </p>
          </div>
        </div>

        <div className="stats-grid cols-4">
          <div className="stat-card highlight-card" style={{background: 'rgba(66, 133, 244, 0.08)', borderColor: 'rgba(66, 133, 244, 0.2)'}}>
            <div className="stat-content">
              <div className="stat-label">Total in Bank</div>
              <div className="stat-value" style={{color: '#4285f4'}}>
                {currency(totalPhysicalBank)}
              </div>
              <div className="stat-sub">All money in account</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-income-soft">
            <div className="stat-content">
              <div className="stat-label">Bank Share (25%)</div>
              <div className="stat-value text-income">
                {currency(globalBank.income)}
              </div>
              <div className="stat-sub">From project profits</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-expense-soft">
            <div className="stat-content">
              <div className="stat-label">Bank Spent</div>
              <div className="stat-value text-expense">
                {currency(globalBank.spent)}
              </div>
              <div className="stat-sub">
                {bankSpending.length} transaction
                {bankSpending.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-bank-soft">
            <div className="stat-content">
              <div className="stat-label">Bank Available</div>
              <div className="stat-value text-bank">
                {currency(globalBank.balance)}
              </div>
              <div className="stat-sub">Share minus spent</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Money Allocation</h2>
          <p className="section-sub">How the total bank balance is distributed</p>
          <div className="distribution-grid">
            <div className="dist-item">
              <div className="dist-bar bg-bank" style={{width: '100%'}}></div>
              <div className="dist-info">
                <span className="dist-label">Bank Savings</span>
                <span className="dist-value">{currency(globalBank.balance)}</span>
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-bar bg-partner1" style={{width: '100%'}}></div>
              <div className="dist-info">
                <span className="dist-label">Suhaib (in bank)</span>
                <span className="dist-value">{currency(suhaibAvailable)}</span>
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-bar bg-partner2" style={{width: '100%'}}></div>
              <div className="dist-info">
                <span className="dist-label">Mohammed (in bank)</span>
                <span className="dist-value">{currency(mohammedAvailable)}</span>
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-bar bg-charity" style={{width: '100%'}}></div>
              <div className="dist-info">
                <span className="dist-label">Secret Investment (in bank)</span>
                <span className="dist-value">{currency(globalSecretInvestment.balance)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Spending History</h2>
              <p className="section-sub">Independent of project expenses</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                setModal({
                  title: "Spend from Bank",
                  fields: [
                    {
                      name: "amount",
                      label: "Amount (BHD)",
                      type: "number",
                      placeholder: "0.00",
                      required: true,
                    },
                    {
                      name: "date",
                      label: "Date",
                      type: "date",
                      default: new Date().toISOString().split("T")[0],
                      required: true,
                    },
                    {
                      name: "description",
                      label: "Description",
                      placeholder: "What was this for?",
                      required: true,
                    },
                  ],
                  onSubmit: (v) =>
                    addBankSpending(v.amount, v.date, v.description),
                })
              }
            >
              {Icons.plus} <span>Record Spending</span>
            </button>
          </div>
          {bankSpending.length === 0 ? (
            <p className="text-muted-block">
              No spending recorded from bank savings yet.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...bankSpending].reverse().map((s) => (
                    <tr key={s.id}>
                      <td>{formatDate(s.date)}</td>
                      <td>
                        <span className="amount-pill expense">
                          {currency(s.amount)}
                        </span>
                      </td>
                      <td>{s.description}</td>
                      <td>
                        <button
                          className="btn btn-danger-ghost btn-xs"
                          onClick={() => deleteBankSpending(s.id, s.amount)}
                        >
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Contributions by Project</h2>
          <p className="section-sub">
            How much each project contributed to bank savings
          </p>
          {projectStats.filter((p) => p.bankShare > 0).length === 0 ? (
            <p className="text-muted-block">
              No contributions yet. Profits from projects will appear here.
            </p>
          ) : (
            <div className="contributions-list">
              {projectStats
                .filter((p) => p.bankShare > 0)
                .map((p) => (
                  <div
                    key={p.id}
                    className="contribution-row"
                    onClick={() => openProject(p.id)}
                  >
                    <span className="contribution-name">{p.name}</span>
                    <span className="contribution-amount text-income">
                      {currency(p.bankShare)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Budgets View ---
  function BudgetsView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Budgets</h1>
            <p className="page-sub">
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              setModal({
                title: "New Budget",
                fields: [
                  { name: "name", label: "Budget Name", placeholder: "e.g. Marketing", required: true },
                  { name: "allocatedAmount", label: "Allocated Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                  { name: "description", label: "Description", placeholder: "Budget description" },
                ],
                onSubmit: (v) => addBudget(v.name, v.allocatedAmount, v.description),
              })
            }
          >
            {Icons.plus} <span>New Budget</span>
          </button>
        </div>

        <div className="stats-grid cols-3">
          <div className="stat-card highlight-card bg-income-soft">
            <div className="stat-content">
              <div className="stat-label">Total Allocated</div>
              <div className="stat-value text-income">{currency(totalBudgetAllocated)}</div>
              <div className="stat-sub">Across {budgets.length} budget{budgets.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-expense-soft">
            <div className="stat-content">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-expense">{currency(totalBudgetSpent)}</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-bank-soft">
            <div className="stat-content">
              <div className="stat-label">Total Remaining</div>
              <div className="stat-value" style={{color: (totalBudgetAllocated - totalBudgetSpent) >= 0 ? 'var(--income)' : 'var(--expense)'}}>
                {currency(totalBudgetAllocated - totalBudgetSpent)}
              </div>
            </div>
          </div>
        </div>

        {budgetStats.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">{Icons.empty}</div>
            <h3>No budgets yet</h3>
            <p>Click "New Budget" above to create your first one.</p>
          </div>
        ) : (
          <div className="project-grid">
            {budgetStats.map(b => {
              const pct = b.allocatedAmount > 0 ? Math.min(100, (b.spent / b.allocatedAmount) * 100) : 0;
              return (
                <div key={b.id} className="card">
                  <div className="card-header">
                    <div>
                      <h3 className="section-title">{b.name}</h3>
                      {b.description && <p className="section-sub">{b.description}</p>}
                    </div>
                    <div style={{display:'flex', gap:'6px'}}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal({
                        title: "Edit Budget",
                        fields: [
                          { name: "name", label: "Budget Name", default: b.name, required: true },
                          { name: "allocatedAmount", label: "Allocated Amount (BHD)", type: "number", default: String(b.allocatedAmount), required: true },
                          { name: "description", label: "Description", default: b.description || "", placeholder: "Budget description" },
                        ],
                        onSubmit: (v) => editBudget(b.id, v.name, v.allocatedAmount, v.description),
                      })}>{Icons.edit}</button>
                      <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteBudget(b.id, b.name)}>{Icons.trash}</button>
                    </div>
                  </div>

                  <div style={{marginBottom:'16px'}}>
                    <div className="progress-header">
                      <span>Budget Usage</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: `${pct}%`, background: pct > 90 ? 'linear-gradient(90deg, var(--expense), #f87171)' : undefined}}></div>
                    </div>
                  </div>

                  <div className="stats-grid cols-3" style={{marginBottom:'16px'}}>
                    <div style={{textAlign:'center'}}>
                      <div className="stat-label">Allocated</div>
                      <div style={{fontSize:'1.05rem', fontWeight:600}}>{currency(b.allocatedAmount)}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div className="stat-label">Spent</div>
                      <div style={{fontSize:'1.05rem', fontWeight:600}} className="text-expense">{currency(b.spent)}</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div className="stat-label">Remaining</div>
                      <div style={{fontSize:'1.05rem', fontWeight:600}} className={b.remaining >= 0 ? 'text-income' : 'text-expense'}>{currency(b.remaining)}</div>
                    </div>
                  </div>

                  <button className="btn btn-primary btn-sm" onClick={() => setModal({
                    title: "Add Spending — " + b.name,
                    fields: [
                      { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                      { name: "date", label: "Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                      { name: "description", label: "Description", placeholder: "What was this for?", required: true },
                    ],
                    onSubmit: (v) => addBudgetSpending(b.id, v.amount, v.date, v.description),
                  })}>
                    {Icons.plus} <span>Add Spending</span>
                  </button>

                  {/* Spending history */}
                  {(b.spending || []).length > 0 && (
                    <div className="table-wrap" style={{marginTop:'16px'}}>
                      <table>
                        <thead><tr><th>Date</th><th>Amount</th><th>Description</th><th></th></tr></thead>
                        <tbody>
                          {[...(b.spending || [])].reverse().map(s => (
                            <tr key={s.id}>
                              <td>{formatDate(s.date)}</td>
                              <td><span className="amount-pill expense">{currency(s.amount)}</span></td>
                              <td>{s.description}</td>
                              <td><button className="btn btn-danger-ghost btn-xs" onClick={() => deleteBudgetSpending(s.id, s.amount)}>{Icons.trash}</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Recurring</h1>
            <p className="page-sub">
              {recurringRevenue.length} revenue &middot; {recurringExpenses.length} expense items
            </p>
          </div>
        </div>

        {/* Recurring Revenue Section */}
        <div className="card" style={{marginBottom: '24px'}}>
          <div className="card-header">
            <h3 className="section-title">Recurring Revenue</h3>
            <button
              className="btn btn-primary"
              onClick={() =>
                setModal({
                  title: "Add Recurring Revenue",
                  fields: [
                    { name: "description", label: "Description", placeholder: "e.g. Monthly retainer", required: true },
                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                    { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                    { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" },
                    { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                  ],
                  onSubmit: (v) => addRecurringRevenue(v.projectId || null, v.amount, v.frequency, v.description, v.startDate),
                })
              }
            >
              {Icons.plus} <span>Add Revenue</span>
            </button>
          </div>
          {recurringRevenue.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">{Icons.empty}</div>
              <h3>No recurring revenue</h3>
              <p>Click "Add Revenue" to add a recurring revenue stream.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Project</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recurringRevenue.map((item) => (
                    <tr key={item.id}>
                      <td style={{fontWeight: 500}}>{item.description}</td>
                      <td className="text-income">{currency(item.amount)}</td>
                      <td>{item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}</td>
                      <td>{projects.find(p => p.id === item.projectId)?.name || 'General'}</td>
                      <td>{formatDate(item.nextDue)}</td>
                      <td>
                        <button
                          className={`badge ${item.active ? 'badge-income' : 'badge-muted'}`}
                          style={{cursor: 'pointer', border: 'none'}}
                          onClick={() => toggleRecurringRevenue(item.id, item.active)}
                        >
                          {item.active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteRecurringRevenue(item.id, item.description)}>
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recurring Expenses Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Recurring Expenses</h3>
            <button
              className="btn btn-primary"
              onClick={() =>
                setModal({
                  title: "Add Recurring Expense",
                  fields: [
                    { name: "description", label: "Description", placeholder: "e.g. Office rent", required: true },
                    { name: "amount", label: "Amount (BHD)", type: "number", placeholder: "0.00", required: true },
                    { name: "frequency", label: "Frequency", type: "select", options: ["monthly", "yearly"], default: "monthly", required: true },
                    { name: "projectId", label: "Project (optional)", type: "select", options: projects, placeholder: "General (no project)", default: "" },
                    { name: "startDate", label: "Start Date", type: "date", default: new Date().toISOString().split("T")[0], required: true },
                  ],
                  onSubmit: (v) => addRecurringExpense(v.projectId || null, v.amount, v.frequency, v.description, v.startDate),
                })
              }
            >
              {Icons.plus} <span>Add Expense</span>
            </button>
          </div>
          {recurringExpenses.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">{Icons.empty}</div>
              <h3>No recurring expenses</h3>
              <p>Click "Add Expense" to add a recurring expense.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Project</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map((item) => (
                    <tr key={item.id}>
                      <td style={{fontWeight: 500}}>{item.description}</td>
                      <td className="text-expense">{currency(item.amount)}</td>
                      <td>{item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}</td>
                      <td>{projects.find(p => p.id === item.projectId)?.name || 'General'}</td>
                      <td>{formatDate(item.nextDue)}</td>
                      <td>
                        <button
                          className={`badge ${item.active ? 'badge-income' : 'badge-muted'}`}
                          style={{cursor: 'pointer', border: 'none'}}
                          onClick={() => toggleRecurringExpense(item.id, item.active)}
                        >
                          {item.active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteRecurringExpense(item.id, item.description)}>
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Secret Investment View ---
  function SecretInvestmentView() {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Secret Investment</h1>
            <p className="page-sub">25% of all project profits go to secret investment</p>
          </div>
        </div>

        <div className="stats-grid cols-3">
          <div className="stat-card highlight-card bg-income-soft">
            <div className="stat-content">
              <div className="stat-label">Total Accumulated</div>
              <div className="stat-value text-income">
                {currency(globalSecretInvestment.income)}
              </div>
              <div className="stat-sub">From project profits</div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-expense-soft">
            <div className="stat-content">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-expense">
                {currency(globalSecretInvestment.spent)}
              </div>
              <div className="stat-sub">
                {secretInvestmentSpending.length} transaction
                {secretInvestmentSpending.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="stat-card highlight-card bg-charity-soft">
            <div className="stat-content">
              <div className="stat-label">Current Balance</div>
              <div className="stat-value text-charity">
                {currency(globalSecretInvestment.balance)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">Spending History</h2>
              <p className="section-sub">Independent of project expenses</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                setModal({
                  title: "Spend from Secret Investment",
                  fields: [
                    {
                      name: "amount",
                      label: "Amount (BHD)",
                      type: "number",
                      placeholder: "0.00",
                      required: true,
                    },
                    {
                      name: "date",
                      label: "Date",
                      type: "date",
                      default: new Date().toISOString().split("T")[0],
                      required: true,
                    },
                    {
                      name: "description",
                      label: "Description",
                      placeholder: "What was this for?",
                      required: true,
                    },
                  ],
                  onSubmit: (v) =>
                    addSecretInvestmentSpending(v.amount, v.date, v.description),
                })
              }
            >
              {Icons.plus} <span>Record Spending</span>
            </button>
          </div>
          {secretInvestmentSpending.length === 0 ? (
            <p className="text-muted-block">
              No spending recorded from secret investment funds yet.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...secretInvestmentSpending].reverse().map((s) => (
                    <tr key={s.id}>
                      <td>{formatDate(s.date)}</td>
                      <td>
                        <span className="amount-pill expense">
                          {currency(s.amount)}
                        </span>
                      </td>
                      <td>{s.description}</td>
                      <td>
                        <button
                          className="btn btn-danger-ghost btn-xs"
                          onClick={() => deleteSecretInvestmentSpending(s.id, s.amount)}
                        >
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Contributions by Project</h2>
          <p className="section-sub">
            How much each project contributed to secret investment
          </p>
          {projectStats.filter((p) => p.secretInvestmentShare > 0).length === 0 ? (
            <p className="text-muted-block">
              No contributions yet. Profits from projects will appear here.
            </p>
          ) : (
            <div className="contributions-list">
              {projectStats
                .filter((p) => p.secretInvestmentShare > 0)
                .map((p) => (
                  <div
                    key={p.id}
                    className="contribution-row"
                    onClick={() => openProject(p.id)}
                  >
                    <span className="contribution-name">{p.name}</span>
                    <span className="contribution-amount text-income">
                      {currency(p.secretInvestmentShare)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function ReportsView() {
    const filterByMonth = (dateStr) => {
      if (!dateStr) return false;
      return dateStr.startsWith(reportMonth);
    };

    // Monthly payments (revenue)
    const monthlyPayments = projectStats.flatMap(p =>
      (p.payments || []).filter(pay => filterByMonth(pay.date))
    );
    const monthlyRevenue = monthlyPayments.reduce((a, p) => a + p.amount, 0);

    // Monthly project expenses
    const monthlyProjectExpenses = projectStats.flatMap(p =>
      (p.expenses || []).filter(exp => filterByMonth(exp.date))
    );
    const monthlyExpenses = monthlyProjectExpenses.reduce((a, e) => a + e.amount, 0);

    // Monthly bank spending
    const monthlyBankSpending = bankSpending.filter(s => filterByMonth(s.date));
    const monthlyBankSpent = monthlyBankSpending.reduce((a, s) => a + s.amount, 0);

    // Monthly secret investment spending
    const monthlySecretSpending = secretInvestmentSpending.filter(s => filterByMonth(s.date));
    const monthlySecretSpent = monthlySecretSpending.reduce((a, s) => a + s.amount, 0);

    // Monthly partner withdrawals
    const monthlySuhaibWithdrawals = partnerWithdrawals.filter(w => w.partnerName === 'suhaib' && filterByMonth(w.date));
    const monthlyMohammedWithdrawals = partnerWithdrawals.filter(w => w.partnerName === 'mohammed' && filterByMonth(w.date));
    const monthlySuhaibWithdrawn = monthlySuhaibWithdrawals.reduce((a, w) => a + w.amount, 0);
    const monthlyMohammedWithdrawn = monthlyMohammedWithdrawals.reduce((a, w) => a + w.amount, 0);

    // Monthly budget spending
    const monthlyBudgetSpending = budgetStats.flatMap(b =>
      (b.spending || []).filter(s => filterByMonth(s.date))
    );
    const monthlyBudgetSpent = monthlyBudgetSpending.reduce((a, s) => a + s.amount, 0);

    const monthlyProfit = monthlyRevenue - monthlyExpenses;
    const monthlyTotalOutflow = monthlyExpenses + monthlyBankSpent + monthlySecretSpent + monthlySuhaibWithdrawn + monthlyMohammedWithdrawn + monthlyBudgetSpent;

    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-sub">Financial reports and analytics</p>
          </div>
          <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
            style={{padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none'}} />
        </div>

        {/* Report 1: Monthly Profit & Loss */}
        <div className="card">
          <h2 className="section-title">Profit & Loss — {new Date(reportMonth + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</h2>
          <p className="section-sub">Revenue vs expenses for the selected month</p>
          <div className="stats-grid cols-4" style={{marginTop: '20px'}}>
            <div className="stat-card highlight-card bg-income-soft">
              <div className="stat-content"><div className="stat-label">Revenue</div><div className="stat-value text-income">{currency(monthlyRevenue)}</div><div className="stat-sub">{monthlyPayments.length} payment{monthlyPayments.length !== 1 ? 's' : ''}</div></div>
            </div>
            <div className="stat-card highlight-card bg-expense-soft">
              <div className="stat-content"><div className="stat-label">Project Expenses</div><div className="stat-value text-expense">{currency(monthlyExpenses)}</div><div className="stat-sub">{monthlyProjectExpenses.length} expense{monthlyProjectExpenses.length !== 1 ? 's' : ''}</div></div>
            </div>
            <div className="stat-card highlight-card" style={{background: monthlyProfit >= 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)'}}>
              <div className="stat-content"><div className="stat-label">Net Profit</div><div className="stat-value" style={{color: monthlyProfit >= 0 ? 'var(--income)' : 'var(--expense)'}}>{currency(monthlyProfit)}</div></div>
            </div>
            <div className="stat-card highlight-card bg-bank-soft">
              <div className="stat-content"><div className="stat-label">Total Outflow</div><div className="stat-value text-bank">{currency(monthlyTotalOutflow)}</div><div className="stat-sub">All spending combined</div></div>
            </div>
          </div>
        </div>

        {/* Report 2: Partner Summary */}
        <div className="card">
          <h2 className="section-title">Partner Summary</h2>
          <p className="section-sub">All-time earnings and withdrawals</p>
          <div className="stats-grid cols-2" style={{marginTop: '20px'}}>
            <div className="stat-card">
              <div className="stat-icon-wrap bg-partner1">{Icons.partner}</div>
              <div className="stat-content">
                <div className="stat-label">Suhaib</div>
                <div className="stat-value">{currency(suhaibAvailable)}</div>
                <div className="stat-sub">Earned: {currency(globalSuhaib)} · Withdrawn: {currency(suhaibWithdrawn)}</div>
                {monthlySuhaibWithdrawn > 0 && <div className="stat-sub">This month: {currency(monthlySuhaibWithdrawn)} withdrawn</div>}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap bg-partner2">{Icons.partner}</div>
              <div className="stat-content">
                <div className="stat-label">Mohammed</div>
                <div className="stat-value">{currency(mohammedAvailable)}</div>
                <div className="stat-sub">Earned: {currency(globalMohammed)} · Withdrawn: {currency(mohammedWithdrawn)}</div>
                {monthlyMohammedWithdrawn > 0 && <div className="stat-sub">This month: {currency(monthlyMohammedWithdrawn)} withdrawn</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Report 3: Budget Utilization */}
        <div className="card">
          <h2 className="section-title">Budget Utilization</h2>
          <p className="section-sub">How budgets are being used</p>
          {budgetStats.length === 0 ? (
            <p className="text-muted-block">No budgets created yet.</p>
          ) : (
            <div style={{marginTop: '16px'}}>
              {budgetStats.map(b => {
                const pct = b.allocatedAmount > 0 ? Math.min(100, (b.spent / b.allocatedAmount) * 100) : 0;
                return (
                  <div key={b.id} style={{marginBottom: '16px', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                      <span style={{fontWeight:600, fontSize:'0.9rem'}}>{b.name}</span>
                      <span style={{fontSize:'0.82rem', color:'var(--text-secondary)'}}>{currency(b.spent)} / {currency(b.allocatedAmount)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width:`${pct}%`, background: pct > 90 ? 'linear-gradient(90deg, var(--expense), #f87171)' : pct > 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : undefined}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px', fontSize:'0.75rem', color:'var(--text-muted)'}}>
                      <span>{Math.round(pct)}% used</span>
                      <span>{currency(b.remaining)} remaining</span>
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:'16px', padding:'12px 16px', background:'var(--bg)', borderRadius:'var(--radius-sm)', display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:600}}>Total</span>
                <span style={{fontWeight:600}}>{currency(totalBudgetSpent)} / {currency(totalBudgetAllocated)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Report 3b: Recurring Obligations */}
        {(recurringRevenue.length > 0 || recurringExpenses.length > 0) && (
          <div className="card">
            <h2 className="section-title">Recurring Obligations</h2>
            <p className="section-sub">Active recurring revenue and expenses</p>
            <div className="stats-grid cols-3" style={{marginTop: '20px'}}>
              <div className="stat-card highlight-card bg-income-soft">
                <div className="stat-content">
                  <div className="stat-label">Monthly Revenue</div>
                  <div className="stat-value text-income">
                    {currency(recurringRevenue.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0))}
                  </div>
                  <div className="stat-sub">{recurringRevenue.filter(r => r.active && r.frequency === 'monthly').length} active</div>
                </div>
              </div>
              <div className="stat-card highlight-card bg-expense-soft">
                <div className="stat-content">
                  <div className="stat-label">Monthly Expenses</div>
                  <div className="stat-value text-expense">
                    {currency(recurringExpenses.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0))}
                  </div>
                  <div className="stat-sub">{recurringExpenses.filter(r => r.active && r.frequency === 'monthly').length} active</div>
                </div>
              </div>
              <div className="stat-card highlight-card bg-bank-soft">
                <div className="stat-content">
                  <div className="stat-label">Net Monthly Recurring</div>
                  <div className="stat-value" style={{color:
                    (recurringRevenue.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0) -
                     recurringExpenses.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0)) >= 0
                    ? 'var(--income)' : 'var(--expense)'}}>
                    {currency(
                      recurringRevenue.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0) -
                      recurringExpenses.filter(r => r.active && r.frequency === 'monthly').reduce((a, r) => a + r.amount, 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
            {recurringRevenue.filter(r => r.active && r.frequency === 'yearly').length > 0 || recurringExpenses.filter(r => r.active && r.frequency === 'yearly').length > 0 ? (
              <div style={{marginTop:'16px', padding:'12px 16px', background:'var(--bg)', borderRadius:'var(--radius-sm)', fontSize:'0.85rem', color:'var(--text-secondary)'}}>
                Yearly: {currency(recurringRevenue.filter(r => r.active && r.frequency === 'yearly').reduce((a, r) => a + r.amount, 0))} revenue
                {' '}&middot;{' '}
                {currency(recurringExpenses.filter(r => r.active && r.frequency === 'yearly').reduce((a, r) => a + r.amount, 0))} expenses
              </div>
            ) : null}
          </div>
        )}

        {/* Report 4: Cash Flow Summary */}
        <div className="card">
          <h2 className="section-title">Cash Flow Summary</h2>
          <p className="section-sub">All-time money movement</p>
          <div className="table-wrap" style={{marginTop: '16px'}}>
            <table>
              <thead><tr><th>Category</th><th>Inflow</th><th>Outflow</th><th>Net</th></tr></thead>
              <tbody>
                <tr>
                  <td><span className="cell-project">Project Revenue</span></td>
                  <td className="text-income">{currency(globalRevenue)}</td>
                  <td>-</td>
                  <td className="text-income">{currency(globalRevenue)}</td>
                </tr>
                <tr>
                  <td><span className="cell-project">Project Expenses</span></td>
                  <td>-</td>
                  <td className="text-expense">{currency(globalExpenses)}</td>
                  <td className="text-expense">-{currency(globalExpenses)}</td>
                </tr>
                <tr>
                  <td><span className="cell-project">Bank Spending</span></td>
                  <td>-</td>
                  <td className="text-expense">{currency(globalBank.spent)}</td>
                  <td className="text-expense">-{currency(globalBank.spent)}</td>
                </tr>
                <tr>
                  <td><span className="cell-project">Secret Investment Spending</span></td>
                  <td>-</td>
                  <td className="text-expense">{currency(globalSecretInvestment.spent)}</td>
                  <td className="text-expense">-{currency(globalSecretInvestment.spent)}</td>
                </tr>
                <tr>
                  <td><span className="cell-project">Partner Withdrawals</span></td>
                  <td>-</td>
                  <td className="text-expense">{currency(suhaibWithdrawn + mohammedWithdrawn)}</td>
                  <td className="text-expense">-{currency(suhaibWithdrawn + mohammedWithdrawn)}</td>
                </tr>
                <tr>
                  <td><span className="cell-project">Budget Spending</span></td>
                  <td>-</td>
                  <td className="text-expense">{currency(totalBudgetSpent)}</td>
                  <td className="text-expense">-{currency(totalBudgetSpent)}</td>
                </tr>
                <tr style={{borderTop:'2px solid var(--border)', fontWeight:700}}>
                  <td>Net Cash Position</td>
                  <td className="text-income">{currency(globalRevenue)}</td>
                  <td className="text-expense">{currency(globalExpenses + globalBank.spent + globalSecretInvestment.spent + suhaibWithdrawn + mohammedWithdrawn + totalBudgetSpent)}</td>
                  <td className={totalPhysicalBank >= 0 ? 'text-income' : 'text-expense'} style={{fontWeight:700}}>{currency(totalPhysicalBank)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Report 5: Project Performance */}
        <div className="card">
          <h2 className="section-title">Project Performance</h2>
          <p className="section-sub">Profitability breakdown by project</p>
          {projectStats.length === 0 ? (
            <p className="text-muted-block">No projects yet.</p>
          ) : (
            <div className="table-wrap" style={{marginTop: '16px'}}>
              <table>
                <thead><tr><th>Project</th><th>Value</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr></thead>
                <tbody>
                  {projectStats.slice().reverse().map(p => {
                    const margin = p.totalPaid > 0 ? ((p.profit / p.totalPaid) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={p.id} className="clickable-row" onClick={() => openProject(p.id)}>
                        <td><span className="cell-project">{p.name}</span></td>
                        <td>{currency(p.totalValue)}</td>
                        <td className="text-income">{currency(p.totalPaid)}</td>
                        <td className="text-expense">{currency(p.totalExpenses)}</td>
                        <td className={p.profit >= 0 ? 'text-income font-semibold' : 'text-expense font-semibold'}>{currency(p.profit)}</td>
                        <td><span className={`badge ${parseFloat(margin) >= 50 ? 'badge-income' : parseFloat(margin) >= 0 ? 'badge-warning' : 'badge-muted'}`}>{margin}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Render ---
  if (!loaded)
    return (
      <div className="loading-screen">
        <div className="loading-brand">
          <div className="brand-logo lg">R</div>
          <h2>RAL Finance</h2>
        </div>
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    );

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar />
      <main className="main-content">
        <div className="mobile-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        {view === "dashboard" && <DashboardView />}
        {view === "projects" && <ProjectsView />}
        {view === "project" && <ProjectDetailView />}
        {view === "bank" && <BankView />}
        {view === "budgets" && <BudgetsView />}
        {view === "recurring" && <RecurringView />}
        {view === "reports" && <ReportsView />}
        {view === "secretInvestment" && <SecretInvestmentView />}
      </main>
      {modal && <ModalForm {...modal} onClose={() => setModal(null)} />}
      {/* Enhanced Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === "success" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      {confirm && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setConfirm(null)}
        >
          <div
            className="modal confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{confirm.title}</h3>
              {!loading && (
                <button
                  className="btn-icon"
                  onClick={() => setConfirm(null)}
                  aria-label="Close"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="modal-body">
              <p>{confirm.message}</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirm(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`btn ${confirm.isDangerous ? "btn-danger" : "btn-primary"}`}
                onClick={async () => {
                  await confirm.onConfirm();
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  confirm.action
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
