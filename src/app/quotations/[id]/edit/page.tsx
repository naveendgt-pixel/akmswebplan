"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import {
  additionalServices,
  albumSizes,
  coverageAreas,
  coverageTypes,
  sessionTypes,
} from "@/lib/constants";

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
  num_albums: number;
  sheets_per_album: number;
  total_photos: number;
  album_size: string | null;
  mini_books: number;
  calendars: number;
  frames: number;
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [packageType, setPackageType] = useState("");
  const [numAlbums, setNumAlbums] = useState(0);
  const [sheetsPerAlbum, setSheetsPerAlbum] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [albumSize, setAlbumSize] = useState("");
  const [miniBooks, setMiniBooks] = useState(0);
  const [calendars, setCalendars] = useState(0);
  const [frames, setFrames] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        // Fetch quotation
        const { data: quotationData, error: quotationError } = await supabase
          .from("quotations")
          .select(`
            *,
            customers (
              id,
              name,
              phone,
              email
            )
          `)
          .eq("id", resolvedParams.id)
          .single();

        if (quotationError) throw quotationError;

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", resolvedParams.id)
          .order("created_at", { ascending: true });

        if (itemsError) throw itemsError;

        setQuotation(quotationData);
        setItems(itemsData?.map(item => ({
          ...item,
          id: item.id || generateId()
        })) || []);

        // Set form values
        setEventType(quotationData.event_type || "");
        setEventDate(quotationData.event_date || "");
        setEventEndDate(quotationData.event_end_date || "");
        setEventVenue(quotationData.event_venue || "");
        setEventCity(quotationData.event_city || "");
        setPackageType(quotationData.package_type || "");
        setNumAlbums(quotationData.num_albums || 0);
        setSheetsPerAlbum(quotationData.sheets_per_album || 0);
        setTotalPhotos(quotationData.total_photos || 0);
        setAlbumSize(quotationData.album_size || "");
        setMiniBooks(quotationData.mini_books || 0);
        setCalendars(quotationData.calendars || 0);
        setFrames(quotationData.frames || 0);
        setDiscountPercent(quotationData.discount_percent || 0);
        setNotes(quotationData.notes || "");

      } catch (error) {
        console.error("Error fetching quotation:", error);
        setMessage({ type: "error", text: "Failed to load quotation" });
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [resolvedParams.id]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAmount = subtotal - discountAmount;

  // Item handlers
  const addItem = (category: string) => {
    setItems([...items, {
      id: generateId(),
      category,
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate total
        if (field === "quantity" || field === "unit_price") {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Save quotation
  const handleSave = async () => {
    if (!supabase || !quotation) return;

    setSaving(true);
    setMessage(null);

    try {
      // Update quotation
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          event_type: eventType,
          event_date: eventDate || null,
          event_end_date: eventEndDate || null,
          event_venue: eventVenue || null,
          event_city: eventCity || null,
          package_type: packageType || null,
          num_albums: numAlbums,
          sheets_per_album: sheetsPerAlbum,
          total_photos: totalPhotos,
          album_size: albumSize || null,
          mini_books: miniBooks,
          calendars: calendars,
          frames: frames,
          subtotal: subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          notes: notes || null,
        })
        .eq("id", quotation.id);

      if (updateError) throw updateError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", quotation.id);

      if (deleteError) throw deleteError;

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          quotation_id: quotation.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        const { error: insertError } = await supabase
          .from("quotation_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      setMessage({ type: "success", text: "Quotation updated successfully!" });
      setTimeout(() => router.push("/quotations"), 1500);

    } catch (error) {
      console.error("Error saving quotation:", error);
      setMessage({ type: "error", text: "Failed to save quotation" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !quotation) return;
    setDeleting(true);
    try {
      // Delete quotation items first
      await supabase.from("quotation_items").delete().eq("quotation_id", quotation.id);
      // Delete the quotation
      const { error } = await supabase.from("quotations").delete().eq("id", quotation.id);
      if (error) throw error;
      setMessage({ type: "success", text: "Quotation deleted successfully!" });
      setTimeout(() => router.push("/quotations"), 1000);
    } catch (error) {
      console.error("Error deleting quotation:", error);
      setMessage({ type: "error", text: "Failed to delete quotation" });
      setDeleting(false);
    }
  };

  const inputClass = "h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
  const selectClass = "h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-[var(--muted-foreground)]">Quotation not found</p>
        <Link href="/quotations" className="mt-4 text-indigo-500 hover:underline">
          ← Back to Quotations
        </Link>
      </div>
    );
  }

  // Group items by category
  const photoItems = items.filter(i => i.category === "Photography");
  const videoItems = items.filter(i => i.category === "Videography");
  const additionalItems = items.filter(i => i.category === "Additional");

  return (
    <div className="flex flex-col gap-6 px-2 sm:px-4 md:px-8 max-w-6xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/quotations" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            ← Back to Quotations
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Edit Quotation
          </h2>
          <p className="text-sm font-mono text-indigo-500">{quotation.quotation_number}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <Link
            href={`/quotations/${resolvedParams.id}/pdf`}
            target="_blank"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-medium text-purple-600 hover:bg-purple-100 transition-all"
          >
            📄 View PDF
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 hover:bg-red-100 transition-all"
          >
            🗑️ Delete
          </button>
          <Link
            href="/quotations"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
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

      {/* Customer Info - Read Only */}
      <SectionCard title="Customer Information" description="Customer details (read-only)">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Customer Name</p>
            <p className="font-medium text-[var(--foreground)]">{quotation.customers?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Phone</p>
            <p className="font-medium text-[var(--foreground)]">{quotation.customers?.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Email</p>
            <p className="font-medium text-[var(--foreground)]">{quotation.customers?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Status</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              quotation.status === "Draft" ? "bg-gray-100 text-gray-700" :
              quotation.status === "Pending" ? "bg-amber-100 text-amber-700" :
              quotation.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" :
              "bg-red-100 text-red-700"
            }`}>
              {quotation.status}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Event Details */}
      <SectionCard title="Event Details" description="Event information">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Type</label>
            <input
              type="text"
              className={inputClass}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Wedding, Reception, etc."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event End Date</label>
            <input
              type="date"
              className={inputClass}
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event Venue</label>
            <input
              type="text"
              className={inputClass}
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              placeholder="Venue name and address"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Event City</label>
            <input
              type="text"
              className={inputClass}
              value={eventCity}
              onChange={(e) => setEventCity(e.target.value)}
              placeholder="City name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Package Type</label>
            <input
              type="text"
              className={inputClass}
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              placeholder="Silver, Gold, Platinum"
            />
          </div>
        </div>
      </SectionCard>

      {/* Photography Services */}
      <SectionCard 
        title="Photography Services" 
        description={`${photoItems.length} service(s) - ₹${photoItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}`}
      >
        <div className="flex flex-col gap-3">
          {photoItems.map((item, idx) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-[var(--secondary)]/50">
              <span className="text-xs text-[var(--muted-foreground)] w-6">{idx + 1}.</span>
              <input
                type="text"
                className={`${inputClass} flex-1`}
                placeholder="Description (e.g., Traditional Photography)"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
              />
              <input
                type="number"
                className={`${inputClass} w-28`}
                placeholder="Rate"
                min="0"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
              />
              <span className="w-24 text-right font-semibold text-[var(--foreground)]">
                ₹{item.total_price.toLocaleString("en-IN")}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => addItem("Photography")}
            className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            + Add Photography Service
          </button>
        </div>
      </SectionCard>

      {/* Videography Services */}
      <SectionCard 
        title="Videography Services" 
        description={`${videoItems.length} service(s) - ₹${videoItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}`}
      >
        <div className="flex flex-col gap-3">
          {videoItems.map((item, idx) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-[var(--secondary)]/50">
              <span className="text-xs text-[var(--muted-foreground)] w-6">{idx + 1}.</span>
              <input
                type="text"
                className={`${inputClass} flex-1`}
                placeholder="Description (e.g., Traditional Video)"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
              />
              <input
                type="number"
                className={`${inputClass} w-28`}
                placeholder="Rate"
                min="0"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
              />
              <span className="w-24 text-right font-semibold text-[var(--foreground)]">
                ₹{item.total_price.toLocaleString("en-IN")}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => addItem("Videography")}
            className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            + Add Videography Service
          </button>
        </div>
      </SectionCard>

      {/* Additional Services */}
      <SectionCard 
        title="Additional Services" 
        description={`${additionalItems.length} service(s) - ₹${additionalItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}`}
      >
        <div className="flex flex-col gap-3">
          {additionalItems.map((item, idx) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-[var(--secondary)]/50">
              <span className="text-xs text-[var(--muted-foreground)] w-6">{idx + 1}.</span>
              <input
                type="text"
                className={`${inputClass} flex-1`}
                placeholder="Description (e.g., Drone Coverage)"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
              />
              <input
                type="number"
                className={`${inputClass} w-28`}
                placeholder="Rate"
                min="0"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
              />
              <span className="w-24 text-right font-semibold text-[var(--foreground)]">
                ₹{item.total_price.toLocaleString("en-IN")}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => addItem("Additional")}
            className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            + Add Additional Service
          </button>
        </div>
      </SectionCard>

      {/* Deliverables */}
      <SectionCard title="Deliverables" description="Albums, photos, and prints">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Number of Albums</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={numAlbums}
              onChange={(e) => setNumAlbums(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Sheets per Album</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={sheetsPerAlbum}
              onChange={(e) => setSheetsPerAlbum(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Total Sheets</label>
            <input
              type="number"
              className={inputClass}
              value={numAlbums * sheetsPerAlbum}
              disabled
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Total Photos</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={totalPhotos}
              onChange={(e) => setTotalPhotos(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Album Size</label>
            <select
              className={selectClass}
              value={albumSize}
              onChange={(e) => setAlbumSize(e.target.value)}
            >
              <option value="">Select size</option>
              {albumSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Mini Books</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={miniBooks}
              onChange={(e) => setMiniBooks(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Calendars</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={calendars}
              onChange={(e) => setCalendars(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Frames</label>
            <input
              type="number"
              className={inputClass}
              min="0"
              value={frames}
              onChange={(e) => setFrames(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Pricing & Notes */}
      <SectionCard title="Pricing & Notes" description="Discount and additional notes">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Discount (%)</label>
              <input
                type="number"
                className={inputClass}
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Notes</label>
              <textarea
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          
          {/* Totals Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Price Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Photography</span>
                <span className="font-medium">₹{photoItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Videography</span>
                <span className="font-medium">₹{videoItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Additional Services</span>
                <span className="font-medium">₹{additionalItems.reduce((s, i) => s + i.total_price, 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-[var(--border)] pt-3 flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t-2 border-indigo-200 pt-3 flex justify-between">
                <span className="text-lg font-semibold text-[var(--foreground)]">Total Amount</span>
                <span className="text-2xl font-bold text-indigo-600">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pb-6">
        <Link
          href="/quotations"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Delete Quotation?</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Are you sure you want to delete quotation <span className="font-semibold text-[var(--foreground)]">{quotation.quotation_number}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
