"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { supabase } from "@/lib/supabaseClient";
import {
  additionalServices,
  albumSizes,
  coverageAreas,
  coverageTypes,
  sessionTypes,
} from "@/lib/constants";

// Photography Service Entry
interface PhotoService {
  id: string;
  type: string;
  area: string;
  cameras: number;
  session: string;
  rate: number;
}

// Videography Service Entry
interface VideoService {
  id: string;
  type: string;
  area: string;
  cameras: number;
  session: string;
  rate: number;
}

// Additional Service Entry
interface AdditionalService {
  id: string;
  service: string;
  remarks: string;
  rate: number;
}

interface QuotationForm {
  // Customer Info (from URL params)
  customerId: string;
  customerName: string;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  packageType: string;
  
  // Multiple Photography Services
  photoServices: PhotoService[];
  
  // Multiple Videography Services
  videoServices: VideoService[];
  
  // Multiple Additional Services
  additionalServices: AdditionalService[];
  
  // Deliverables
  numAlbums: number;
  sheetsPerAlbum: number;
  totalPhotos: number;
  albumSize: string;
  
  // Print & Gifts
  miniBooks: number;
  calendars: number;
  frames: number;
  
  // Pricing
  discountPercent: number;
  notes: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createPhotoService = (): PhotoService => ({
  id: generateId(),
  type: "",
  area: "",
  cameras: 1,
  session: "",
  rate: 0,
});

const createVideoService = (): VideoService => ({
  id: generateId(),
  type: "",
  area: "",
  cameras: 1,
  session: "",
  rate: 0,
});

const createAdditionalService = (): AdditionalService => ({
  id: generateId(),
  service: "",
  remarks: "",
  rate: 0,
});

const initialForm: QuotationForm = {
  customerId: "",
  customerName: "",
  customerPhone: "",
  eventType: "",
  eventDate: "",
  eventVenue: "",
  eventCity: "",
  packageType: "",
  photoServices: [createPhotoService()],
  videoServices: [createVideoService()],
  additionalServices: [],
  numAlbums: 0,
  sheetsPerAlbum: 0,
  totalPhotos: 0,
  albumSize: "",
  miniBooks: 0,
  calendars: 0,
  frames: 0,
  discountPercent: 0,
  notes: "",
};

function QuotationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState<QuotationForm>(initialForm);
  const [discountAmountManual, setDiscountAmountManual] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editQuotationId, setEditQuotationId] = useState<string | null>(null);
  const [editQuotationNumber, setEditQuotationNumber] = useState<string | null>(null);

  // Load customer data from URL params OR load existing quotation for editing
  useEffect(() => {
    const quotationId = searchParams.get("editId");
    
    if (quotationId) {
      // Edit mode - load existing quotation
      setIsEditMode(true);
      setEditQuotationId(quotationId);
      loadExistingQuotation(quotationId);
    } else {
      // Create mode - load from URL params
      const customerId = searchParams.get("customerId") || "";
      const customerName = searchParams.get("customerName") || "";
      const customerPhone = searchParams.get("customerPhone") || "";
      const eventType = searchParams.get("eventType") || "";
      const eventDate = searchParams.get("eventDate") || "";
      const eventVenue = searchParams.get("eventVenue") || "";
      const eventCity = searchParams.get("eventCity") || "";
      const packageType = searchParams.get("packageType") || "";
      const session = searchParams.get("session") || "";

      setForm((prev) => ({
        ...prev,
        customerId,
        customerName,
        customerPhone,
        eventType,
        eventDate,
        eventVenue,
        eventCity,
        packageType,
        photoServices: prev.photoServices.map((ps) => ({ ...ps, session })),
        videoServices: prev.videoServices.map((vs) => ({ ...vs, session })),
      }));
    }
  }, [searchParams]);

  // Load existing quotation for editing
  const loadExistingQuotation = async (quotationId: string) => {
    if (!supabase) return;

    try {
      // Fetch quotation with customer
      const { data: quotation, error } = await supabase
        .from("quotations")
        .select(`
          *,
          customers (
            id,
            name,
            phone
          )
        `)
        .eq("id", quotationId)
        .single();

      if (error) throw error;

      setEditQuotationNumber(quotation.quotation_number);

      // Fetch quotation items
      const { data: items } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId);

      // Parse items into services
      const photoServices: PhotoService[] = [];
      const videoServices: VideoService[] = [];
      const additionalServicesArr: AdditionalService[] = [];

      (items || []).forEach((item) => {
        if (item.category === "Photography") {
          photoServices.push({
            id: generateId(),
            type: item.description?.includes("Traditional") ? "Traditional" : item.description?.includes("Candid") ? "Candid" : "",
            area: "",
            cameras: item.quantity || 1,
            session: "",
            rate: item.total_price || 0,
          });
        } else if (item.category === "Videography") {
          videoServices.push({
            id: generateId(),
            type: item.description?.includes("Traditional") ? "Traditional" : item.description?.includes("Candid") ? "Candid" : "",
            area: "",
            cameras: item.quantity || 1,
            session: "",
            rate: item.total_price || 0,
          });
        } else if (item.category === "Additional Services" || item.category === "Additional") {
          additionalServicesArr.push({
            id: generateId(),
            service: item.description || "",
            remarks: "",
            rate: item.total_price || 0,
          });
        }
      });

      // Set form with loaded data
      setForm({
        customerId: quotation.customer_id || "",
        customerName: quotation.customers?.name || "",
        customerPhone: quotation.customers?.phone || "",
        eventType: quotation.event_type || "",
        eventDate: quotation.event_date || "",
        eventVenue: quotation.event_venue || "",
        eventCity: quotation.event_city || "",
        packageType: quotation.package_type || "",
        photoServices: photoServices.length > 0 ? photoServices : [createPhotoService()],
        videoServices: videoServices.length > 0 ? videoServices : [createVideoService()],
        additionalServices: additionalServicesArr,
        numAlbums: quotation.num_albums || 0,
        sheetsPerAlbum: quotation.sheets_per_album || 0,
        totalPhotos: quotation.total_photos || 0,
        albumSize: quotation.album_size || "",
        miniBooks: quotation.mini_books || 0,
        calendars: quotation.calendars || 0,
        frames: quotation.frames || 0,
        discountPercent: quotation.discount_percent || 0,
        notes: quotation.notes || "",
      });

      // Initialize manual discount amount if it differs from calculated
      if (quotation.discount_amount && quotation.discount_percent) {
        const calculated = Math.round((quotation.subtotal * quotation.discount_percent) / 100);
        if (Math.abs(quotation.discount_amount - calculated) > 1) {
          setDiscountAmountManual(quotation.discount_amount);
        }
      }

    } catch (error) {
      console.error("Error loading quotation:", error);
      setMessage({ type: "error", text: "Failed to load quotation for editing" });
    }
  };

  // Calculate totals
  const totalSheets = form.numAlbums * form.sheetsPerAlbum;
  const photographyTotal = form.photoServices.reduce((sum, ps) => sum + ps.rate, 0);
  const videographyTotal = form.videoServices.reduce((sum, vs) => sum + vs.rate, 0);
  const additionalServicesTotal = form.additionalServices.reduce((sum, as) => sum + as.rate, 0);
  const subtotal = photographyTotal + videographyTotal + additionalServicesTotal;
  const calculatedDiscountAmount = Math.round((subtotal * form.discountPercent) / 100);
  const discountAmount = discountAmountManual !== null ? discountAmountManual : calculatedDiscountAmount;
  const totalAmount = subtotal - discountAmount;

  // Handle form changes
  const handleChange = (field: keyof QuotationForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Photography Service handlers
  const addPhotoService = () => {
    setForm((prev) => ({
      ...prev,
      photoServices: [...prev.photoServices, createPhotoService()],
    }));
  };

  const updatePhotoService = (id: string, field: keyof PhotoService, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      photoServices: prev.photoServices.map((ps) =>
        ps.id === id ? { ...ps, [field]: value } : ps
      ),
    }));
  };

  const removePhotoService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      photoServices: prev.photoServices.filter((ps) => ps.id !== id),
    }));
  };

  // Videography Service handlers
  const addVideoService = () => {
    setForm((prev) => ({
      ...prev,
      videoServices: [...prev.videoServices, createVideoService()],
    }));
  };

  const updateVideoService = (id: string, field: keyof VideoService, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      videoServices: prev.videoServices.map((vs) =>
        vs.id === id ? { ...vs, [field]: value } : vs
      ),
    }));
  };

  const removeVideoService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      videoServices: prev.videoServices.filter((vs) => vs.id !== id),
    }));
  };

  // Additional Service handlers
  const addAdditionalService = () => {
    setForm((prev) => ({
      ...prev,
      additionalServices: [...prev.additionalServices, createAdditionalService()],
    }));
  };

  const updateAdditionalService = (id: string, field: keyof AdditionalService, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      additionalServices: prev.additionalServices.map((as) =>
        as.id === id ? { ...as, [field]: value } : as
      ),
    }));
  };

  const removeAdditionalService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      additionalServices: prev.additionalServices.filter((as) => as.id !== id),
    }));
  };

  // Generate quotation number (sequential)
  const generateQuotationNumber = async () => {
    if (!supabase) {
      const year = new Date().getFullYear().toString().slice(-2);
      return `QT_AKP_${year}_0001`;
    }

    const { data } = await supabase
      .from("quotations")
      .select("quotation_number")
      .order("created_at", { ascending: false })
      .limit(1);

    const year = new Date().getFullYear().toString().slice(-2);
    if (!data || data.length === 0) {
      return `QT_AKP_${year}_0001`;
    }

    const lastNumber = data[0].quotation_number;
    const match = lastNumber.match(/_(\d{4})$/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `QT_AKP_${year}_${nextNum.toString().padStart(4, "0")}`;
  };

  // Handle form submission (Create or Update)
  const handleSubmit = async () => {
    if (!form.eventType) {
      setMessage({ type: "error", text: "Event type is required. Please go back and fill customer details." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (!supabase) {
        setMessage({ type: "success", text: "Quotation preview created (Supabase not configured)" });
        setSaving(false);
        return;
      }

      const isValidUUID = form.customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.customerId);

      // Get primary photo/video service for snapshot (first one with rate > 0)
      const primaryPhoto = form.photoServices.find((ps) => ps.rate > 0) || form.photoServices[0];
      const primaryVideo = form.videoServices.find((vs) => vs.rate > 0) || form.videoServices[0];

      const quotationData = {
        customer_id: isValidUUID ? form.customerId : null,
        event_type: form.eventType,
        event_date: form.eventDate || null,
        event_venue: form.eventVenue || null,
        event_city: form.eventCity || null,
        package_type: form.packageType || null,
        // Primary Photography Details (Snapshot)
        photo_type: primaryPhoto?.type || null,
        photo_area: primaryPhoto?.area || null,
        photo_cameras: primaryPhoto?.cameras || 1,
        photo_rate: photographyTotal,
        photo_session: primaryPhoto?.session || null,
        // Primary Videography Details (Snapshot)
        video_type: primaryVideo?.type || null,
        video_area: primaryVideo?.area || null,
        video_cameras: primaryVideo?.cameras || 1,
        video_rate: videographyTotal,
        video_session: primaryVideo?.session || null,
        // Album Details (Snapshot)
        num_albums: form.numAlbums || 0,
        sheets_per_album: form.sheetsPerAlbum || 0,
        total_photos: form.totalPhotos || 0,
        album_size: form.albumSize || null,
        // Print & Gifts (Snapshot)
        mini_books: form.miniBooks || 0,
        calendars: form.calendars || 0,
        frames: form.frames || 0,
        // Pricing
        subtotal: subtotal,
        discount_percent: form.discountPercent,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: form.notes || null,
      };

      let quotationId: string;

      if (isEditMode && editQuotationId) {
        // UPDATE existing quotation
        const { error: updateError } = await supabase
          .from("quotations")
          .update(quotationData)
          .eq("id", editQuotationId);

        if (updateError) {
          console.error("Update error:", updateError);
          throw updateError;
        }

        quotationId = editQuotationId;

        // Delete existing items before re-creating
        await supabase.from("quotation_items").delete().eq("quotation_id", quotationId);

      } else {
        // CREATE new quotation
        const quotationNumber = await generateQuotationNumber();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        const { data: quotation, error: quotationError } = await supabase
          .from("quotations")
          .insert({
            ...quotationData,
            quotation_number: quotationNumber,
            status: "Draft",
            valid_until: validUntil.toISOString().split("T")[0],
          })
          .select()
          .single();

        if (quotationError) {
          console.error("Quotation error details:", quotationError);
          throw quotationError;
        }

        quotationId = quotation.id;
      }

      // Create quotation items with categories
      const items = [];
      
      // Photography Services
      form.photoServices.forEach((ps, index) => {
        if (ps.rate > 0 || ps.type) {
          items.push({
            quotation_id: quotationId,
            category: "Photography",
            description: `Photography ${index + 1} - ${ps.type || "Standard"} (${ps.session || "Full Session"}) - ${ps.area || "All Areas"}`,
            quantity: ps.cameras,
            unit_price: ps.rate,
            total_price: ps.rate,
          });
        }
      });

      // Videography Services
      form.videoServices.forEach((vs, index) => {
        if (vs.rate > 0 || vs.type) {
          items.push({
            quotation_id: quotationId,
            category: "Videography",
            description: `Videography ${index + 1} - ${vs.type || "Standard"} (${vs.session || "Full Session"}) - ${vs.area || "All Areas"}`,
            quantity: vs.cameras,
            unit_price: vs.rate,
            total_price: vs.rate,
          });
        }
      });

      // Additional Services
      form.additionalServices.forEach((as) => {
        if (as.rate > 0 || as.service) {
          items.push({
            quotation_id: quotationId,
            category: "Additional Services",
            description: as.service + (as.remarks ? `: ${as.remarks}` : ""),
            quantity: 1,
            unit_price: as.rate,
            total_price: as.rate,
          });
        }
      });

      // Album
      if (form.numAlbums > 0) {
        items.push({
          quotation_id: quotationId,
          category: "Album",
          description: `Photo Album - ${form.albumSize || "Standard"} (${form.sheetsPerAlbum} sheets each)`,
          quantity: form.numAlbums,
          unit_price: 0,
          total_price: 0,
        });
      }

      // Print & Gifts
      if (form.miniBooks > 0) {
        items.push({
          quotation_id: quotationId,
          category: "Print & Gifts",
          description: "Mini Books",
          quantity: form.miniBooks,
          unit_price: 0,
          total_price: 0,
        });
      }

      if (form.calendars > 0) {
        items.push({
          quotation_id: quotationId,
          category: "Print & Gifts",
          description: "Calendar (Wall / Table)",
          quantity: form.calendars,
          unit_price: 0,
          total_price: 0,
        });
      }

      if (form.frames > 0) {
        items.push({
          quotation_id: quotationId,
          category: "Print & Gifts",
          description: "Family & Couple Frames",
          quantity: form.frames,
          unit_price: 0,
          total_price: 0,
        });
      }

      if (items.length > 0) {
        await supabase.from("quotation_items").insert(items);
      }

      const successMsg = isEditMode 
        ? `Quotation ${editQuotationNumber} updated successfully! Redirecting...`
        : `Quotation created successfully! Redirecting to quotations...`;
      setMessage({ type: "success", text: successMsg });
      
      setTimeout(() => {
        router.push("/quotations");
      }, 2000);

    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; details?: string };
      console.error("Error saving quotation:", err.message || err.code);
      const errorMsg = err.message || err.details || `Failed to ${isEditMode ? "update" : "create"} quotation. Make sure the database schema is set up.`;
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
  const selectClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Quotation</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {isEditMode ? `Edit Quotation` : "Create Quotation"}
          </h2>
          {isEditMode && editQuotationNumber ? (
            <p className="mt-1 text-sm font-mono text-[var(--primary)]">{editQuotationNumber}</p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Format: <span className="font-mono text-[var(--primary)]">QT_AKP_YY_0000</span>
            </p>
          )}
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

      {/* Customer Info Summary (Read-only) */}
      <SectionCard title="Customer & Event Details" description="From customer registration">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Customer Name</p>
            <p className="font-medium text-[var(--foreground)]">{form.customerName || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Phone</p>
            <p className="font-medium text-[var(--foreground)]">{form.customerPhone || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Event Type</p>
            <p className="font-medium text-[var(--foreground)]">{form.eventType || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Event Date</p>
            <p className="font-medium text-[var(--foreground)]">{form.eventDate || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3 sm:col-span-2">
            <p className="text-xs text-[var(--muted-foreground)]">Venue</p>
            <p className="font-medium text-[var(--foreground)]">{form.eventVenue || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">City</p>
            <p className="font-medium text-[var(--foreground)]">{form.eventCity || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Package</p>
            <p className="font-medium text-[var(--foreground)]">{form.packageType || "—"}</p>
          </div>
        </div>
        {!form.customerName && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <span>⚠️</span>
            <span>No customer data. <a href="/customers/new" className="font-medium underline">Create a customer first</a></span>
          </div>
        )}
      </SectionCard>

      {/* Photography Services - Multiple */}
      <SectionCard 
        title={`📸 Photography Services (${form.photoServices.length})`} 
        description={`Total: ₹${photographyTotal.toLocaleString()}`}
      >
        <div className="flex flex-col gap-4">
          {form.photoServices.map((ps, index) => (
            <div key={ps.id} className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">Photography {index + 1}</span>
                {form.photoServices.length > 1 && (
                  <button
                    onClick={() => removePhotoService(ps.id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Type</label>
                  <select 
                    className={selectClass}
                    value={ps.type}
                    onChange={(e) => updatePhotoService(ps.id, "type", e.target.value)}
                  >
                    <option value="">Select type</option>
                    {coverageTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Area</label>
                  <select 
                    className={selectClass}
                    value={ps.area}
                    onChange={(e) => updatePhotoService(ps.id, "area", e.target.value)}
                  >
                    <option value="">Select area</option>
                    {coverageAreas.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Cameras</label>
                  <input 
                    type="number" 
                    min="1" 
                    className={inputClass}
                    value={ps.cameras}
                    onChange={(e) => updatePhotoService(ps.id, "cameras", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Session</label>
                  <select 
                    className={selectClass}
                    value={ps.session}
                    onChange={(e) => updatePhotoService(ps.id, "session", e.target.value)}
                  >
                    <option value="">Select session</option>
                    {sessionTypes.map((session) => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Rate (₹)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className={`${inputClass} font-semibold`}
                    value={ps.rate || ""}
                    onChange={(e) => updatePhotoService(ps.id, "rate", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addPhotoService}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <span className="text-lg">+</span> Add Photography Service
          </button>
        </div>

        {/* Photography Total */}
        {photographyTotal > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2">
              <span className="text-sm text-blue-700">Photography Total: </span>
              <span className="text-lg font-bold text-blue-700">₹{photographyTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Videography Services - Multiple */}
      <SectionCard 
        title={`🎬 Videography Services (${form.videoServices.length})`} 
        description={`Total: ₹${videographyTotal.toLocaleString()}`}
      >
        <div className="flex flex-col gap-4">
          {form.videoServices.map((vs, index) => (
            <div key={vs.id} className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">Videography {index + 1}</span>
                {form.videoServices.length > 1 && (
                  <button
                    onClick={() => removeVideoService(vs.id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Type</label>
                  <select 
                    className={selectClass}
                    value={vs.type}
                    onChange={(e) => updateVideoService(vs.id, "type", e.target.value)}
                  >
                    <option value="">Select type</option>
                    {coverageTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Area</label>
                  <select 
                    className={selectClass}
                    value={vs.area}
                    onChange={(e) => updateVideoService(vs.id, "area", e.target.value)}
                  >
                    <option value="">Select area</option>
                    {coverageAreas.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Cameras</label>
                  <input 
                    type="number" 
                    min="1" 
                    className={inputClass}
                    value={vs.cameras}
                    onChange={(e) => updateVideoService(vs.id, "cameras", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Session</label>
                  <select 
                    className={selectClass}
                    value={vs.session}
                    onChange={(e) => updateVideoService(vs.id, "session", e.target.value)}
                  >
                    <option value="">Select session</option>
                    {sessionTypes.map((session) => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Rate (₹)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className={`${inputClass} font-semibold`}
                    value={vs.rate || ""}
                    onChange={(e) => updateVideoService(vs.id, "rate", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addVideoService}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <span className="text-lg">+</span> Add Videography Service
          </button>
        </div>

        {/* Videography Total */}
        {videographyTotal > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-2">
              <span className="text-sm text-purple-700">Videography Total: </span>
              <span className="text-lg font-bold text-purple-700">₹{videographyTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Additional Services - Multiple */}
      <SectionCard 
        title={`✨ Additional Services (${form.additionalServices.length})`} 
        description={`Total: ₹${additionalServicesTotal.toLocaleString()}`}
      >
        <div className="flex flex-col gap-4">
          {form.additionalServices.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No additional services added yet</p>
          ) : (
            form.additionalServices.map((as, index) => (
              <div key={as.id} className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Service {index + 1}</span>
                  <button
                    onClick={() => removeAdditionalService(as.id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">Service Type</label>
                    <select 
                      className={selectClass}
                      value={as.service}
                      onChange={(e) => updateAdditionalService(as.id, "service", e.target.value)}
                    >
                      <option value="">Select service</option>
                      {additionalServices.map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">Remarks</label>
                    <input 
                      type="text" 
                      placeholder="Additional notes..."
                      className={inputClass}
                      value={as.remarks}
                      onChange={(e) => updateAdditionalService(as.id, "remarks", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">Rate (₹)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className={`${inputClass} font-semibold`}
                      value={as.rate || ""}
                      onChange={(e) => updateAdditionalService(as.id, "rate", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          
          <button
            onClick={addAdditionalService}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <span className="text-lg">+</span> Add Additional Service
          </button>
        </div>

        {/* Additional Services Total */}
        {additionalServicesTotal > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
              <span className="text-sm text-amber-700">Additional Total: </span>
              <span className="text-lg font-bold text-amber-700">₹{additionalServicesTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Deliverables */}
      <SectionCard title="📚 Deliverables" description="Album and photo selection details">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Number of Albums</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.numAlbums || ""}
              onChange={(e) => handleChange("numAlbums", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Sheets per Album</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.sheetsPerAlbum || ""}
              onChange={(e) => handleChange("sheetsPerAlbum", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Total Sheets <span className="text-[var(--muted-foreground)]">(Auto)</span></label>
            <input 
              type="number" 
              readOnly 
              value={totalSheets}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 text-sm text-[var(--muted-foreground)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Total Photos for Selection</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.totalPhotos || ""}
              onChange={(e) => handleChange("totalPhotos", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
            <label className="text-sm font-medium text-[var(--foreground)]">Album Size</label>
            <select 
              className={selectClass}
              value={form.albumSize}
              onChange={(e) => handleChange("albumSize", e.target.value)}
            >
              <option value="">Select size</option>
              {albumSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Print & Gifts */}
      <SectionCard title="🎁 Print & Gifts" description="Optional extras">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Mini Books</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.miniBooks || ""}
              onChange={(e) => handleChange("miniBooks", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Calendar (Wall / Table)</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.calendars || ""}
              onChange={(e) => handleChange("calendars", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Family & Couple Frames</label>
            <input 
              type="number" 
              min="0"
              className={inputClass}
              value={form.frames || ""}
              onChange={(e) => handleChange("frames", parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Pricing & Notes */}
      <SectionCard title="💰 Pricing & Notes" description="Discount and additional notes">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Discount (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  step="0.01"
                  className={inputClass}
                  value={form.discountPercent || ""}
                  onChange={(e) => {
                    handleChange("discountPercent", parseFloat(e.target.value) || 0);
                    setDiscountAmountManual(null); // Reset manual amount when percent changes
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Discount Amount (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  min="0"
                  step="1"
                  value={discountAmount}
                  onChange={(e) => {
                    const val = Math.round(parseFloat(e.target.value) || 0);
                    setDiscountAmountManual(val);
                  }}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Calculated: ₹{calculatedDiscountAmount.toLocaleString("en-IN")} • Edit to override
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Notes</label>
            <input 
              className={inputClass}
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Total & Actions */}
      <div className="sticky bottom-0 z-30 -mx-6 bg-[var(--background)]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            {/* Service Breakdown */}
            <div className="flex flex-wrap gap-4 text-sm">
              {photographyTotal > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--muted-foreground)]">📸</span>
                  <span className="text-blue-600 font-medium">₹{photographyTotal.toLocaleString()}</span>
                </div>
              )}
              {videographyTotal > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--muted-foreground)]">🎬</span>
                  <span className="text-purple-600 font-medium">₹{videographyTotal.toLocaleString()}</span>
                </div>
              )}
              {additionalServicesTotal > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--muted-foreground)]">✨</span>
                  <span className="text-amber-600 font-medium">₹{additionalServicesTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {/* Subtotal & Discount */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Subtotal</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">₹{subtotal.toLocaleString()}</p>
              </div>
              {form.discountPercent > 0 && (
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Discount ({form.discountPercent}%)</p>
                  <p className="text-lg font-semibold text-red-500">-₹{discountAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
            
            {/* Grand Total */}
            <div className="border-t border-[var(--border)] pt-2">
              <p className="text-sm text-[var(--muted-foreground)]">Total Amount (INR)</p>
              <p className="text-3xl font-bold text-[var(--foreground)]">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
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
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Quotation" : "Create Quotation"
              )}
            </button>
            <button 
              onClick={() => router.push(isEditMode ? "/quotations" : "/customers/new")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 text-sm font-semibold text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            >
              {isEditMode ? "Cancel" : "Back"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuotationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <QuotationContent />
    </Suspense>
  );
}
