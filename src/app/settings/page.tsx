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
  const [activeTab, setActiveTab] = useState<"payments" | "quotations" | "workflow" | "orders">("payments");
  const [whatsappSettings, setWhatsappSettings] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("whatsapp_settings");
    return saved ? JSON.parse(saved) : { order_completion: true };
  });

  const paymentAvailableFields = [
    { placeholder: "{customerName}", description: "Customer name" },
    { placeholder: "{orderNumber}", description: "Order ID" },
    { placeholder: "{paymentAmount}", description: "Payment amount received" },
    { placeholder: "{totalBudget}", description: "Total order budget" },
    { placeholder: "{balanceDue}", description: "Remaining balance" },
    { placeholder: "{paymentMethod}", description: "Payment method (Cash, UPI, etc.)" },
    { placeholder: "{eventType}", description: "Event type (Wedding, Reception, etc.)" },
    { placeholder: "{eventDate}", description: "Event date" },
  ];

  const quotationAvailableFields = [
    { placeholder: "{customerName}", description: "Customer name" },
    { placeholder: "{quotationNumber}", description: "Quotation ID" },
    { placeholder: "{quotationAmount}", description: "Total quotation amount" },
    { placeholder: "{eventType}", description: "Event type (Wedding, Reception, etc.)" },
    { placeholder: "{eventDate}", description: "Event date" },
    { placeholder: "{validUntil}", description: "Quotation validity date" },
  ];

  const workflowAvailableFields = [
    { placeholder: "{customerName}", description: "Customer name" },
    { placeholder: "{orderNumber}", description: "Order ID" },
    { placeholder: "{workflowStage}", description: "Workflow stage name" },
    { placeholder: "{eventType}", description: "Event type" },
  ];

  const orderCompletionAvailableFields = [
    { placeholder: "{customerName}", description: "Customer name" },
    { placeholder: "{orderNumber}", description: "Order ID" },
    { placeholder: "{eventType}", description: "Event type" },
  ];

  const availableFields = activeTab === "payments" ? paymentAvailableFields : activeTab === "quotations" ? quotationAvailableFields : activeTab === "workflow" ? workflowAvailableFields : orderCompletionAvailableFields;

  const defaultMessages: Record<string, string> = {
    "Initial Advance": `Hi {customerName},\n\nThank you for your Initial Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nTotal Budget: {totalBudget}\nBalance Remaining: {balanceDue}\n\nWe're excited to work on your {eventType}!\n\n- Aura Knot`,
    "Function Advance": `Hi {customerName},\n\nWe've received your Function Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nTotal Budget: {totalBudget}\nBalance Remaining: {balanceDue}\n\nWe're all set for your event!\n\n- Aura Knot`,
    "Printing Advance": `Hi {customerName},\n\nThank you for your Printing Advance payment of {paymentAmount} for Order #{orderNumber}.\n\nYour album printing will be prioritized!\n\nBalance Remaining: {balanceDue}\n\n- Aura Knot`,
    "Final Payment": `Hi {customerName},\n\nThank you for the Final Payment of {paymentAmount} for Order #{orderNumber}.\n\n✓ Payment Complete!\nTotal Paid: {totalBudget}\n\nYour deliverables will be prepared shortly.\n\n- Aura Knot`,
    "Other": `Hi {customerName},\n\nWe've received a payment of {paymentAmount} for Order #{orderNumber}.\n\nPayment Method: {paymentMethod}\nBalance Remaining: {balanceDue}\n\n- Aura Knot`,
    "Quotation Pending": `Hi {customerName},\n\nWe've prepared a quotation for your {eventType}.\n\nQuotation #: {quotationNumber}\nTotal Amount: {quotationAmount}\nValid Until: {validUntil}\n\nPlease review and let us know if you have any questions.\n\n- Aura Knot`,
    "Quotation Confirmed": `Hi {customerName},\n\nThank you for confirming Quotation #{quotationNumber}!\n\n✓ Booking Confirmed\nAmount: {quotationAmount}\n\nWe're excited to capture your {eventType}. Our team will be in touch with the next steps.\n\n- Aura Knot`,
    "Quotation Declined": `Hi {customerName},\n\nWe received that you've declined Quotation #{quotationNumber}.\n\nWe hope to work with you in the future. If you'd like to discuss alternative options, feel free to reach out!\n\n- Aura Knot`,
    "Photo Selection": `Hi {customerName},\n\n✓ Photo Selection Complete\n\nWe've completed the photo selection process for your {eventType}. The best shots are ready for the next phase!\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Album Design": `Hi {customerName},\n\n✓ Album Design Complete\n\nYour album design for {eventType} is ready! Our creative team has crafted beautiful layouts for your memories.\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Album Printing": `Hi {customerName},\n\n✓ Album Printing In Progress\n\nYour album is now being printed with premium quality. We're creating something special for your {eventType}!\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Video Editing": `Hi {customerName},\n\n✓ Video Editing Complete\n\nYour highlight video for {eventType} has been edited and is ready for delivery!\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Outdoor Shoot": `Hi {customerName},\n\n✓ Outdoor Shoot Scheduled\n\nWe've scheduled the outdoor photoshoot for your {eventType}. Our team is looking forward to capturing more beautiful moments!\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Album Delivery": `Hi {customerName},\n\n✓ Album Delivered\n\nYour beautiful album and deliverables are ready! Thank you for choosing Aura Knot for your {eventType}.\n\nOrder #{orderNumber}\n\n- Aura Knot`,
    "Order Completed": `Hi {customerName},\n\n🎉 Your Order is Complete!\n\nThank you for trusting Aura Knot Photography for your {eventType}. All deliverables are ready for pickup/delivery.\n\nOrder #{orderNumber}\n\nWe'd love to hear from you! Please share your feedback.\n\n- Aura Knot`
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

      <SectionCard title="WhatsApp Integration" description="Customize notification messages">
        <div className="space-y-6">
          {/* Tabs for Payments, Quotations and Workflow */}
          <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
            <button
              onClick={() => setActiveTab("payments")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "payments"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              💰 Payment Messages
            </button>
            <button
              onClick={() => setActiveTab("quotations")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "quotations"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              📋 Quotation Messages
            </button>
            <button
              onClick={() => setActiveTab("workflow")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "workflow"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              🔄 Workflow Messages
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "orders"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              ✅ Order Completion
            </button>
          </div>

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

          {/* Message Type Messages */}
          <div className="space-y-4">
            {activeTab === "payments" && paymentTypes.map((paymentType) => (
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

            {activeTab === "quotations" && ["Quotation Pending", "Quotation Confirmed", "Quotation Declined"].map((quotationType) => (
              <div key={quotationType} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--foreground)]">{quotationType}</h4>
                  <div className="flex gap-2">
                    {editingType === quotationType ? (
                      <>
                        <button
                          onClick={() => handleSaveMessage(quotationType)}
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
                            setEditingType(quotationType);
                            setEditingMessage(getMessageContent(quotationType));
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetMessage(quotationType)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingType === quotationType ? (
                  <textarea
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className="w-full h-32 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Enter custom message..."
                  />
                ) : (
                  <div className="bg-[var(--secondary)]/50 rounded-lg p-3 text-sm whitespace-pre-wrap text-[var(--muted-foreground)] font-mono border border-[var(--border)]">
                    {getMessageContent(quotationType)}
                  </div>
                )}

                {whatsappMessages[quotationType] && editingType !== quotationType && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Using custom message
                  </div>
                )}
              </div>
            ))}

            {activeTab === "workflow" && ["Photo Selection", "Album Design", "Album Printing", "Video Editing", "Outdoor Shoot", "Album Delivery"].map((workflowStage) => (
              <div key={workflowStage} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[var(--foreground)]">{workflowStage}</h4>
                  <div className="flex gap-2">
                    {editingType === workflowStage ? (
                      <>
                        <button
                          onClick={() => handleSaveMessage(workflowStage)}
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
                            setEditingType(workflowStage);
                            setEditingMessage(getMessageContent(workflowStage));
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetMessage(workflowStage)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingType === workflowStage ? (
                  <textarea
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className="w-full h-32 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Enter custom message..."
                  />
                ) : (
                  <div className="bg-[var(--secondary)]/50 rounded-lg p-3 text-sm whitespace-pre-wrap text-[var(--muted-foreground)] font-mono border border-[var(--border)]">
                    {getMessageContent(workflowStage)}
                  </div>
                )}

                {whatsappMessages[workflowStage] && editingType !== workflowStage && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Using custom message
                  </div>
                )}
              </div>
            ))}

            {activeTab === "orders" && (
              <div className="space-y-4">
                {/* Order Completion WhatsApp Enable/Disable */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)]">WhatsApp Notifications</h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">Send message when order is marked as complete</p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...whatsappSettings, order_completion: !whatsappSettings.order_completion };
                        setWhatsappSettings(updated);
                        localStorage.setItem("whatsapp_settings", JSON.stringify(updated));
                      }}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        whatsappSettings.order_completion ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          whatsappSettings.order_completion ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {whatsappSettings.order_completion && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Enabled</p>
                  )}
                </div>

                {/* Order Completion Message Template */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-[var(--foreground)]">Order Completed Message</h4>
                    <div className="flex gap-2">
                      {editingType === "Order Completed" ? (
                        <>
                          <button
                            onClick={() => handleSaveMessage("Order Completed")}
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
                              setEditingType("Order Completed");
                              setEditingMessage(getMessageContent("Order Completed"));
                            }}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetMessage("Order Completed")}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                          >
                            Reset
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingType === "Order Completed" ? (
                    <textarea
                      value={editingMessage}
                      onChange={(e) => setEditingMessage(e.target.value)}
                      className="w-full h-32 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="Enter custom message..."
                    />
                  ) : (
                    <div className="bg-[var(--secondary)]/50 rounded-lg p-3 text-sm whitespace-pre-wrap text-[var(--muted-foreground)] font-mono border border-[var(--border)]">
                      {getMessageContent("Order Completed")}
                    </div>
                  )}

                  {whatsappMessages["Order Completed"] && editingType !== "Order Completed" && (
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Using custom message
                    </div>
                  )}
                </div>
              </div>
            )}
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
