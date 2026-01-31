"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

const statusColors: Record<string, string> = {
  Confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Completed: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

const paymentStatusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Partial: "bg-blue-100 text-blue-700 border-blue-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filter, setFilter] = useState("All");

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
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
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

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
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 xs:p-4 text-sm text-blue-700">
        <strong>ℹ️ How Orders Work:</strong> Orders are automatically created when a quotation is <strong>Confirmed</strong>. 
        Pending or Declined quotations do not create orders.
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
          </div>
        ) : (
          <div className="space-y-3 xs:space-y-4">
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
                  {/* Order Info Row */}
                  <div className="flex flex-col xs:flex-row flex-wrap items-start xs:items-center justify-between gap-2 xs:gap-4 px-2 xs:px-4 py-2 xs:py-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 xs:gap-4 min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-[var(--primary)] hover:underline truncate"
                      >
                        {order.order_number}
                      </Link>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--foreground)] truncate">{order.customers?.[0]?.name || "—"}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{order.customers?.[0]?.phone || ""}</p>
                      </div>
                    </div>
                    <div className="flex flex-col xs:flex-row items-end xs:items-center gap-2 xs:gap-4">
                      <div className="text-right min-w-[80px]">
                        <p className="text-[var(--foreground)]">{order.event_type}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(order.event_date)}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="font-bold text-[var(--primary)]">₹{(order.final_budget || order.total_amount || 0).toLocaleString()}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusColors[order.payment_status] || paymentStatusColors.Pending}`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] whitespace-nowrap"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                  
                  {/* Workflow Status - Prominent Section */}
                  <div className={`px-2 xs:px-4 py-3 xs:py-4 ${allCompleted ? "bg-gradient-to-r from-[var(--success)]/10 to-[var(--success)]/5 border-t-2 border-[var(--success)]" : "bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 border-t-2 border-[var(--primary)]"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 xs:gap-3 mb-2 xs:mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${allCompleted ? "text-[var(--success)]" : "text-[var(--primary)]"}`}>📋</span>
                        <span className={`text-sm font-bold ${allCompleted ? "text-[var(--success)]" : "text-[var(--primary)]"}`}>
                          WORKFLOW STATUS
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-24 sm:w-32 rounded-full ${allCompleted ? "bg-[var(--success)]/20" : "bg-[var(--muted)]"} overflow-hidden`}>
                          <div 
                            className={`h-full rounded-full transition-all ${allCompleted ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`}
                            style={{ width: `${(completedStages / workflowStages.length) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${allCompleted ? "text-[var(--success)]" : "text-[var(--primary)]"}`}>
                          {completedStages}/{workflowStages.length}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 xs:gap-2">
                      {workflowStages.map((stage) => {
                        const status = workflowData[stage] || "No";
                        const isComplete = status === "Yes" || status === "Not Needed";
                        return (
                          <div
                            key={stage}
                            className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                              isComplete 
                                ? "bg-[var(--success)]/10 border-2 border-[var(--success)] shadow-sm" 
                                : "bg-[var(--danger)]/10 border-2 border-[var(--danger)]/50 shadow-sm"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm text-white mb-1 ${isComplete ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`}>
                              {isComplete ? "✓" : "✗"}
                            </span>
                            <span className={`text-[10px] font-semibold leading-tight ${isComplete ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
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
