"use client";

import { useState, useEffect } from "react";
import SectionCard from "@/components/SectionCard";
import { eventTypes, reportPeriods } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";

interface OrderSummary {
  id: string;
  order_number: string;
  customer_name: string;
  event_type: string;
  event_date: string;
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
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch report data
  const fetchReportData = async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (period) {
        case "This Week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "This Month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "Last Month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
          break;
      }

      // Build query
      let query = supabase.from("orders").select("id, order_number, customer_name, event_type, event_date, total_amount, amount_paid, balance_due, status");
      
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (eventType) {
        query = query.eq("event_type", eventType);
      }

      const { data: ordersData } = await query.order("created_at", { ascending: false });
      setOrders(ordersData || []);

      // Fetch expenses grouped by category
      const { data: expensesData } = await supabase.from("expenses").select("category, amount");
      
      // Group expenses by category
      const expenseMap: Record<string, number> = {};
      (expensesData || []).forEach((e: { category: string; amount: number }) => {
        expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
      });
      
      const expenseSummary = Object.entries(expenseMap).map(([category, total]) => ({ category, total }));
      setExpenses(expenseSummary);

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [period, eventType]);

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
  <title>${reportType === "pnl" ? "Profit & Loss Statement" : "Financial Summary"} - Aura Knot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .logo-sub { font-size: 12px; color: #64748b; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 20px; font-weight: bold; color: #1e293b; }
    .doc-period { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 600; color: #6366f1; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .summary-box { padding: 15px; border-radius: 8px; text-align: center; }
    .summary-revenue { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
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
      <div class="logo">Aura Knot</div>
      <div class="logo-sub">Photography & Events</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${reportType === "pnl" ? "PROFIT & LOSS STATEMENT" : "FINANCIAL SUMMARY"}</div>
      <div class="doc-period">Period: ${period || "All Time"} ${eventType ? `• ${eventType}` : ""}</div>
      <div class="doc-period">Generated: ${new Date().toLocaleDateString("en-IN")}</div>
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
              {reportPeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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
        <div className="mt-5 flex flex-wrap gap-3">
          <button 
            onClick={() => generatePDF("pnl")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            📄 Download P&L Report
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

      <SectionCard title="Available Reports" description="Profit & Loss and summary exports">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--secondary)]/30 to-transparent p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-lg">
              📈
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">Profit & Loss Statement</h3>
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
