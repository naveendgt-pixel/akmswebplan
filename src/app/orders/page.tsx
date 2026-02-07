"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { workflowStages, formatDate } from "@/lib/constants";

interface Order {
  id: string;
  order_number: string;
  event_type: string;
  event_date: string | null;
  event_city: string | null;
  total_amount: number;
  final_budget: number | null;
  status: string;
  payment_status: string;
  delivery_status: string;
  workflow_status: string | null;
  created_at: string;
  quotation_id: string | null;
  customers: {
    name: string;
    phone: string;
  }[] | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

// statusColors defined previously but not currently used in UI — removed to avoid lint warnings

const paymentStatusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Partial: "bg-blue-100 text-blue-700 border-blue-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filter, setFilter] = useState("All");
  const [, setShowCreateModal] = useState(false);

  // Create order form state
  // Order creation state removed (not currently used in this view)

  // Send order details via WhatsApp
  const sendOrderWhatsApp = (order: Order) => {
    const phone = order.customers?.[0]?.phone || "";
    if (!phone) return alert("Customer phone not available");
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    if (cleanPhone.length < 10) return alert('Invalid customer phone number');

    const message = `Hello ${order.customers?.[0]?.name || ''},\n\nYour order ${order.order_number} is ready.\nTotal: ₹${(order.final_budget || order.total_amount || 0).toLocaleString('en-IN')}\nEvent: ${order.event_type} on ${formatDate(order.event_date)}\n\nView: ${typeof window !== 'undefined' ? window.location.origin + '/orders/' + order.id : '/orders/' + order.id}`;
    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    try {
      const w = window.open(url, '_blank');
      if (!w) window.location.href = url;
      else setTimeout(() => { try { w.focus(); } catch (e) {} }, 500);
    } catch (e) {
      window.location.href = url;
    }
  };

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        console.log("Supabase not configured");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching orders...");
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("Orders response:", { data, error });

        if (error) {
          console.error("Error fetching orders:", error.message || error);
        } else {
          // Map data to include customers array format for compatibility
          const mappedData = (data || []).map(o => ({
            ...o,
            customers: o.customer_name ? [{ name: o.customer_name, phone: o.customer_phone || "" }] : null
          }));
          console.log("Mapped orders:", mappedData);
          setOrders(mappedData);
        }

        // Fetch customers for create modal
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name, phone, email")
          .order("name", { ascending: true });
        setCustomers(customersData || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Order creation flow is currently not exposed in this view; helper functions removed to avoid unused-variable lint warnings.

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter !== "All" && o.status !== filter) return false;
    if (searchId && !o.order_number.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (searchName && !o.customers?.[0]?.name?.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 xs:gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 xs:flex-row xs:items-center xs:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Orders</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Workflow Tracking</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl"
        >
          + Create Order
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 xs:p-4 text-sm text-blue-700">
        <strong>ℹ️ How Orders Work:</strong> Orders are automatically created when a quotation is <strong>Confirmed</strong>, 
        or you can create one directly using the Create Order button above.
      </div>

      {/* Search & Filters */}
      <SectionCard title="Search & Filters" description="Find orders quickly">
        <div className="grid gap-2 xs:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Order ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          <input
            placeholder="Customer Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["All", "Confirmed", "In Progress", "Completed", "Cancelled"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                filter === f
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Orders Table */}
      <SectionCard title="Orders" description="Track each workflow stage">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--muted-foreground)]">Loading orders...</div>
          </div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            ⚠️ Supabase not configured. Please set up your environment variables.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-4xl">📦</div>
            <p className="text-[var(--muted-foreground)]">No orders found</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Orders are created when quotations are confirmed.
            </p>
            <Link
              href="/quotations"
              className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Go to Quotations to confirm one →
            </Link>
            <button
              onClick={() => router.push("/quotations")}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Create Quotation/Order →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 px-3">
            <div className="min-w-[800px] space-y-3 xs:space-y-4">
            {filteredOrders.map((order) => {
              // Parse workflow status
              const workflowData: Record<string, string> = (() => {
                try {
                  return order.workflow_status ? JSON.parse(order.workflow_status) : {};
                } catch {
                  return {};
                }
              })();
              const completedStages = workflowStages.filter(s => workflowData[s] === "Yes" || workflowData[s] === "Not Needed").length;
              const allCompleted = completedStages === workflowStages.length;
              
              return (
                <div key={order.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2">
                    {/* Order ID column: individual visible column with Send action */}
                    <div className="flex flex-col items-start justify-center gap-2 min-w-[160px] px-2">
                      <Link href={`/orders/${order.id}`} className="font-semibold text-[var(--primary)] hover:underline whitespace-nowrap">{order.order_number}</Link>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{order.customers?.[0]?.name || '—'}</div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => sendOrderWhatsApp(order)}
                          className="text-xs px-2 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          Send
                        </button>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs px-2 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-4 min-w-0">
                      <div className="text-sm text-[var(--foreground)] whitespace-nowrap">{order.event_type} • {formatDate(order.event_date)}</div>
                      <div className="text-sm font-bold text-[var(--primary)] whitespace-nowrap">₹{(order.final_budget || order.total_amount || 0).toLocaleString()}</div>
                      <div className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusColors[order.payment_status] || paymentStatusColors.Pending}`}>{order.payment_status}</div>

                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="h-2 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${allCompleted ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`} style={{ width: `${(completedStages / workflowStages.length) * 100}%` }} />
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{completedStages}/{workflowStages.length}</div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 hidden">
                      {/* preserved for layout parity (hidden as order id column now contains View) */}
                      <Link href={`/orders/${order.id}`} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] whitespace-nowrap">View</Link>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Stats */}
      <div className="grid gap-2 xs:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Orders</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">In Progress</p>
          <p className="text-2xl font-bold text-amber-600">
            {orders.filter((o) => o.status === "Confirmed" || o.status === "In Progress").length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {orders.filter((o) => o.status === "Completed").length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Value</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            ₹{orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
