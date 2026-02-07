"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, workflowStages } from "@/lib/constants";

interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  event_type: string;
  event_date: string | null;
  event_city: string | null;
  event_venue: string | null;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  status: string;
  created_at: string;
  customers: {
    name: string;
    phone: string;
  } | null;
}

interface SupabaseQuotation {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  event_type: string;
  event_date: string | null;
  event_city: string | null;
  event_venue: string | null;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  status: string;
  created_at: string;
  customers: unknown;
}

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Declined: "bg-red-100 text-red-700 border-red-200",
};

export default function ServicesPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch quotations from Supabase
  useEffect(() => {
    const fetchQuotations = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("quotations")
          .select(`
            id,
            quotation_number,
            customer_id,
            event_type,
            event_date,
            event_city,
            event_venue,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            status,
            created_at,
            customers (
              name,
              phone
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching quotations:", error);
        } else {
          type SupabaseQuotationRow = Omit<Quotation, 'customers'> & {
            customers?: Array<{ name: string; phone: string }> | { name: string; phone: string } | null;
          };

          const rows = (data ?? []) as SupabaseQuotationRow[];
          setQuotations(rows.map((q) => ({
              id: q.id,
              quotation_number: q.quotation_number,
              customer_id: q.customer_id,
              event_type: q.event_type,
              event_date: q.event_date ?? null,
              event_city: q.event_city ?? null,
              event_venue: q.event_venue ?? null,
              total_amount: q.total_amount ?? 0,
              subtotal: q.subtotal ?? 0,
              discount_amount: q.discount_amount ?? 0,
              tax_amount: q.tax_amount ?? 0,
              status: q.status ?? '',
              created_at: q.created_at,
              customers: Array.isArray(q.customers) ? (q.customers[0] ?? null) : (q.customers ?? null),
            }))
          );
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, []);

  // Filter quotations
  const filteredQuotations = quotations.filter((q) => {
    // Status filter
    if (filter !== "All" && q.status !== filter) return false;

    // Search filters
    if (searchId && !q.quotation_number.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (searchName && !q.customers?.name?.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchPhone && !q.customers?.phone?.includes(searchPhone)) return false;
    if (searchDate && q.event_date !== searchDate) return false;

    return true;
  });

  // Get next sequential number
  const getNextOrderNumber = async () => {
    if (!supabase) return `ORD_AKP_${new Date().getFullYear().toString().slice(-2)}_0001`;
    
    const { data } = await supabase
      .from("orders")
      .select("order_number")
      .order("created_at", { ascending: false })
      .limit(1);

    const year = new Date().getFullYear().toString().slice(-2);
    if (!data || data.length === 0) {
      return `ORD_AKP_${year}_0001`;
    }
    
    // Extract the number from the last order number
    const lastNumber = data[0].order_number;
    const match = lastNumber.match(/_(\d{4})$/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `ORD_AKP_${year}_${nextNum.toString().padStart(4, "0")}`;
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!selectedId) return;
    const selectedQuotation = quotations.find((q) => q.id === selectedId);
    if (!selectedQuotation) return;

    // Create a simple PDF content (in real app, use a PDF library)
    const content = `
AURA KNOT PHOTOGRAPHY
=======================

QUOTATION: ${selectedQuotation.quotation_number}
Date: ${formatDate(new Date().toISOString())}

CUSTOMER DETAILS
----------------
Name: ${selectedQuotation.customers?.name || "N/A"}
Phone: ${selectedQuotation.customers?.phone || "N/A"}

EVENT DETAILS
-------------
Type: ${selectedQuotation.event_type}
Date: ${formatDate(selectedQuotation.event_date)}
Venue: ${selectedQuotation.event_venue || "TBD"}
City: ${selectedQuotation.event_city || "TBD"}

PRICING
-------
Subtotal: ₹${(selectedQuotation.subtotal || 0).toLocaleString()}
Discount: ₹${(selectedQuotation.discount_amount || 0).toLocaleString()}
Tax: ₹${(selectedQuotation.tax_amount || 0).toLocaleString()}
-----------------------
TOTAL: ₹${(selectedQuotation.total_amount || 0).toLocaleString()}

Status: ${selectedQuotation.status}

Thank you for choosing Aura Knot!
    `.trim();

    // Download as text file (for now)
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedQuotation.quotation_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Edit quotation - redirect to quotation page with data
  const handleEdit = () => {
    if (!selectedId) return;
    const selectedQuotation = quotations.find((q) => q.id === selectedId);
    if (!selectedQuotation) return;

    // Redirect to quotation page with edit mode
    const params = new URLSearchParams({
      editId: selectedId,
      customerId: selectedQuotation.customer_id || "",
      customerName: selectedQuotation.customers?.name || "",
      customerPhone: selectedQuotation.customers?.phone || "",
      eventType: selectedQuotation.event_type,
      eventDate: selectedQuotation.event_date || "",
      eventVenue: selectedQuotation.event_venue || "",
      eventCity: selectedQuotation.event_city || "",
    });
    router.push(`/quotation?${params.toString()}`);
  };

  // Update quotation status and create order if confirmed
  const updateStatus = async (newStatus: string) => {
    if (!selectedId || !supabase) return;

    try {
      // Get the selected quotation details
      const selectedQuotation = quotations.find((q) => q.id === selectedId);
      if (!selectedQuotation) return;

      // Update quotation status
      const { error: updateError } = await supabase
        .from("quotations")
        .update({ status: newStatus })
        .eq("id", selectedId);

      if (updateError) {
        alert("Failed to update status: " + updateError.message);
        return;
      }

      // If status is "Confirmed", create an order
      if (newStatus === "Confirmed") {
        // Check if order already exists for this quotation
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("quotation_id", selectedId)
          .single();

        if (!existingOrder) {
          // Create new order with sequential number
          const orderNumber = await getNextOrderNumber();
          
          // Initialize workflow status with all stages set to "No"
          const initialWorkflow: Record<string, string> = {};
          workflowStages.forEach(s => { initialWorkflow[s] = "No"; });
          
          const { error: orderError } = await supabase
            .from("orders")
            .insert({
              order_number: orderNumber,
              quotation_id: selectedId,
              customer_id: selectedQuotation.customer_id,
              event_type: selectedQuotation.event_type,
              event_date: selectedQuotation.event_date,
              event_venue: selectedQuotation.event_venue,
              event_city: selectedQuotation.event_city,
              subtotal: selectedQuotation.subtotal || 0,
              discount_amount: selectedQuotation.discount_amount || 0,
              tax_amount: selectedQuotation.tax_amount || 0,
              total_amount: selectedQuotation.total_amount || 0,
              status: "Confirmed",
              payment_status: "Pending",
              delivery_status: "Pending",
              workflow_status: JSON.stringify(initialWorkflow),
            });

          if (orderError) {
            console.error("Failed to create order:", orderError);
            alert("Quotation confirmed but failed to create order: " + orderError.message);
          } else {
            alert(`Quotation confirmed! Order ${orderNumber} created.`);
          }
        } else {
          alert("Quotation confirmed! (Order already exists)");
        }
      }

      // Update local state
      setQuotations((prev) =>
        prev.map((q) => (q.id === selectedId ? { ...q, status: newStatus } : q))
      );
      setSelectedId(null);

    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Service & Deliverables</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Quotation Overview</h2>
        </div>
        <button
          onClick={() => router.push("/customers/new")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30"
        >
          + New Quotation
        </button>
      </div>

      <SectionCard title="Search & Filters" description="Locate quotations faster">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Quotation ID"
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
          <input
            placeholder="Mobile Number"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Draft", "Pending", "Confirmed", "Declined"].map((f) => (
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

      <SectionCard title="Quotations" description="Status and actions">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--muted-foreground)]">Loading quotations...</div>
          </div>
        ) : !supabase ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            ⚠️ Supabase not configured. Please set up your environment variables.
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-4xl">📋</div>
            <p className="text-[var(--muted-foreground)]">No quotations found</p>
            <button
              onClick={() => router.push("/customers/new")}
              className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Create your first quotation →
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Select</th>
                      <th className="whitespace-nowrap px-4 py-3">Quotation ID</th>
                      <th className="whitespace-nowrap px-4 py-3">Customer</th>
                      <th className="whitespace-nowrap px-4 py-3">Event Type</th>
                      <th className="whitespace-nowrap px-4 py-3">Event Date</th>
                      <th className="whitespace-nowrap px-4 py-3">Location</th>
                      <th className="whitespace-nowrap px-4 py-3">Amount</th>
                      <th className="whitespace-nowrap px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredQuotations.map((quote) => (
                      <tr
                        key={quote.id}
                        className={`transition-colors hover:bg-[var(--secondary)]/30 ${
                          selectedId === quote.id ? "bg-[var(--primary)]/5" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <input
                            type="radio"
                            name="selectedQuote"
                            checked={selectedId === quote.id}
                            onChange={() => setSelectedId(quote.id)}
                            className="h-4 w-4 accent-[var(--primary)]"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-semibold text-[var(--primary)] cursor-pointer hover:underline">
                            {quote.quotation_number}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {quote.customers?.name || "—"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {quote.customers?.phone || ""}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                          {quote.event_type}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                          {formatDate(quote.event_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">
                          {quote.event_city || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--foreground)]">
                          ₹{(quote.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              statusColors[quote.status] || statusColors.Draft
                            }`}
                          >
                            {quote.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => updateStatus("Confirmed")}
                disabled={!selectedId}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Confirm Quotation
              </button>
              <button
                onClick={() => updateStatus("Pending")}
                disabled={!selectedId}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏳ Mark as Pending
              </button>
              <button
                onClick={() => updateStatus("Declined")}
                disabled={!selectedId}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✗ Decline
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={!selectedId}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📄 Download PDF
              </button>
              <button
                onClick={handleEdit}
                disabled={!selectedId}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✏️ Edit
              </button>
            </div>
          </>
        )}
      </SectionCard>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Quotations</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{quotations.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {quotations.filter((q) => q.status === "Confirmed").length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {quotations.filter((q) => q.status === "Pending" || q.status === "Draft").length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Value</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            ₹{quotations.reduce((sum, q) => sum + (q.total_amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
