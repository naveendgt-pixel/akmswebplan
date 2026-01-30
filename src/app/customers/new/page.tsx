"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { eventTypes, packageTypes, sessionTypes } from "@/lib/constants";

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  eventCity: string;
  packageType: string;
  session: string;
}

const initialForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  eventType: "",
  eventStartDate: "",
  eventEndDate: "",
  eventLocation: "",
  eventCity: "",
  packageType: "",
  session: "",
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Customer name is required" });
      return;
    }
    if (!form.phone.trim()) {
      setMessage({ type: "error", text: "Mobile number is required" });
      return;
    }
    if (!form.eventType) {
      setMessage({ type: "error", text: "Please select an event type" });
      return;
    }
    if (!form.eventStartDate) {
      setMessage({ type: "error", text: "Event start date is required" });
      return;
    }
    if (!form.eventLocation.trim()) {
      setMessage({ type: "error", text: "Event location is required" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (!supabase) {
        // No Supabase - redirect with form data in URL
        const params = new URLSearchParams({
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email,
          eventType: form.eventType,
          eventDate: form.eventStartDate,
          eventEndDate: form.eventEndDate,
          eventVenue: form.eventLocation,
          eventCity: form.eventCity,
          packageType: form.packageType,
          session: form.session,
        });
        router.push(`/quotation?${params.toString()}`);
        return;
      }

      // Save customer to Supabase
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          address: form.eventLocation,
          city: form.eventCity || null,
          source: "Walk-in",
        })
        .select()
        .single();

      if (customerError) {
        throw customerError;
      }

      // Redirect to quotation page with customer and event data
      const params = new URLSearchParams({
        customerId: customer.id,
        customerName: form.name,
        customerPhone: form.phone,
        eventType: form.eventType,
        eventDate: form.eventStartDate,
        eventEndDate: form.eventEndDate,
        eventVenue: form.eventLocation,
        eventCity: form.eventCity,
        packageType: form.packageType,
        session: form.session,
      });

      router.push(`/quotation?${params.toString()}`);

    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Error creating customer:", err.message);
      setMessage({ type: "error", text: err.message || "Failed to create customer" });
      setSaving(false);
    }
  };

  const inputClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
  const selectClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">New Customer</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Create Customer Profile</h2>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl border p-4 ${
          message.type === "success" 
            ? "border-green-200 bg-green-50 text-green-700" 
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <SectionCard title="Customer Details" description="Mandatory fields are marked with *">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Customer Name <span className="text-red-500">*</span></label>
            <input 
              placeholder="Enter full name"
              className={inputClass}
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Mobile Number <span className="text-red-500">*</span></label>
            <input 
              placeholder="+91 00000 00000"
              className={inputClass}
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Email <span className="text-[var(--muted-foreground)]">(Optional)</span></label>
            <input 
              type="email"
              placeholder="email@example.com"
              className={inputClass}
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Type <span className="text-red-500">*</span></label>
            <select 
              className={selectClass}
              value={form.eventType}
              onChange={(e) => handleChange("eventType", e.target.value)}
            >
              <option value="">Select event type</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Start Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              className={inputClass}
              value={form.eventStartDate}
              onChange={(e) => handleChange("eventStartDate", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event End Date</label>
            <input 
              type="date" 
              className={inputClass}
              value={form.eventEndDate}
              onChange={(e) => handleChange("eventEndDate", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event City</label>
            <input 
              placeholder="City name"
              className={inputClass}
              value={form.eventCity}
              onChange={(e) => handleChange("eventCity", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Package Type <span className="text-red-500">*</span></label>
            <select 
              className={selectClass}
              value={form.packageType}
              onChange={(e) => handleChange("packageType", e.target.value)}
            >
              <option value="">Select package</option>
              {packageTypes.map((pkg) => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Location <span className="text-red-500">*</span></label>
            <input 
              placeholder="Venue name and address"
              className={inputClass}
              value={form.eventLocation}
              onChange={(e) => handleChange("eventLocation", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Session <span className="text-red-500">*</span></label>
            <select 
              className={selectClass}
              value={form.session}
              onChange={(e) => handleChange("session", e.target.value)}
            >
              <option value="">Select session</option>
              {sessionTypes.map((session) => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 md:col-span-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Quotation"
              )}
            </button>
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 text-sm font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
