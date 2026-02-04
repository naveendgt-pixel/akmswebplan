"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { workflowStages, formatDate } from "@/lib/constants";

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
  event_end_date?: string;
  balance_due?: number;
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
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        // Calculate date ranges based on selected period
        switch (period) {
          case "This Month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
          case "Last Month":
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
          case "This Quarter":
            const currentQuarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
            endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
            break;
          case "This Year":
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
          case "Last Year":
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
            break;
          case "Custom":
            startDate = customDateStart ? new Date(customDateStart) : new Date(now.getFullYear(), 0, 1);
            endDate = customDateEnd ? new Date(customDateEnd + "T23:59:59") : now;
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

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
          .select("amount, order_id");

        const allOrders = orders || [];
        const allQuotations = quotations || [];
        const allExpenses = expenses || [];

        // Outstanding balance and revenue - only count orders where event_end_date has passed
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper function to parse date string and normalize to start of day
        const getDateAtStartOfDay = (dateStr: string | null | undefined): Date | null => {
          if (!dateStr) return null;
          const date = new Date(dateStr);
          date.setHours(0, 0, 0, 0);
          return date;
        };

        // Filter all orders where event has ended
        const completedEvents = allOrders.filter(o => {
          const eventEndDate = o.event_end_date ? getDateAtStartOfDay(o.event_end_date) : (o.event_date ? getDateAtStartOfDay(o.event_date) : null);
          return eventEndDate && eventEndDate < today;
        });

        // Calculate stats only for completed events
        const totalOrders = completedEvents.length;
        const completedOrders = completedEvents.filter(o => {
          try {
            const workflow = o.workflow_status ? JSON.parse(o.workflow_status) : {};
            // Order is completed only if ALL workflow stages are "Yes" (not "Not Needed" or "No")
            const allCompleted = workflowStages.every(s => {
              const status = workflow[s];
              return status === "Yes";
            });
            return allCompleted;
          } catch {
            return false;
          }
        }).length;
        const pendingOrders = totalOrders - completedOrders;

        // Filter orders by period using event_date for accurate monthly/yearly reports
        const periodOrders = completedEvents.filter(o => {
          const orderDate = new Date(o.event_date || o.created_at);
          return orderDate >= startDate && orderDate <= endDate;
        });

        // For yearly revenue, use the selected period's date range
        const yearlyOrders = periodOrders;

        // Filter quotations by period using event_date
        const periodQuotations = allQuotations.filter(q => {
          const quotationDate = new Date(q.event_date || q.created_at);
          return quotationDate >= startDate && quotationDate <= endDate;
        });

        // Revenue calculation for completed period orders
        const completedPeriodOrders = periodOrders;

        // Revenue calculation for completed yearly orders
        const completedYearlyOrders = yearlyOrders;

        const monthlyRevenue = completedPeriodOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const yearlyRevenue = completedYearlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        // Filter expenses by completed orders only
        const completedOrderIds = new Set(completedYearlyOrders.map(o => o.id));
        const filteredExpenses = allExpenses.filter(e => e.order_id && completedOrderIds.has(e.order_id));
        const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalProfit = yearlyRevenue - totalExpensesAmount;

        // Outstanding balance - only count orders where event_end_date has passed
        const outstandingBalance = completedEvents.reduce((sum, o) => {
          return sum + (o.balance_due || 0);
        }, 0);

        const totalQuotations = periodQuotations.length;
        const confirmedQuotations = periodQuotations.filter(q => q.status === "Confirmed").length;
        const pendingQuotations = periodQuotations.filter(q => q.status === "Pending").length;

        // Calculate workflow summary
        const workflowStats: Record<string, { completed: number; total: number }> = {};
        workflowStages.forEach(stage => {
          workflowStats[stage] = { completed: 0, total: totalOrders };
        });

        completedEvents.forEach(order => {
          try {
            const workflow = order.workflow_status ? JSON.parse(order.workflow_status) : {};
            workflowStages.forEach(stage => {
              const status = workflow[stage];
              // Only count "Yes" as completed work (not "Not Needed" or "No")
              if (status === "Yes") {
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
  }, [period, customDateStart, customDateEnd]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
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
    <div className="flex flex-col gap-6 px-2 sm:px-4 max-w-7xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <img src="/Untitled-1.png" alt="Logo" className="h-10 w-10 rounded-lg shadow" />
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Dashboard</p>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Overview</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
            <option>Last Year</option>
            <option>Custom</option>
          </select>
          {period === "Custom" && (
            <>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
                placeholder="Start Date"
              />
              <span className="text-sm text-[var(--muted-foreground)]">to</span>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
                placeholder="End Date"
              />
            </>
          )}
        </div>
      </div>

      {!supabase && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          ⚠️ Supabase not configured. Please set up your environment variables to see real data.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={stats.totalOrders.toString()} trend="neutral" />
        <StatCard label="Pending Orders" value={stats.pendingOrders.toString()} helper="Workflow in progress" trend={stats.pendingOrders > 0 ? "down" : "neutral"} />
        <StatCard label="Completed Orders" value={stats.completedOrders.toString()} helper="All stages done" trend="up" />
        <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} trend={stats.outstandingBalance > 0 ? "down" : "up"} />
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
