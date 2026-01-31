"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/constants";

interface Order {
  id: string;
  order_number: string;
  event_type: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  customers: {
    name: string;
    phone: string;
  } | null;
}

interface Payment {
  id: string;
  payment_number: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Expense {
  id: string;
  order_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  created_at: string;
}

const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"];
const paymentTypes = ["Initial Advance", "Function Advance", "Printing Advance", "Final Payment", "Other"];
const expenseCategories = ["Travel", "Equipment", "Staff", "Printing", "Album", "Frame", "Miscellaneous"];

export default function PaymentsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"payments" | "expenses">("payments");
  
  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    orderId: "",
    amount: 0,
    method: "Cash",
    type: "Initial Advance",
    reference: "",
    notes: "",
  });

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    orderId: "",
    description: "",
    amount: 0,
    category: "Miscellaneous",
    date: new Date().toISOString().split("T")[0],
  });

  const [saving, setSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        // Fetch orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            event_type,
            total_amount,
            amount_paid,
            balance_due,
            payment_status,
            customers (name, phone)
          `)
          .order("created_at", { ascending: false });

        setOrders(
          (ordersData || []).map((o: any) => ({
            ...o,
            customers: Array.isArray(o.customers) ? (o.customers[0] || null) : o.customers ?? null,
          }))
        );

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .order("created_at", { ascending: false });

        setPayments(paymentsData || []);

        // Fetch expenses (we'll create this table if needed)
        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .order("created_at", { ascending: false });

        setExpenses(expensesData || []);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate payment number
  const generatePaymentNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const count = payments.length + 1;
    return `PAY_AKP_${year}_${count.toString().padStart(4, "0")}`;
  };

  // Add payment
  const handleAddPayment = async () => {
    if (!supabase || !paymentForm.orderId || paymentForm.amount <= 0) {
      alert("Please select an order and enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const paymentNumber = generatePaymentNumber();
      const order = orders.find((o) => o.id === paymentForm.orderId);

      const { error } = await supabase.from("payments").insert({
        payment_number: paymentNumber,
        order_id: paymentForm.orderId,
        customer_id: order?.customers ? null : null, // Will be linked through order
        amount: paymentForm.amount,
        payment_method: paymentForm.method,
        payment_date: new Date().toISOString().split("T")[0],
        reference_number: paymentForm.reference || null,
        status: "Completed",
        notes: `${paymentForm.type}${paymentForm.notes ? ": " + paymentForm.notes : ""}`,
      });

      if (error) throw error;

      alert(`Payment ${paymentNumber} recorded successfully!`);
      setShowPaymentForm(false);
      setPaymentForm({ orderId: "", amount: 0, method: "Cash", type: "Initial Advance", reference: "", notes: "" });
      
      // Refresh data
      router.refresh();
      window.location.reload();

    } catch (err) {
      console.error("Error adding payment:", err);
      alert("Failed to add payment");
    } finally {
      setSaving(false);
    }
  };

  // Add expense
  const handleAddExpense = async () => {
    if (!supabase || !expenseForm.orderId || expenseForm.amount <= 0 || !expenseForm.description) {
      alert("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        order_id: expenseForm.orderId,
        description: expenseForm.description,
        amount: expenseForm.amount,
        category: expenseForm.category,
        expense_date: expenseForm.date,
      });

      if (error) throw error;

      alert("Expense recorded successfully!");
      setShowExpenseForm(false);
      setExpenseForm({ orderId: "", description: "", amount: 0, category: "Miscellaneous", date: new Date().toISOString().split("T")[0] });
      
      // Refresh
      window.location.reload();

    } catch (err) {
      console.error("Error adding expense:", err);
      alert("Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals per order
  const getOrderPaymentSummary = (orderId: string) => {
    const orderPayments = payments.filter((p) => p.order_id === orderId);
    const orderExpenses = expenses.filter((e) => e.order_id === orderId);
    const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = orderExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalPaid, totalExpenses, paymentCount: orderPayments.length };
  };

  // Filter by selected order
  const filteredPayments = selectedOrderId 
    ? payments.filter((p) => p.order_id === selectedOrderId)
    : payments;

  const filteredExpenses = selectedOrderId
    ? expenses.filter((e) => e.order_id === selectedOrderId)
    : expenses;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Payments & Expenses</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Financial Records</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentForm(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            + Add Payment
          </button>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Filter by Order */}
      <SectionCard title="Filter" description="Select an order to view its financial records">
        <div className="flex gap-4">
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">All Orders</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number} - {order.customers?.name || "Unknown"}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "payments"
              ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Payments ({filteredPayments.length})
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "expenses"
              ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Expenses ({filteredExpenses.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--muted-foreground)]">Loading...</div>
        </div>
      ) : !supabase ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          ⚠️ Supabase not configured.
        </div>
      ) : activeTab === "payments" ? (
        /* Payments Table */
        <SectionCard title="Payment Records" description="All received payments">
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-4xl">💰</div>
              <p className="text-[var(--muted-foreground)]">No payments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Payment ID</th>
                      <th className="whitespace-nowrap px-4 py-3">Order</th>
                      <th className="whitespace-nowrap px-4 py-3">Amount</th>
                      <th className="whitespace-nowrap px-4 py-3">Method</th>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                      <th className="whitespace-nowrap px-4 py-3">Reference</th>
                      <th className="whitespace-nowrap px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredPayments.map((payment) => {
                      const order = orders.find((o) => o.id === payment.order_id);
                      return (
                        <tr key={payment.id} className="hover:bg-[var(--secondary)]/30">
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--primary)]">
                            {payment.payment_number}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div>
                              <p className="font-medium">{order?.order_number || "—"}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{order?.customers?.name}</p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-600">
                            ₹{payment.amount.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                            {payment.reference_number || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] max-w-[200px] truncate">
                            {payment.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      ) : (
        /* Expenses Table */
        <SectionCard title="Expense Records" description="All project expenses">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 text-4xl">📊</div>
              <p className="text-[var(--muted-foreground)]">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Order</th>
                      <th className="whitespace-nowrap px-4 py-3">Description</th>
                      <th className="whitespace-nowrap px-4 py-3">Category</th>
                      <th className="whitespace-nowrap px-4 py-3">Amount</th>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredExpenses.map((expense) => {
                      const order = orders.find((o) => o.id === expense.order_id);
                      return (
                        <tr key={expense.id} className="hover:bg-[var(--secondary)]/30">
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="font-medium">{order?.order_number || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground)]">
                            {expense.description}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              {expense.category}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-red-600">
                            ₹{expense.amount.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                            {expense.expense_date}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Order Summary Cards */}
      <SectionCard title="Order Financial Summary" description="Budget overview per order">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const summary = getOrderPaymentSummary(order.id);
            const profit = summary.totalPaid - summary.totalExpenses;
            return (
              <div key={order.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-[var(--primary)]">{order.order_number}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    order.payment_status === "Paid" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : order.payment_status === "Partial"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-2">{order.customers?.name || "—"}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Estimated Budget:</span>
                    <span className="font-medium">₹{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Paid:</span>
                    <span className="font-medium text-emerald-600">₹{summary.totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Expenses:</span>
                    <span className="font-medium text-red-600">₹{summary.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1">
                    <span className="text-[var(--muted-foreground)]">Balance:</span>
                    <span className="font-medium text-amber-600">₹{order.balance_due.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Profit:</span>
                    <span className={`font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      ₹{profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Add Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Order *</label>
                <select
                  value={paymentForm.orderId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, orderId: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                >
                  <option value="">Select Order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.customers?.name} (Balance: ₹{order.balance_due.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount *</label>
                <input
                  type="number"
                  value={paymentForm.amount || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  placeholder="Enter amount"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Payment Type</label>
                  <select
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                    className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  >
                    {paymentTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reference Number</label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  placeholder="UPI ID, Cheque No, etc."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddPayment}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Payment"}
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Expense</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Order *</label>
                <select
                  value={expenseForm.orderId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, orderId: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                >
                  <option value="">Select Order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.customers?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  placeholder="What was the expense for?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount *</label>
                  <input
                    type="number"
                    value={expenseForm.amount || ""}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddExpense}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Expense"}
              </button>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Payments</p>
          <p className="text-2xl font-bold text-emerald-600">
            ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">
            ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Balance Due</p>
          <p className="text-2xl font-bold text-amber-600">
            ₹{orders.reduce((sum, o) => sum + o.balance_due, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Net Profit</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            ₹{(payments.reduce((sum, p) => sum + p.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
