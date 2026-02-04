"use client";

import { useState } from "react";
import SectionCard from "@/components/SectionCard";
import { useTheme } from "@/lib/ThemeContext";
import { paymentTypes } from "@/lib/constants";

export default function SettingsPage() {
  const { theme, setTheme, colorTheme, setColorTheme, resolvedTheme } = useTheme();
  const [whatsappMessages, setWhatsappMessages] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("whatsapp_messages");
    return saved ? JSON.parse(saved) : {};
  });

  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState("");

  const availableFields = [
    { placeholder: "{customerName}", description: "Customer name" },
    { placeholder: "{orderNumber}", description: "Order ID" },
    { placeholder: "{paymentAmount}", description: "Payment amount received" },
    { placeholder: "{totalBudget}", description: "Total order budget" },
    { placeholder: "{balanceDue}", description: "Remaining balance" },
    { placeholder: "{paymentMethod}", description: "Payment method (Cash, UPI, etc.)" },
    { placeholder: "{eventType}", description: "Event type (Wedding, Reception, etc.)" },
    { placeholder: "{eventDate}", description: "Event date" },
  ];

  const defaultMessages: Record<string, string> = {
    "Initial Advance": `Hi {customerName},\n\nThank you for your Initial Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nTotal Budget: {totalBudget}\nBalance Remaining: {balanceDue}\n\nWe're excited to work on your {eventType}!\n\n- Aura Knot`,
    "Function Advance": `Hi {customerName},\n\nWe've received your Function Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nTotal Budget: {totalBudget}\nBalance Remaining: {balanceDue}\n\nWe're all set for your event!\n\n- Aura Knot`,
    "Printing Advance": `Hi {customerName},\n\nThank you for your Printing Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nYour album printing will be prioritized!\n\nBalance Remaining: {balanceDue}\n\n- Aura Knot`,
    "Final Payment": `Hi {customerName},\n\nThank you for the Final Payment of {paymentAmount} for Order #{orderNumber}.\n\n✓ Payment Complete!\nTotal Paid: {totalBudget}\n\nYour deliverables will be prepared shortly.\n\n- Aura Knot`,
    "Other": `Hi {customerName},\n\nWe've received a payment of {paymentAmount} for Order #{orderNumber}.\n\nPayment Method: {paymentMethod}\nBalance Remaining: {balanceDue}\n\n- Aura Knot`
  };

  const handleSaveMessage = (paymentType: string) => {
    const updated = { ...whatsappMessages, [paymentType]: editingMessage };
    setWhatsappMessages(updated);
    localStorage.setItem("whatsapp_messages", JSON.stringify(updated));
    setEditingType(null);
    alert("Message saved successfully!");
  };

  const handleResetMessage = (paymentType: string) => {
    if (confirm(`Reset ${paymentType} message to default?`)) {
      const updated = { ...whatsappMessages };
      delete updated[paymentType];
      setWhatsappMessages(updated);
      localStorage.setItem("whatsapp_messages", JSON.stringify(updated));
      alert("Message reset to default!");
    }
  };

  const getMessageContent = (paymentType: string) => {
    return whatsappMessages[paymentType] || defaultMessages[paymentType] || "";
  };

  const colorThemes = [
    { name: "Indigo", value: "indigo" as const, color: "bg-indigo-500" },
    { name: "Emerald", value: "emerald" as const, color: "bg-emerald-500" },
    { name: "Rose", value: "rose" as const, color: "bg-rose-500" },
    { name: "Amber", value: "amber" as const, color: "bg-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Settings</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Preferences</h2>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            resolvedTheme === "dark" 
              ? "bg-slate-800 text-slate-200" 
              : "bg-amber-100 text-amber-700"
          }`}>
            {resolvedTheme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </span>
        </div>
      </div>

      <SectionCard title="Appearance" description="Customize look and feel">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Theme Mode</label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Choose how the app looks</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "system" as const, label: "System", icon: "💻" },
                { value: "light" as const, label: "Light", icon: "☀️" },
                { value: "dark" as const, label: "Dark", icon: "🌙" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    theme === option.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Color Theme</label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Select your preferred accent color</p>
            <div className="flex flex-wrap gap-3">
              {colorThemes.map((ct) => (
                <button
                  key={ct.name}
                  onClick={() => setColorTheme(ct.value)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    colorTheme === ct.value 
                      ? "border-[var(--foreground)] shadow-lg" 
                      : "border-transparent"
                  }`}
                  title={ct.name}
                >
                  <span className={`h-7 w-7 rounded-full ${ct.color} shadow-lg ${
                    colorTheme === ct.value ? "ring-2 ring-offset-2 ring-[var(--foreground)]" : ""
                  }`} />
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Current: <span className="font-medium text-[var(--primary)] capitalize">{colorTheme}</span>
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Future Features" description="Coming soon">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/20 p-6">
            <div className="absolute -right-2 -top-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Soon
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)] text-lg">
              📦
            </div>
            <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">Packages & Rates</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Configure service packages and pricing templates
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/20 p-6">
            <div className="absolute -right-2 -top-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Soon
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)] text-lg">
              👥
            </div>
            <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">User Management</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Team access control and role-based permissions
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="WhatsApp Integration" description="Customize payment notification messages">
        <div className="space-y-6">
          {/* Available Fields Reference */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Available Message Fields</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableFields.map((field) => (
                <div key={field.placeholder} className="text-sm">
                  <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-mono text-xs">
                    {field.placeholder}
                  </code>
                  <span className="text-blue-700 dark:text-blue-300 ml-2">- {field.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Type Messages */}
          <div className="space-y-4">
            {paymentTypes.map((paymentType) => (
              <div key={paymentType} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--foreground)]">{paymentType}</h4>
                  <div className="flex gap-2">
                    {editingType === paymentType ? (
                      <>
                        <button
                          onClick={() => handleSaveMessage(paymentType)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingType(null)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingType(paymentType);
                            setEditingMessage(getMessageContent(paymentType));
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetMessage(paymentType)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingType === paymentType ? (
                  <textarea
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className="w-full h-32 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Enter custom message..."
                  />
                ) : (
                  <div className="bg-[var(--secondary)]/50 rounded-lg p-3 text-sm whitespace-pre-wrap text-[var(--muted-foreground)] font-mono border border-[var(--border)]">
                    {getMessageContent(paymentType)}
                  </div>
                )}

                {whatsappMessages[paymentType] && editingType !== paymentType && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Using custom message
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="About" description="Application information">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-2xl font-bold text-white shadow-lg shadow-[var(--primary)]/25">
            AK
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Aura Knot Photography</h3>
            <p className="mt-0.5 text-sm italic text-[var(--muted-foreground)]">
              &ldquo;Connecting moments, capturing essence&rdquo;
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Event Management System v1.0.0
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
