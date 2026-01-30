"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { workflowStages } from "@/lib/constants";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  outstandingBalance: number;
  totalQuotations: number;
  confirmedQuotations: number;
  pendingQuotations: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  event_type: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

interface RecentQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  event_type: string;
  grand_total: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    outstandingBalance: 0,
    totalQuotations: 0,
    confirmedQuotations: 0,
    pendingQuotations: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [workflowSummary, setWorkflowSummary] = useState<Record<string, { completed: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("This Month");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        // Get date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Fetch orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        // Fetch quotations
        const { data: quotations } = await supabase
          .from("quotations")
          .select("*")
          .order("created_at", { ascending: false });

        // Fetch expenses
        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount");

        const allOrders = orders || [];
        const allQuotations = quotations || [];
        const allExpenses = expenses || [];

        // Calculate stats
        const totalOrders = allOrders.length;
        const completedOrders = allOrders.filter(o => {
          try {
            const workflow = o.workflow_status ? JSON.parse(o.workflow_status) : {};
            return workflowStages.every(s => workflow[s] === "Yes" || workflow[s] === "Not Needed");
          } catch {
            return false;
          }
        }).length;
        const pendingOrders = totalOrders - completedOrders;

        const monthlyOrders = allOrders.filter(o => new Date(o.created_at) >= startOfMonth);
        const yearlyOrders = allOrders.filter(o => new Date(o.created_at) >= startOfYear);

        const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const yearlyRevenue = yearlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const totalExpensesAmount = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalProfit = yearlyRevenue - totalExpensesAmount;
        const outstandingBalance = allOrders.reduce((sum, o) => sum + (o.balance_due || 0), 0);

        const totalQuotations = allQuotations.length;
        const confirmedQuotations = allQuotations.filter(q => q.status === "Confirmed").length;
        const pendingQuotations = allQuotations.filter(q => q.status === "Pending").length;

        // Calculate workflow summary
        const workflowStats: Record<string, { completed: number; total: number }> = {};
        workflowStages.forEach(stage => {
          workflowStats[stage] = { completed: 0, total: totalOrders };
        });

        allOrders.forEach(order => {
          try {
            const workflow = order.workflow_status ? JSON.parse(order.workflow_status) : {};
            workflowStages.forEach(stage => {
              if (workflow[stage] === "Yes" || workflow[stage] === "Not Needed") {
                workflowStats[stage].completed++;
              }
            });
          } catch {
            // Skip invalid workflow data
          }
        });

        setStats({
          totalOrders,
          pendingOrders,
          completedOrders,
          monthlyRevenue,
          yearlyRevenue,
          totalExpenses: totalExpensesAmount,
          totalProfit,
          outstandingBalance,
          totalQuotations,
          confirmedQuotations,
          pendingQuotations,
        });

        setWorkflowSummary(workflowStats);
        setRecentOrders(allOrders.slice(0, 5) as RecentOrder[]);
        setRecentQuotations(allQuotations.slice(0, 5) as RecentQuotation[]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const paymentStatusColors: Record<string, string> = {
    Pending: "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30",
    Partial: "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30",
    Paid: "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30",
  };

  const quotationStatusColors: Record<string, string> = {
    Pending: "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30",
    Confirmed: "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30",
    Declined: "bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/30",
    Draft: "bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)] border-[var(--muted-foreground)]/30",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Dashboard</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {!supabase && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          ⚠️ Supabase not configured. Please set up your environment variables to see real data.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={stats.totalOrders.toString()} trend="neutral" />
        <StatCard label="Pending Orders" value={stats.pendingOrders.toString()} helper="Workflow in progress" trend={stats.pendingOrders > 0 ? "down" : "neutral"} />
        <StatCard label="Completed Orders" value={stats.completedOrders.toString()} helper="All stages done" trend="up" />
        <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} trend={stats.outstandingBalance > 0 ? "down" : "up"} />
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Monthly Revenue</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Yearly Revenue</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{formatCurrency(stats.yearlyRevenue)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Expenses</p>
          <p className="text-2xl font-bold text-[var(--danger)]">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className={`rounded-xl border border-[var(--border)] p-4 ${stats.totalProfit >= 0 ? "bg-[var(--success)]/10" : "bg-[var(--danger)]/10"}`}>
          <p className="text-sm text-[var(--muted-foreground)]">Net Profit (YTD)</p>
          <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {formatCurrency(stats.totalProfit)}
          </p>
        </div>
      </div>

      {/* Workflow Progress & Quotations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Workflow Progress" description="Completion status across all orders">
          {stats.totalOrders === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-[var(--muted-foreground)]">No orders yet</p>
              <Link href="/quotations" className="mt-2 text-sm text-[var(--primary)] hover:underline">
                Create a quotation to get started →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {workflowStages.map(stage => {
                const data = workflowSummary[stage] || { completed: 0, total: 0 };
                const percentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium text-[var(--foreground)] truncate">{stage}</div>
                    <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-xs text-[var(--muted-foreground)] text-right">
                      {data.completed}/{data.total}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quotation Stats" description="Overview of quotation status">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl bg-[var(--secondary)]/50 p-4 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.totalQuotations}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            </div>
            <div className="rounded-xl bg-[var(--success)]/10 p-4 text-center">
              <p className="text-2xl font-bold text-[var(--success)]">{stats.confirmedQuotations}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Confirmed</p>
            </div>
            <div className="rounded-xl bg-[var(--warning)]/10 p-4 text-center">
              <p className="text-2xl font-bold text-[var(--warning)]">{stats.pendingQuotations}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Pending</p>
            </div>
          </div>
          <Link 
            href="/quotations"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--primary)]/90"
          >
            View All Quotations →
          </Link>
        </SectionCard>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recent Orders" description="Latest orders created">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-[var(--muted-foreground)]">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <Link 
                  key={order.id} 
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-3 transition-all hover:bg-[var(--secondary)]/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--primary)] text-sm">{order.order_number}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${paymentStatusColors[order.payment_status] || paymentStatusColors.Pending}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{order.customer_name} • {order.event_type}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(order.total_amount || 0)}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{formatDate(order.created_at)}</p>
                  </div>
                </Link>
              ))}
              <Link 
                href="/orders"
                className="block text-center text-sm text-[var(--primary)] hover:underline py-2"
              >
                View all orders →
              </Link>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Quotations" description="Latest quotations created">
          {recentQuotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-[var(--muted-foreground)]">No quotations yet</p>
              <Link href="/customers/new" className="mt-2 text-sm text-[var(--primary)] hover:underline">
                Create your first quotation →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuotations.map(quotation => (
                <div 
                  key={quotation.id} 
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)] text-sm">{quotation.quotation_number}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${quotationStatusColors[quotation.status] || quotationStatusColors.Pending}`}>
                        {quotation.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{quotation.customer_name} • {quotation.event_type}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(quotation.grand_total || 0)}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{formatDate(quotation.created_at)}</p>
                  </div>
                </div>
              ))}
              <Link 
                href="/quotations"
                className="block text-center text-sm text-[var(--primary)] hover:underline py-2"
              >
                View all quotations →
              </Link>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
