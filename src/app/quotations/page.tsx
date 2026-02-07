"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, workflowStages } from "@/lib/constants";

interface Quotation {
  id: string;
  quotation_number: string;
  event_type: string;
  event_date: string | null;
  event_city: string | null;
  total_amount: number;
  status: string;
  order_id: string | null;
  valid_until: string | null;
  created_at: string;
  customers: {
    name: string;
    phone: string;
  } | null;
}

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Declined: "bg-red-100 text-red-700 border-red-200",
};

export default function QuotationsListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filter, setFilter] = useState("All");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Fetch quotations from Supabase
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
          event_type,
          event_date,
          event_city,
          total_amount,
          status,
          order_id,
          valid_until,
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
        // Fix: customers is returned as an array, but Quotation expects an object or null
        setQuotations(
          (data || []).map((q: any) => ({
            ...q,
            customers: Array.isArray(q.customers) ? (q.customers[0] || null) : q.customers ?? null,
          }))
        );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // WhatsApp integration
  const sendWhatsAppNotification = (phone: string, message: string) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    if (cleanPhone.length < 10) return;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    try {
      const w = window.open(url, '_blank');
      if (!w) window.location.href = url;
      else setTimeout(() => { try { w.focus(); } catch (e) {} }, 500);
    } catch (e) {
      window.location.href = url;
    }
  };

  // Generate quotation-specific WhatsApp message with custom templates
  const generateQuotationMessage = (
    customerName: string,
    quotationNumber: string,
    quotationStatus: string,
    amount: number,
    eventType: string = "event",
    eventDate: string = "",
    validUntil: string = ""
  ): string => {
    const currency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
    
    // Get custom message from localStorage if available
    let customMessages: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("whatsapp_messages");
      customMessages = saved ? JSON.parse(saved) : {};
    }

    const defaultQuotationMessages: Record<string, string> = {
      "Quotation Pending": `Hi {customerName},\n\nWe've prepared a quotation for your {eventType}.\n\nQuotation #: {quotationNumber}\nTotal Amount: {quotationAmount}\nValid Until: {validUntil}\n\nPlease review and let us know if you have any questions.\n\n- Aura Knot`,
      "Quotation Confirmed": `Hi {customerName},\n\nThank you for confirming Quotation #{quotationNumber}!\n\n✓ Booking Confirmed\nAmount: {quotationAmount}\n\nWe're excited to capture your {eventType}. Our team will be in touch with the next steps.\n\n- Aura Knot`,
      "Quotation Declined": `Hi {customerName},\n\nWe received that you've declined Quotation #{quotationNumber}.\n\nWe hope to work with you in the future. If you'd like to discuss alternative options, feel free to reach out!\n\n- Aura Knot`
    };

    // Use custom message if available, otherwise use default
    let template = customMessages[quotationStatus] || defaultQuotationMessages[quotationStatus] || "";

    // Replace placeholders with actual values
    template = template
      .replace(/{customerName}/g, customerName)
      .replace(/{quotationNumber}/g, quotationNumber)
      .replace(/{quotationAmount}/g, currency(amount))
      .replace(/{eventType}/g, eventType)
      .replace(/{validUntil}/g, validUntil);

    return template;
  };

  // Send WhatsApp message for quotation status
  const handleSendQuotationWhatsApp = (quotation: Quotation) => {
    if (!quotation.customers?.phone) {
      alert("Customer phone number not found");
      return;
    }
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const pdfUrl = `${origin}/quotations/${quotation.id}/pdf`;
    const message = `Hi ${quotation.customers.name || ''},\n\nYou can view and download your quotation here:\n${pdfUrl}\n\nQuotation #: ${quotation.quotation_number}\nTotal: ₹${quotation.total_amount.toLocaleString('en-IN')}`;
    sendWhatsAppNotification(quotation.customers.phone, message);
  };

  // Confirm quotation - creates order
  const handleConfirm = async (quotation: Quotation) => {
    if (!supabase) return;
    
    setConfirmingId(quotation.id);
    
    try {
      // First update status to Pending (intermediate step)
      const { error: updateError } = await supabase
        .from("quotations")
        .update({ status: "Pending" })
        .eq("id", quotation.id)
        .eq("status", "Draft");
      
      if (updateError && !updateError.message.includes("0 rows")) {
        throw updateError;
      }
      
      // Get the quotation with all details for snapshot
      const { data: quotationData, error: fetchError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotation.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Get customer data
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", quotationData.customer_id)
        .single();
      
      // Get quotation items
      const { data: quotationItems } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);
      
      // Generate order number
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1);
      
      const year = new Date().getFullYear().toString().slice(-2);
      let nextNum = 1;
      if (lastOrder && lastOrder.length > 0) {
        const match = lastOrder[0].order_number.match(/_(\d{4})$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const orderNumber = `ORD_AKP_${year}_${nextNum.toString().padStart(4, "0")}`;

      // Initialize workflow status with all stages set to "No"
      const initialWorkflow: Record<string, string> = {};
      workflowStages.forEach(s => { initialWorkflow[s] = "No"; });
      
      // Create order with snapshot data
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          quotation_id: quotation.id,
          customer_id: quotationData.customer_id,
          customer_name: customerData?.name || null,
          customer_phone: customerData?.phone || null,
          customer_email: customerData?.email || null,
          event_type: quotationData.event_type,
          event_date: quotationData.event_date,
          event_end_date: quotationData.event_end_date,
          event_venue: quotationData.event_venue,
          event_city: quotationData.event_city,
          package_type: quotationData.package_type,
          photo_type: quotationData.photo_type,
          photo_area: quotationData.photo_area,
          photo_cameras: quotationData.photo_cameras,
          photo_rate: quotationData.photo_rate,
          photo_session: quotationData.photo_session,
          video_type: quotationData.video_type,
          video_area: quotationData.video_area,
          video_cameras: quotationData.video_cameras,
          video_rate: quotationData.video_rate,
          video_session: quotationData.video_session,
          num_albums: quotationData.num_albums,
          sheets_per_album: quotationData.sheets_per_album,
          total_photos: quotationData.total_photos,
          album_size: quotationData.album_size,
          mini_books: quotationData.mini_books,
          calendars: quotationData.calendars,
          frames: quotationData.frames,
          subtotal: quotationData.subtotal,
          discount_percent: quotationData.discount_percent,
          discount_amount: quotationData.discount_amount,
          tax_amount: quotationData.tax_amount,
          total_amount: quotationData.total_amount,
          balance_due: quotationData.total_amount,
          status: "Confirmed",
          payment_status: "Pending",
          workflow_status: JSON.stringify(initialWorkflow),
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Copy quotation items to order items
      if (quotationItems && quotationItems.length > 0) {
        const orderItems = quotationItems.map((item) => ({
          order_id: newOrder.id,
          quotation_item_id: item.id,
          service_id: item.service_id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));
        
        await supabase.from("order_items").insert(orderItems);
      }
      
      // Update quotation with order link and confirmed status
      await supabase
        .from("quotations")
        .update({
          status: "Confirmed",
          order_id: newOrder.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", quotation.id);
      
      // Ask user if they want to send WhatsApp notification
      if (quotation.customers?.phone && confirm(`Booking confirmed!\n\nWould you like to send a WhatsApp confirmation to ${quotation.customers.name}?`)) {
        const whatsappMessage = generateQuotationMessage(
          quotation.customers.name,
          quotation.quotation_number,
          "Quotation Confirmed",
          quotation.total_amount,
          quotation.event_type,
          quotation.event_date ? formatDate(quotation.event_date) : "",
          quotation.valid_until ? formatDate(quotation.valid_until) : ""
        );
        sendWhatsAppNotification(quotation.customers.phone, whatsappMessage);
      }
      
      // Refresh list and redirect to order
      await fetchQuotations();
      router.push(`/orders/${newOrder.id}`);
      
    } catch (error) {
      console.error("Error confirming quotation:", error);
      alert("Failed to confirm quotation. Please try again.");
    } finally {
      setConfirmingId(null);
    }
  };

  // Open decline modal
  const handleDeclineClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDeclineReason("");
    setShowDeclineModal(true);
  };

  // Decline quotation
  const handleDecline = async () => {
    if (!supabase || !selectedQuotation) return;
    
    setDecliningId(selectedQuotation.id);
    
    try {
      const { error } = await supabase
        .from("quotations")
        .update({
          status: "Declined",
          declined_at: new Date().toISOString(),
          decline_reason: declineReason || null,
        })
        .eq("id", selectedQuotation.id)
        .in("status", ["Draft", "Pending"]);
      
      if (error) throw error;
      
      // Ask user if they want to send WhatsApp notification
      if (selectedQuotation.customers?.phone && confirm(`Would you like to send a WhatsApp message to ${selectedQuotation.customers.name}?`)) {
        const whatsappMessage = generateQuotationMessage(
          selectedQuotation.customers.name,
          selectedQuotation.quotation_number,
          "Quotation Declined",
          selectedQuotation.total_amount,
          selectedQuotation.event_type,
          selectedQuotation.event_date ? formatDate(selectedQuotation.event_date) : "",
          selectedQuotation.valid_until ? formatDate(selectedQuotation.valid_until) : ""
        );
        sendWhatsAppNotification(selectedQuotation.customers.phone, whatsappMessage);
      }
      
      await fetchQuotations();
      setShowDeclineModal(false);
      setSelectedQuotation(null);
      
    } catch (error) {
      console.error("Error declining quotation:", error);
      alert("Failed to decline quotation. Please try again.");
    } finally {
      setDecliningId(null);
    }
  };

  // Mark quotation as Pending
  const handleMarkAsPending = async (quotation: Quotation) => {
    if (!supabase) return;
    
    setPendingId(quotation.id);
    
    try {
      const { error } = await supabase
        .from("quotations")
        .update({ status: "Pending" })
        .eq("id", quotation.id)
        .eq("status", "Draft");
      
      if (error) throw error;
      
      // Ask user if they want to send WhatsApp notification
      if (quotation.customers?.phone && confirm(`Would you like to send a WhatsApp message to ${quotation.customers.name} with the quotation?`)) {
        const whatsappMessage = generateQuotationMessage(
          quotation.customers.name,
          quotation.quotation_number,
          "Quotation Pending",
          quotation.total_amount,
          quotation.event_type,
          quotation.event_date ? formatDate(quotation.event_date) : "",
          quotation.valid_until ? formatDate(quotation.valid_until) : ""
        );
        sendWhatsAppNotification(quotation.customers.phone, whatsappMessage);
      }
      
      await fetchQuotations();
      
    } catch (error) {
      console.error("Error marking as pending:", error);
      alert("Failed to mark as pending. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  // Delete quotation
  const handleDeleteClick = (quotation: Quotation) => {
    setQuotationToDelete(quotation);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!supabase || !quotationToDelete) return;
    
    setDeletingId(quotationToDelete.id);
    
    try {
      // First delete quotation items
      const { error: itemsError } = await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", quotationToDelete.id);
      
      if (itemsError) throw itemsError;
      
      // Then delete the quotation
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", quotationToDelete.id);
      
      if (error) throw error;
      
      await fetchQuotations();
      setShowDeleteModal(false);
      setQuotationToDelete(null);
      
    } catch (error) {
      console.error("Error deleting quotation:", error);
      alert("Failed to delete quotation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Generate PDF for quotation
  const generatePDF = async (quotation: Quotation) => {
    if (!supabase) return;
    
    try {
      // Fetch full quotation data
      const { data: fullQuotation } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotation.id)
        .single();
      
      // Fetch quotation items
      const { data: items } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);
      
      // Fetch customer data
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", fullQuotation?.customer_id)
        .single();

      // Create PDF content using HTML
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Quotation - ${quotation.quotation_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #4F46E5; }
            .company-info { font-size: 12px; color: #666; margin-top: 5px; }
            .quotation-title { font-size: 24px; font-weight: bold; margin: 20px 0 10px; color: #1F2937; }
            .quotation-number { font-size: 14px; color: #4F46E5; font-weight: 600; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
            .info-box { background: #F9FAFB; padding: 20px; border-radius: 10px; border: 1px solid #E5E7EB; }
            .info-box h3 { font-size: 14px; color: #6B7280; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-box p { font-size: 14px; color: #1F2937; margin: 5px 0; }
            .info-box .highlight { font-weight: 600; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #4F46E5; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
            tr:nth-child(even) { background: #F9FAFB; }
            .amount { text-align: right; font-weight: 600; }
            .totals { margin-top: 20px; margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
            .totals-row.grand-total { border-bottom: none; background: #4F46E5; color: white; padding: 15px; border-radius: 8px; margin-top: 10px; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 20px; }
            .terms { margin-top: 30px; background: #FEF3C7; padding: 15px; border-radius: 8px; font-size: 12px; }
            .terms h4 { color: #92400E; margin-bottom: 10px; }
            .terms ul { margin-left: 20px; color: #78350F; }
            .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-draft { background: #E5E7EB; color: #374151; }
            .status-pending { background: #FEF3C7; color: #92400E; }
            .status-confirmed { background: #D1FAE5; color: #065F46; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎬 AURA KNOT MEDIA</div>
            <div class="company-info">Premium Wedding & Event Photography Services</div>
          </div>
          
          <div class="quotation-title">QUOTATION</div>
          <div class="quotation-number">${quotation.quotation_number}</div>
          <span class="status-badge status-${quotation.status.toLowerCase()}">${quotation.status}</span>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Customer Details</h3>
              <p class="highlight">${customer?.name || quotation.customers?.name || "—"}</p>
              <p>📞 ${customer?.phone || quotation.customers?.phone || "—"}</p>
              <p>📧 ${customer?.email || "—"}</p>
              <p>📍 ${customer?.city || "—"}</p>
            </div>
            <div class="info-box">
              <h3>Event Details</h3>
              <p class="highlight">${fullQuotation?.event_type || quotation.event_type}</p>
              <p>📅 ${formatDate(quotation.event_date)}</p>
              <p>📍 ${fullQuotation?.event_venue || "—"}, ${quotation.event_city || "—"}</p>
              <p>📦 Package: ${fullQuotation?.package_type || "Custom"}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(items || []).map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.category}</td>
                  <td>${item.quantity}</td>
                  <td class="amount">₹${(item.unit_price || 0).toLocaleString("en-IN")}</td>
                  <td class="amount">₹${(item.total_price || 0).toLocaleString("en-IN")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>₹${(fullQuotation?.subtotal || 0).toLocaleString("en-IN")}</span>
            </div>
            ${fullQuotation?.discount_amount > 0 ? `
            <div class="totals-row">
              <span>Discount (${fullQuotation?.discount_percent || 0}%)</span>
              <span>-₹${(fullQuotation?.discount_amount || 0).toLocaleString("en-IN")}</span>
            </div>
            ` : ""}
            <div class="totals-row grand-total">
              <span>Grand Total</span>
              <span>₹${(quotation.total_amount || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
          
          <div class="terms">
            <h4>📋 Terms & Conditions</h4>
            <ul>
              <li>50% advance payment required to confirm booking</li>
              <li>Balance payment due before album delivery</li>
              <li>This quotation is valid for 15 days from the date of issue</li>
              <li>Prices are subject to change without prior notice</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing Aura Knot Media!</p>
            <p>For queries, contact us at: support@auraknotmedia.com | +91 98765 43210</p>
          </div>
        </body>
        </html>
      `;

      // Open print dialog with the PDF content
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Filter quotations
  const filteredQuotations = quotations.filter((q) => {
    if (filter !== "All" && q.status !== filter) return false;
    if (searchId && !q.quotation_number.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (searchName && !q.customers?.name?.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === "Draft").length,
    pending: quotations.filter((q) => q.status === "Pending").length,
    confirmed: quotations.filter((q) => q.status === "Confirmed").length,
    declined: quotations.filter((q) => q.status === "Declined").length,
  };

  const inputClass = "h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <div className="flex flex-col gap-4 xs:gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 xs:gap-4 xs:flex-row xs:items-start xs:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Sales Pipeline</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Quotations</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Prominent totals card - visible on sm+ next to header (no New button) */}
          <div className="hidden sm:flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-md w-72 md:w-96">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--muted-foreground)]">Total Quotations</div>
                <div className="text-2xl md:text-3xl font-extrabold">{stats.total}</div>
              </div>
              <div className="text-2xl md:text-3xl">📄</div>
            </div>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="text-xs text-[var(--muted-foreground)]">Total Value</div>
              <div className="text-lg md:text-2xl font-bold">₹{quotations.reduce((sum, q) => sum + (q.total_amount || 0), 0).toLocaleString("en-IN")}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold">{stats.draft}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Draft</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.pending}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.confirmed}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.declined}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Declined</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Stats Overview - Clear Total Display (mobile only) */}
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-r from-indigo-500 to-purple-600 p-4 xs:p-6 text-white md:hidden">
        <div className="flex flex-col xs:flex-row flex-wrap items-center justify-between gap-2 xs:gap-4">
          <div>
            <p className="text-sm text-white/80">Total Quotations</p>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>
          <div className="h-12 w-px bg-white/20 hidden sm:block"></div>
          <div>
            <p className="text-sm text-white/80">Total Value</p>
            <p className="text-3xl font-bold">₹{quotations.reduce((sum, q) => sum + (q.total_amount || 0), 0).toLocaleString("en-IN")}</p>
          </div>
          <div className="h-12 w-px bg-white/20 hidden sm:block"></div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-white/80">Draft</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-white/80">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.confirmed}</p>
              <p className="text-xs text-white/80">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.declined}</p>
              <p className="text-xs text-white/80">Declined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
      </div>

      {/* Search & Filters */}
      <SectionCard title="Search & Filter" description="Find quotations quickly">
        <div className="grid gap-2 xs:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Search by Quotation ID</label>
            <input
              type="text"
              placeholder="QT_AKP_26_0001"
              className={inputClass}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Search by Customer Name</label>
            <input
              type="text"
              placeholder="Customer name..."
              className={inputClass}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchId("");
                setSearchName("");
                setFilter("All");
              }}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Quotations List */}
      <SectionCard title={`Quotations (${filteredQuotations.length})`} description="Manage your quotations">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-[var(--secondary)] p-4 mb-4">
              <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[var(--muted-foreground)]">No quotations found</p>
            <Link
              href="/customers/new"
              className="mt-4 text-sm font-medium text-indigo-500 hover:underline"
            >
              Create your first quotation →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Quotation ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Valid Until</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-[var(--secondary)]/50 transition-colors">
                    <td className="px-4 py-4">
                      <Link
                        href={`/quotation?editId=${quotation.id}`}
                        className="font-mono text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {quotation.quotation_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{quotation.customers?.name || "—"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{quotation.customers?.phone || ""}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-[var(--foreground)]">{quotation.event_type}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {formatDate(quotation.event_date)}
                          {quotation.event_city && ` • ${quotation.event_city}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-[var(--foreground)]">
                        ₹{quotation.total_amount.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[quotation.status] || statusColors.Draft}`}>
                        {quotation.status}
                      </span>
                      {quotation.order_id && (
                        <Link
                          href={`/orders/${quotation.order_id}`}
                          className="ml-2 text-xs text-indigo-500 hover:underline"
                        >
                          View Order →
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${
                        quotation.valid_until && new Date(quotation.valid_until) < new Date()
                          ? "text-red-500"
                          : "text-[var(--muted-foreground)]"
                      }`}>
                        {formatDate(quotation.valid_until)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/quotation?editId=${quotation.id}`}
                          className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          Edit
                        </Link>

                        <Link
                          href={`/quotations/${quotation.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          View PDF
                        </Link>

                        {quotation.status === 'Confirmed' && quotation.order_id && (
                          <Link
                            href={`/orders/${quotation.order_id}`}
                            className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                          >
                            View Order
                          </Link>
                        )}

                        {quotation.status === 'Draft' && (
                          <button
                            onClick={() => handleMarkAsPending(quotation)}
                            disabled={pendingId === quotation.id}
                            className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
                          >
                            {pendingId === quotation.id ? 'Processing...' : 'Mark as Pending'}
                          </button>
                        )}

                        {(quotation.status === 'Draft' || quotation.status === 'Pending') && (
                          <>
                            <button
                              onClick={() => handleConfirm(quotation)}
                              disabled={confirmingId === quotation.id}
                              className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
                            >
                              {confirmingId === quotation.id ? 'Processing...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => handleDeclineClick(quotation)}
                              disabled={decliningId === quotation.id}
                              className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {quotation.customers?.phone && (
                          <button
                            onClick={() => handleSendQuotationWhatsApp(quotation)}
                            className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                          >
                            Send WhatsApp
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteClick(quotation)}
                          disabled={deletingId === quotation.id}
                          className="text-sm px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
                        >
                          {deletingId === quotation.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Decline Modal */}
      {showDeclineModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Decline Quotation</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Are you sure you want to decline <span className="font-mono">{selectedQuotation.quotation_number}</span>?
            </p>
            
            <div className="mt-4">
              <label className="text-sm font-medium text-[var(--foreground)]">Reason (optional)</label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                rows={3}
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setSelectedQuotation(null);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={decliningId === selectedQuotation.id}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {decliningId === selectedQuotation.id ? "Declining..." : "Decline Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && quotationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600">⚠️ Delete Quotation</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Are you sure you want to permanently delete quotation <span className="font-mono font-semibold">{quotationToDelete.quotation_number}</span>?
            </p>
            <p className="mt-2 text-sm text-red-500">
              This action cannot be undone. All associated items will also be deleted.
            </p>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQuotationToDelete(null);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === quotationToDelete.id}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deletingId === quotationToDelete.id ? "Deleting..." : "Delete Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
