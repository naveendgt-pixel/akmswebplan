"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/constants";

interface QuotationItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  customer_id: string;
  event_type: string;
  event_date: string | null;
  event_end_date: string | null;
  event_venue: string | null;
  event_city: string | null;
  package_type: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  status: string;
  valid_until: string | null;
  num_albums: number;
  sheets_per_album: number;
  total_photos: number;
  album_size: string | null;
  mini_books: number;
  mini_books_comp: boolean;
  calendars: number;
  calendars_comp: boolean;
  frames: number;
  frames_comp: boolean;
  cinematic_teaser: number;
  cinematic_teaser_comp: boolean;
  traditional_highlight_video: number;
  traditional_highlight_video_comp: boolean;
  cinematic_candid_video: number;
  cinematic_candid_video_comp: boolean;
  save_the_date: number;
  save_the_date_comp: boolean;
  e_invitation: number;
  e_invitation_comp: boolean;
  other_deliverable: string | null;
  other_deliverable_qty: number;
  other_deliverable_comp: boolean;
  created_at: string;
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
}

export default function QuotationPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [showPrices, setShowPrices] = useState(true);

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: quotationData, error: quotationError } = await supabase
          .from("quotations")
          .select(`
            *,
            customers (
              id,
              name,
              phone,
              email,
              address
            )
          `)
          .eq("id", resolvedParams.id)
          .single();

        if (quotationError) throw quotationError;

        const { data: itemsData, error: itemsError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", resolvedParams.id)
          .order("category", { ascending: true });

        if (itemsError) throw itemsError;

        setQuotation(quotationData);
        setItems(itemsData || []);
      } catch (error) {
        console.error("Error fetching quotation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [resolvedParams.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Normalize and group items by canonical category names to ensure consistent ordering
  const mapCategory = (raw: string | undefined) => {
    const c = (raw || "").toLowerCase();
    if (/photo|photograph/i.test(c)) return "Photography";
    if (/album/i.test(c)) return "Album";
    if (/video|videography/i.test(c)) return "Videography";
    if (/additional|addon|add[- ]?service/i.test(c)) return "Additional Services";
    if (/print|gift|gifts|prints|merch/i.test(c)) return "Print & Gifts";
    return "Other";
  };

  const groupedItems = items.reduce((acc, item) => {
    const category = mapCategory(item.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, QuotationItem[]>);

  const categoryIcons: Record<string, string> = {
    Photography: "📷",
    Album: "📚",
    Videography: "🎬",
    "Additional Services": "✨",
    "Print & Gifts": "🎁",
    Other: "📌",
  };

  // Calculate category totals
  const categoryTotals = Object.entries(groupedItems).reduce((acc, [category, catItems]) => {
    acc[category] = catItems.reduce((sum, item) => sum + item.total_price, 0);
    return acc;
  }, {} as Record<string, number>);

  // Desired order for rendering categories
  const orderedCategories = ["Photography", "Album", "Videography", "Additional Services", "Print & Gifts", "Other"];

  // Handle Print/PDF - try programmatic PDF via html2pdf, fallback to print window
  const handlePrint = async () => {
    if (!quotation) return;

    // Generate filename with quotation number and customer name
    const customerName = quotation.customers?.name?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'Customer';
    const pdfFilename = `${quotation.quotation_number}_${customerName}.pdf`;

    // Try programmatic pdf generation using html2pdf.js
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule && (html2pdfModule as any).default) || html2pdfModule;
      const element = document.getElementById('pdf-root');
      if (element && html2pdf) {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: pdfFilename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        } as any;
        
        // Create a clone to avoid modifying original
        const clone = element.cloneNode(true) as HTMLElement;
        await html2pdf().set(opt).from(clone).save();
        return;
      }
    } catch (err) {
      console.debug('html2pdf error, attempting alternative method', err);
    }

    // Fallback: Show alert with filename hint
    alert(`Please save the file as: ${pdfFilename}\n\nThe browser will open print dialog. Select "Save as PDF" to download.`);

    const itemsHtml = orderedCategories.map((category) => {
      const catItems = groupedItems[category] || [];
      if (catItems.length === 0) return '';
      return `
      <tr class="category-row">
        <td colspan="${showPrices ? 4 : 3}">${categoryIcons[category] || "📌"} ${category} Services</td>
      </tr>
      ${catItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="qty">${item.quantity}</td>
          <td>-</td>
          ${showPrices ? `<td class="amount">${formatCurrency(item.total_price)}</td>` : ''}
        </tr>
      `).join('')}
    `;
    }).join('');

    const summaryHtml = showPrices ? `
      <div class="section">
        <div class="section-title">Price Summary</div>
        <div class="summary-box">
          ${Object.entries(categoryTotals).map(([category, total]) => `
            <div class="summary-row subtotal">
              <span>${category} Services</span>
              <span>${formatCurrency(total)}</span>
            </div>
          `).join('')}
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(quotation.subtotal)}</span>
          </div>
          ${quotation.discount_amount > 0 ? `
            <div class="summary-row discount">
              <span>Discount (${quotation.discount_percent}%)</span>
              <span>- ${formatCurrency(quotation.discount_amount)}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Grand Total</span>
            <span class="value">${formatCurrency(quotation.total_amount)}</span>
          </div>
        </div>
      </div>
    ` : `
      <div class="section">
        <div class="section-title">Package Total</div>
        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(quotation.subtotal)}</span>
          </div>
          ${quotation.discount_amount > 0 ? `
            <div class="summary-row discount">
              <span>Discount (${quotation.discount_percent}%)</span>
              <span>- ${formatCurrency(quotation.discount_amount)}</span>
            </div>
          ` : ''}
          <div class="summary-row total" style="border-top: 2px solid #5b1e2d; margin-top: 8px; padding-top: 12px;">
            <span>Grand Total</span>
            <span class="value">${formatCurrency(quotation.total_amount)}</span>
          </div>
        </div>
      </div>
    `;

    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quotation - ${quotation.quotation_number} | Aura Knot</title>
          <style>
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          @media print {
            @page { margin: 10mm; }
            html, body { width: 210mm; height: 297mm; }
            body { padding: 0; }
            .container { width: 210mm; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #1e293b;
            padding: 10mm;
            line-height: 1.5;
            font-size: 12px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .container { width: 210mm; max-width: 100%; margin: 0 auto; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #5b1e2d;
            margin-bottom: 20px;
          }
          .logo-img { height: 60px; width: auto; }
          .logo-contact { font-size: 11px; color: #64748b; margin-top: 6px; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 22px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
          .doc-number { font-size: 13px; color: #5b1e2d; font-weight: 600; margin-top: 4px; }
          .doc-date { font-size: 11px; color: #64748b; margin-top: 2px; }
          .status-badge {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            font-size: 10px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.5px; margin-top: 8px;
          }
          .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
          .status-confirmed { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
          .status-draft { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
          .status-declined { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
          .section { margin-bottom: 18px; page-break-inside: avoid; }
          .section-title {
            font-size: 12px; font-weight: 700; color: #5b1e2d;
            text-transform: uppercase; letter-spacing: 1px;
            padding-bottom: 6px; border-bottom: 1px solid #e6c9a9; margin-bottom: 12px;
          }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-box { background: #faf6f2 !important; padding: 12px; border-radius: 6px; border-left: 3px solid #5b1e2d; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .info-label { font-size: 9px; color: #475569 !important; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
          .info-value { font-size: 13px; font-weight: 600; color: #1e293b !important; }
          .info-sub { font-size: 10px; color: #475569 !important; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; page-break-inside: avoid; }
          th, td { padding: 8px 10px; text-align: left; font-size: 11px; }
          th {
            background: #5b1e2d !important; color: white; font-weight: 600;
            text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          th:first-child { border-radius: 4px 0 0 0; }
          th:last-child { border-radius: 0 4px 0 0; }
          tr:nth-child(even) { background: #faf6f2 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          tr:nth-child(odd) { background: #ffffff !important; }
          td { border-bottom: 1px solid #e6c9a9; color: #1e293b !important; }
          .qty { text-align: center; color: #1e293b !important; }
          .amount { text-align: right; color: #1e293b !important; }
          .category-row {
            background: #e6c9a9 !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .category-row td {
            font-weight: 700; color: #5b1e2d !important; font-size: 10px;
            text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 10px;
          }
          .summary-box {
            background: #faf6f2; border: 1px solid #e6c9a9;
            border-radius: 8px; padding: 15px; margin-top: 15px; page-break-inside: avoid;
          }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #1e293b !important; }
          .summary-row.subtotal { border-bottom: 1px solid #e6c9a9; padding-bottom: 8px; margin-bottom: 6px; color: #1e293b !important; }
          .summary-row.discount { color: #16a34a !important; }
          .summary-row.total {
            border-top: 2px solid #5b1e2d; padding-top: 12px;
            margin-top: 8px; font-size: 16px; font-weight: 700; color: #1e293b !important;
          }
          .summary-row.total .value { color: #5b1e2d !important; }
          .deliverables-grid {
            display: grid; grid-template-columns: repeat(4, 1fr);
            gap: 10px; margin-top: 8px; page-break-inside: avoid;
          }
          .deliverable-item {
            background: #faf6f2 !important; padding: 10px; border-radius: 6px;
            text-align: center; border: 1px solid #e6c9a9;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .deliverable-value { font-size: 18px; font-weight: 700; color: #5b1e2d !important; }
          .deliverable-label { font-size: 9px; color: #475569 !important; text-transform: uppercase; margin-top: 3px; }
          .terms {
            margin-top: 20px; padding: 15px; background: #f8fafc !important;
            border-radius: 6px; page-break-inside: avoid;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .terms-title { font-size: 10px; font-weight: 700; color: #5b1e2d !important; margin-bottom: 8px; text-transform: uppercase; }
          .terms-list { font-size: 9px; color: #374151 !important; list-style: none; columns: 1; }
          .terms-list li { padding: 2px 0; line-height: 1.4; color: #374151 !important; }
          .footer-note {
            margin-top: 20px; padding: 12px; background: #faf6f2 !important;
            border-radius: 6px; text-align: center; border: 1px solid #e6c9a9;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .footer-note p { font-size: 10px; color: #5b1e2d !important; margin: 2px 0; }
          .footer-note .thank-you { font-size: 12px; font-weight: 600; color: #5b1e2d !important; }
          .footer {
            margin-top: 25px; padding-top: 15px; border-top: 1px solid #e6c9a9;
            display: flex; justify-content: space-between; align-items: flex-end;
            page-break-inside: avoid;
          }
          .contact-info { font-size: 10px; color: #475569 !important; }
          .contact-info p { margin: 2px 0; color: #475569 !important; }
          .contact-info strong { color: #1e293b !important; }
          .signature-box { text-align: center; }
          .signature-line { width: 150px; border-top: 1px solid #1e293b; margin-bottom: 4px; }
          .signature-label { font-size: 9px; color: #475569 !important; }
          .notes-box {
            background: #fef3c7 !important; border: 1px solid #fcd34d;
            border-radius: 10px; padding: 15px; margin-bottom: 15px;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .notes-title { font-size: 12px; font-weight: 600; color: #92400e !important; margin-bottom: 8px; }
          .notes-content { font-size: 13px; color: #78350f !important; }
          @media print {
            body { padding: 0; }
            .container { max-width: 100%; }
          }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <img src="${window.location.origin}/ak-logo-final.png" alt="Aura Knot" class="logo-img">
              <div class="logo-contact" style="font-weight: 600; color: #5b1e2d;">Naveen B T, Founder & Creative Director</div>
              <div class="logo-contact">+91 8610 100 885 | auraknot.photo@gmail.com | Perundurai, Erode</div>
            </div>
            <div class="doc-info">
              <div class="doc-title">Quotation</div>
              <div class="doc-number">${quotation.quotation_number}</div>
              <div class="doc-date">Date: ${formatDate(quotation.created_at)}</div>
              <div class="status-badge status-${quotation.status.toLowerCase()}">${quotation.status}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Customer & Event Details</div>
            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${quotation.customers?.name || "-"}</div>
                <div class="info-sub">${quotation.customers?.phone || ""} ${quotation.customers?.email ? `• ${quotation.customers.email}` : ""}</div>
              </div>
              <div class="info-box">
                <div class="info-label">Event Type</div>
                <div class="info-value">${quotation.event_type || "-"}</div>
                <div class="info-sub">${quotation.package_type || "-"}</div>
              </div>
              <div class="info-box">
                <div class="info-label">Event Date</div>
                <div class="info-value">${formatDate(quotation.event_date)}</div>
                ${quotation.event_end_date ? `<div class="info-sub">To: ${formatDate(quotation.event_end_date)}</div>` : ""}
              </div>
              <div class="info-box">
                <div class="info-label">Venue</div>
                <div class="info-value">${quotation.event_venue || "-"}</div>
                <div class="info-sub">${quotation.event_city || "-"}</div>
              </div>
            </div>
          </div>

          ${items.length > 0 ? `
            <div class="section">
              <div class="section-title">Services ${showPrices ? '& Pricing' : ''}</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="qty">Qty</th>
                    <th>Details</th>
                    ${showPrices ? '<th class="amount">Amount</th>' : ''}
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Album Overview</div>
            <div class="deliverables-grid">
              <div class="deliverable-item"><div class="deliverable-value">${quotation.num_albums || 0}</div><div class="deliverable-label">Albums</div></div>
              <div class="deliverable-item"><div class="deliverable-value">${quotation.sheets_per_album || 0}</div><div class="deliverable-label">Sheets/Album</div></div>
              <div class="deliverable-item"><div class="deliverable-value">${quotation.total_photos || 0}</div><div class="deliverable-label">Photos for Selection</div></div>
              <div class="deliverable-item"><div class="deliverable-value">${quotation.album_size || '-'}</div><div class="deliverable-label">Album Size</div></div>
            </div>
          </div>

          ${summaryHtml}

          ${quotation.notes ? `
            <div class="notes-box">
              <div class="notes-title">Special Notes</div>
              <div class="notes-content">${quotation.notes}</div>
            </div>
          ` : ''}

          <div class="terms">
            <div class="terms-title">Terms & Conditions</div>
            <ul class="terms-list">
              <li>1. Delivery: Soft copies delivered within 7 days of the event unless agreed otherwise.</li>
              <li>2. Selection: Client to select photos for album within 10 days of receiving soft copies.</li>
              <li>3. Album Design: Initial design: 20 days after selection; final corrections: within 10 days of feedback.</li>
              <li>4. Approval: Final approval required before printing; no changes after approval.</li>
              <li>5. Delays: Client delays may affect delivery timelines.</li>
              <li>6. Corrections: Extra corrections beyond scope or after approval will incur charges.</li>
              <li>7. Payments: 50% advance to confirm; 40% on event date; 10% before album printing.</li>
              <li>8. Cancellation: Advance is non-refundable for cancellations/postponements.</li>
              <li>9. Meetings: Clients may need to attend planning discussions.</li>
              <li>10. Outdoor Shoots: Standard outdoor shoot: up to 6 hours; extra time and expenses borne by client.</li>
              <li>11. Validity: Outdoor-shoot offers must be used within 60 days of the event date.</li>
              <li>12. Cooperation: Client cooperation is required for best creative results.</li>
              <li>13. Copyright: Aura Knot Photography retains copyright; selected works may be used for portfolio/promotions.</li>
            </ul>
          </div>

          <div class="footer-note">
            <p class="thank-you">Thank you for choosing Aura Knot Photography.</p>
            <p>Valid Until: ${quotation.valid_until ? formatDate(quotation.valid_until) : "-"} | This is a computer-generated quotation.</p>
          </div>

          <div class="footer">
            <div class="contact-info">
              <p><strong>Aura Knot Photography</strong></p>
              <p>📍 Perundurai, Erode</p>
              <p>📞 +91 8610 100 885 | ✉️ auraknot.photo@gmail.com</p>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Authorized Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Set document title to include filename for PDF save dialog
      printWindow.document.title = pdfFilename.replace('.pdf', '');
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5b1e2d] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600 mb-4">Quotation not found</p>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#5b1e2d] text-white rounded-lg hover:bg-[#4a1624]"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="font-semibold text-gray-900">{quotation.quotation_number}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Toggle Prices */}
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Show Prices</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={showPrices} 
                  onChange={(e) => setShowPrices(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${showPrices ? 'bg-[#5b1e2d]' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showPrices ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </label>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            {/* Print/Download Button */}
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-[#5b1e2d] text-white rounded-lg hover:bg-[#4a1624] font-medium transition-colors"
            >
              <span>📄</span>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="pt-20 pb-10 px-2 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-500 text-center mb-3">When saving as PDF, uncheck "Headers and footers" in the print dialog to avoid printing page URL/header details.</div>
          {/* Preview Label */}
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              Preview - Click &quot;Download PDF&quot; to save
            </span>
          </div>
          
          {/* PDF Preview */}
          <div 
            id="pdf-root" className="bg-white shadow-xl rounded-lg overflow-hidden"
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
          >
            <div className="p-4 sm:p-8">
              {/* Header */}
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start pb-5 border-b-2 border-[#5b1e2d] mb-5">
                <div>
                  <img src="/ak-logo-final.png" alt="Aura Knot" className="h-16 w-auto" />
                  <div className="text-sm mt-2 font-semibold text-[#5b1e2d]">Naveen B T, Founder & Creative Director</div>
                  <div className="text-sm text-gray-500">+91 8610 100 885 | auraknot.photo@gmail.com | Perundurai, Erode</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 tracking-wide">QUOTATION</div>
                  <div className="text-sm font-semibold text-[#5b1e2d] mt-1">{quotation.quotation_number}</div>
                  <div className="text-sm text-gray-500 mt-1">Date: {formatDate(quotation.created_at)}</div>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase
                    ${quotation.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' : ''}
                    ${quotation.status === 'Confirmed' ? 'bg-green-100 text-green-800 border border-green-300' : ''}
                    ${quotation.status === 'Draft' ? 'bg-gray-100 text-gray-700 border border-gray-300' : ''}
                    ${quotation.status === 'Declined' ? 'bg-red-100 text-red-700 border border-red-300' : ''}
                  `}>
                    {quotation.status}
                  </span>
                </div>
              </div>

              {/* Customer & Event Info */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-[#5b1e2d] uppercase tracking-wide pb-2 border-b border-[#e6c9a9] mb-3">
                  Customer & Event Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#faf6f2] p-3 rounded border-l-[3px] border-l-[#5b1e2d]">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Customer Name</div>
                    <div className="text-sm font-semibold text-gray-900">{quotation.customers?.name || "-"}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {quotation.customers?.phone} {quotation.customers?.email && `• ${quotation.customers.email}`}
                    </div>
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded border-l-[3px] border-l-[#5b1e2d]">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Event Type</div>
                    <div className="text-sm font-semibold text-gray-900">{quotation.event_type || "-"}</div>
                    <div className="text-xs text-gray-500 mt-1">{quotation.package_type || "-"}</div>
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded border-l-[3px] border-l-[#5b1e2d]">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Event Date</div>
                    <div className="text-sm font-semibold text-gray-900">{formatDate(quotation.event_date)}</div>
                    {quotation.event_end_date && (
                      <div className="text-xs text-gray-500 mt-1">To: {formatDate(quotation.event_end_date)}</div>
                    )}
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded border-l-[3px] border-l-[#5b1e2d]">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">Venue</div>
                    <div className="text-sm font-semibold text-gray-900">{quotation.event_venue || "-"}</div>
                    <div className="text-xs text-gray-500 mt-1">{quotation.event_city || "-"}</div>
                  </div>
                </div>
              </div>

              {/* Services */}
              {items.length > 0 && (
                <div className="mb-5 overflow-x-auto">
                  <h3 className="text-xs font-bold text-[#5b1e2d] uppercase tracking-wide pb-2 border-b border-[#e6c9a9] mb-3">
                    Services {showPrices && '& Pricing'}
                  </h3>
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="bg-[#5b1e2d] text-white">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase rounded-tl">Description</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Details</th>
                        {showPrices && <th className="px-3 py-2 text-right text-xs font-semibold uppercase rounded-tr">Amount</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {orderedCategories.map((category) => {
                        const catItems = groupedItems[category] || [];
                        if (catItems.length === 0) return null;
                        return (
                          <React.Fragment key={`cat-${category}`}>
                            <tr className="bg-[#e6c9a9]">
                              <td colSpan={showPrices ? 4 : 3} className="px-3 py-2 font-bold text-[#5b1e2d] text-xs uppercase">
                                {categoryIcons[category] || "📌"} {category} Services
                              </td>
                            </tr>
                            {catItems.map((item) => (
                              <tr key={item.id} className="even:bg-[#faf6f2] odd:bg-white">
                                <td className="px-3 py-2 border-b border-[#e6c9a9] text-gray-900">{item.description}</td>
                                <td className="px-3 py-2 border-b border-[#e6c9a9] text-center text-gray-900">{item.quantity}</td>
                                <td className="px-3 py-2 border-b border-[#e6c9a9] text-gray-900">-</td>
                                {showPrices && <td className="px-3 py-2 border-b border-[#e6c9a9] text-right text-gray-900">{formatCurrency(item.total_price)}</td>}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Album Overview */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-[#5b1e2d] uppercase tracking-wide pb-2 border-b border-[#e6c9a9] mb-3">
                  Album Overview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#faf6f2] p-3 rounded text-center border border-[#e6c9a9]">
                    <div className="text-lg font-bold text-[#5b1e2d]">{quotation.num_albums || 0}</div>
                    <div className="text-[9px] text-gray-500 uppercase mt-1">Albums</div>
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded text-center border border-[#e6c9a9]">
                    <div className="text-lg font-bold text-[#5b1e2d]">{quotation.sheets_per_album || 0}</div>
                    <div className="text-[9px] text-gray-500 uppercase mt-1">Sheets/Album</div>
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded text-center border border-[#e6c9a9]">
                    <div className="text-lg font-bold text-[#5b1e2d]">{quotation.total_photos || 0}</div>
                    <div className="text-[9px] text-gray-500 uppercase mt-1">Photos for Selection</div>
                  </div>
                  <div className="bg-[#faf6f2] p-3 rounded text-center border border-[#e6c9a9]">
                    <div className="text-lg font-bold text-[#5b1e2d]">{quotation.album_size || '-'}</div>
                    <div className="text-[9px] text-gray-500 uppercase mt-1">Album Size</div>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-[#5b1e2d] uppercase tracking-wide pb-2 border-b border-[#e6c9a9] mb-3">
                  {showPrices ? 'Price Summary' : 'Package Total'}
                </h3>
                <div className="bg-[#faf6f2] border border-[#e6c9a9] rounded-lg p-4">
                  {showPrices && (
                    <>
                      {Object.entries(categoryTotals).map(([category, total]) => (
                        <div key={category} className="flex justify-between py-2 border-b border-[#e6c9a9] text-gray-900">
                          <span>{category} Services</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 text-gray-900">
                        <span>Subtotal</span>
                        <span>{formatCurrency(quotation.subtotal)}</span>
                      </div>
                    </>
                  )}
                  {!showPrices && (
                    <div className="flex justify-between py-2 text-gray-900">
                      <span>Subtotal</span>
                      <span>{formatCurrency(quotation.subtotal)}</span>
                    </div>
                  )}
                  {quotation.discount_amount > 0 && (
                    <div className="flex justify-between py-2 text-green-700">
                      <span>Discount ({quotation.discount_percent}%)</span>
                      <span>- {formatCurrency(quotation.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-[#5b1e2d] mt-2">
                    <span>Grand Total</span>
                    <span className="text-[#5b1e2d]">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {quotation.notes && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-5">
                  <div className="font-semibold text-amber-800 mb-2">Special Notes</div>
                  <div className="text-amber-900">{quotation.notes}</div>
                </div>
              )}

              {/* Terms */}
              <div className="bg-gray-50 rounded p-4 mb-5">
                <div className="text-xs font-bold text-[#5b1e2d] uppercase mb-2">Terms & Conditions</div>
                <ul className="text-[9px] text-gray-700 space-y-1">
                  <li>1. Delivery: Soft copies delivered within 7 days of the event unless agreed otherwise.</li>
                  <li>2. Selection: Client to select photos for album within 10 days of receiving soft copies.</li>
                  <li>3. Album Design: Initial design: 20 days after selection; final corrections: within 10 days of feedback.</li>
                  <li>4. Approval: Final approval required before printing; no changes after approval.</li>
                  <li>5. Delays: Client delays may affect delivery timelines.</li>
                  <li>6. Corrections: Extra corrections beyond scope or after approval will incur charges.</li>
                  <li>7. Payments: 50% advance to confirm; 40% on event date; 10% before album printing.</li>
                  <li>8. Cancellation: Advance is non-refundable for cancellations/postponements.</li>
                  <li>9. Meetings: Clients may need to attend planning discussions.</li>
                  <li>10. Outdoor Shoots: Standard outdoor shoot: up to 6 hours; extra time and expenses borne by client.</li>
                  <li>11. Validity: Outdoor-shoot offers must be used within 60 days of the event date.</li>
                  <li>12. Cooperation: Client cooperation is required for best creative results.</li>
                  <li>13. Copyright: Aura Knot Photography retains copyright; selected works may be used for portfolio/promotions.</li>
                </ul>
              </div>

              {/* Footer Note */}
              <div className="bg-[#faf6f2] border border-[#e6c9a9] rounded p-3 text-center mb-5">
                <p className="font-semibold text-[#5b1e2d]">Thank you for choosing Aura Knot Photography.</p>
                <p className="text-xs text-[#5b1e2d] mt-1">
                  Valid Until: {quotation.valid_until ? formatDate(quotation.valid_until) : "-"} | This is a computer-generated quotation.
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-end pt-4 border-t border-[#e6c9a9]">
                <div className="text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">Aura Knot Photography</p>
                  <p>📍 Perundurai, Erode</p>
                  <p>📞 +91 8610 100 885 | ✉️ auraknot.photo@gmail.com</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-t border-gray-900 mb-1"></div>
                  <div className="text-[9px] text-gray-500">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
