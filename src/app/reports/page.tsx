"use client";

import { useState, useEffect, useCallback } from "react";
import SectionCard from "@/components/SectionCard";
import { eventTypes, formatDate } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";

interface OrderSummary {
  id: string;
  order_number: string;
  customer_name: string;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

interface ExpenseSummary {
  category: string;
  total: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("");
  const [eventType, setEventType] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);

  // Helper function to parse date string and normalize to start of day
  const getDateAtStartOfDay = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Fetch report data (memoized)
  const fetchReportData = useCallback(async () => {
    if (!supabase) return;

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date | null = null;
      let endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      
      // Handle custom date range
      if (period === "Custom") {
        if (customStartDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        switch (period) {
          case "This Week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "This Month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "Last Month":
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            endDate.setHours(23, 59, 59, 999);
            break;
          case "This Quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case "This Year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case "Last Year":
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
      }

      // Fetch all orders with event dates
      let query = supabase.from("orders").select("id, order_number, customer_name, event_type, event_date, event_end_date, total_amount, amount_paid, balance_due, status");

      if (eventType) {
        query = query.eq("event_type", eventType);
      }

      const ordersResp = await query.order("event_date", { ascending: false });
      const ordersData = (ordersResp.data ?? null) as OrderSummary[] | null;

      // Filter orders: only include completed events (event_end_date has passed)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedEventOrders = (ordersData || []).filter((o: OrderSummary) => {
        const eventEndDate = o.event_end_date ? getDateAtStartOfDay(o.event_end_date) : (o.event_date ? getDateAtStartOfDay(o.event_date) : null);
        return eventEndDate && eventEndDate < today;
      });

      // Filter by date range using event_date
      const periodFilteredOrders = completedEventOrders.filter(o => {
        const orderDate = new Date(o.event_date);
        orderDate.setHours(0, 0, 0, 0);
        return startDate ? (orderDate >= startDate && orderDate <= endDate) : true;
      });

      setOrders(periodFilteredOrders);

      // Fetch expenses related to completed orders only
      const completedOrderIds = new Set(periodFilteredOrders.map(o => o.id));
      const expensesResp = await supabase.from("expenses").select("category, amount, order_id");
      const expensesData = (expensesResp.data ?? []) as Array<{ category: string; amount: number; order_id?: string | null }>;

      // Filter expenses to only include those from completed orders in the period
      const filteredExpensesData = expensesData.filter(e => e.order_id && completedOrderIds.has(e.order_id));

      // Group expenses by category
      const expenseMap: Record<string, number> = {};
      filteredExpensesData.forEach((e) => {
        expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
      });
      
      const expenseSummary = Object.entries(expenseMap).map(([category, total]) => ({ category, total }));
      setExpenses(expenseSummary);

    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  }, [period, eventType, customStartDate, customEndDate]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchReportData();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchReportData]);

  // Calculate totals
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
  const totalPending = orders.reduce((sum, o) => sum + (o.balance_due || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Generate PDF Report
  const generatePDF = (reportType: "pnl" | "summary") => {
    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${reportType === "pnl" ? "Profit &amp; Loss Statement" : "Financial Summary"} - Aura Knot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #5b1e2d; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .logo-sub { font-size: 12px; color: #64748b; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 20px; font-weight: bold; color: #1e293b; }
    .doc-period { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 600; color: #5b1e2d; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .summary-box { padding: 15px; border-radius: 8px; text-align: center; }
    .summary-revenue { background: linear-gradient(135deg, #5b1e2d, #8b5cf6); color: white; }
    .summary-paid { background: #dcfce7; }
    .summary-expense { background: #fef2f2; }
    .summary-profit { background: ${netProfit >= 0 ? "#dbeafe" : "#fef2f2"}; }
    .summary-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
    .summary-label { font-size: 11px; opacity: 0.8; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .amount { text-align: right; }
    .total-row { font-weight: bold; background: #f1f5f9; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" style="display:block;margin-bottom:6px;" role="img" aria-label="Aura Knot">
        <text x="0" y="24" font-family="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" font-size="18" fill="#6366f1">Aura Knot</text>
      </svg>
      <div class="logo-sub">Photography &amp; Events</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${reportType === "pnl" ? "PROFIT &amp; LOSS STATEMENT" : "FINANCIAL SUMMARY"}</div>
      <div class="doc-period">Period: ${period || "All Time"} ${eventType ? `• ${eventType}` : ""}</div>
      <div class="doc-period">Generated: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box summary-revenue">
      <div class="summary-label">Total Revenue</div>
      <div class="summary-value">₹${totalRevenue.toLocaleString()}</div>
    </div>
    <div class="summary-box summary-paid">
      <div class="summary-label">Amount Received</div>
      <div class="summary-value positive">₹${totalPaid.toLocaleString()}</div>
    </div>
    <div class="summary-box summary-expense">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value negative">₹${totalExpenses.toLocaleString()}</div>
    </div>
    <div class="summary-box summary-profit">
      <div class="summary-label">Net ${netProfit >= 0 ? "Profit" : "Loss"}</div>
      <div class="summary-value ${netProfit >= 0 ? "positive" : "negative"}">₹${Math.abs(netProfit).toLocaleString()}</div>
    </div>
  </div>

  ${reportType === "pnl" ? `
  <div class="section">
    <div class="section-title">📈 Revenue Breakdown (${orders.length} Orders)</div>
    <table>
      <thead>
        <tr>
          <th>Order #</th>
          <th>Customer</th>
          <th>Event Type</th>
          <th class="amount">Amount</th>
          <th class="amount">Paid</th>
          <th class="amount">Pending</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td>${o.order_number}</td>
            <td>${o.customer_name || "—"}</td>
            <td>${o.event_type}</td>
            <td class="amount">₹${(o.total_amount || 0).toLocaleString()}</td>
            <td class="amount positive">₹${(o.amount_paid || 0).toLocaleString()}</td>
            <td class="amount ${(o.balance_due || 0) > 0 ? "negative" : ""}">₹${(o.balance_due || 0).toLocaleString()}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td class="amount">₹${totalRevenue.toLocaleString()}</td>
          <td class="amount positive">₹${totalPaid.toLocaleString()}</td>
          <td class="amount ${totalPending > 0 ? "negative" : ""}">₹${totalPending.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">💰 Expense Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.length > 0 ? expenses.map(e => `
          <tr>
            <td>${e.category}</td>
            <td class="amount negative">₹${e.total.toLocaleString()}</td>
          </tr>
        `).join("") : "<tr><td colspan='2' style='text-align: center; color: #64748b;'>No expenses recorded</td></tr>"}
        ${expenses.length > 0 ? `
        <tr class="total-row">
          <td>Total Expenses</td>
          <td class="amount negative">₹${totalExpenses.toLocaleString()}</td>
        </tr>
        ` : ""}
      </tbody>
    </table>
  </div>
  ` : `
  <div class="section">
    <div class="section-title">📊 Summary Overview</div>
    <table>
      <tbody>
        <tr>
          <td>Total Orders</td>
          <td class="amount">${orders.length}</td>
        </tr>
        <tr>
          <td>Total Revenue</td>
          <td class="amount">₹${totalRevenue.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Amount Collected</td>
          <td class="amount positive">₹${totalPaid.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Pending Collections</td>
          <td class="amount ${totalPending > 0 ? "negative" : ""}">₹${totalPending.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Total Expenses</td>
          <td class="amount negative">₹${totalExpenses.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td>Net ${netProfit >= 0 ? "Profit" : "Loss"}</td>
          <td class="amount ${netProfit >= 0 ? "positive" : "negative"}">₹${Math.abs(netProfit).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `}

  <div class="footer">
    <p>Aura Knot Photography • Confidential Financial Report</p>
  </div>
</body>
</html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Reports</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Financial Reports</h2>
        </div>
      </div>

      <SectionCard title="Generate Reports" description="Select period and event type">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Report Period</label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All Time</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
              <option value="Last Year">Last Year</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Type</label>
            <select 
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All Event Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        {period === "Custom" && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Start Date</label>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">End Date</label>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
        )}
          <div className="mt-5 flex flex-wrap gap-3">
          <button 
            onClick={() => generatePDF("pnl")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
              📄 Download P&amp;L Report
          </button>
          <button 
            onClick={() => generatePDF("summary")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100"
          >
            📊 Download Summary
          </button>
        </div>
      </SectionCard>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{orders.length} orders</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Amount Received</p>
          <p className="text-2xl font-bold text-[var(--success)]">₹{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{totalPending > 0 ? `₹${totalPending.toLocaleString()} pending` : "All collected"}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Expenses</p>
          <p className="text-2xl font-bold text-[var(--danger)]">₹{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{expenses.length} categories</p>
        </div>
        <div className={`rounded-xl border border-[var(--border)] p-4 ${netProfit >= 0 ? "bg-[var(--success)]/10" : "bg-[var(--danger)]/10"}`}>
          <p className="text-sm text-[var(--muted-foreground)]">Net {netProfit >= 0 ? "Profit" : "Loss"}</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>₹{Math.abs(netProfit).toLocaleString()}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margin` : "—"}</p>
        </div>
      </div>

      <SectionCard title="Available Reports" description="Profit &amp; Loss and summary exports">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--secondary)]/30 to-transparent p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-lg">
              📈
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">Profit &amp; Loss Statement</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Comprehensive income and expense breakdown with profit margins
            </p>
            <button 
              onClick={() => generatePDF("pnl")}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-[var(--primary)]/90"
            >
              Generate Report
            </button>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--secondary)]/30 to-transparent p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-lg">
              💰
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">Financial Summary</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Overview of revenue, expenses, and outstanding balances
            </p>
            <button 
              onClick={() => generatePDF("summary")}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-[var(--primary)]/90"
            >
              Generate Report
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
