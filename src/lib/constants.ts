export const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers/new", label: "New Customer" },
  { href: "/quotations", label: "Quotations" },
  { href: "/orders", label: "Orders" },
  { href: "/payments", label: "Payments" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

// Date formatting utility - DD-MMM-YYYY format (e.g., 15-Mar-2026)
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const eventTypes = [
  "Engagement",
  "Reception",
  "Wedding",
  "Engagement, Reception & Wedding",
  "Puberty",
  "Baby Shower (Maternity)",
  "Corporate Event",
  "School / College Event",
  "House Warming",
  "Ear Piercing",
  "Tonsure Event",
  "Others",
];

export const packageTypes = [
  "Package 1",
  "Package 2",
  "Package 3",
  "Package 4",
  "Package 5",
  "Custom Package",
];

export const sessionTypes = [
  "Half Session",
  "Full Session",
  "Half and Full Session",
  "Two Sessions",
  "Not Needed",
];

export const coverageAreas = ["Stage", "Receiving", "Ritual", "Extra"];

export const coverageTypes = ["Traditional", "Candid", "Semi-Candid"];

export const additionalServices = [
  "Drone Photography",
  "Drone Videography",
  "Pre-Wedding Shoot",
  "Post-Wedding Shoot",
  "Outdoor Shoot",
  "LED Wall",
  "Live Streaming",
  "Spinny 360",
  "Live Frames",
  "Photo Booth",
  "LED Wall & Live Mixing Unit",
  "Others",
];

export const albumSizes = [
  "10x30 Flat",
  "12x30 Flat",
  "12x36 Flat",
  "15x24 Book",
  "16x24 Book",
  "18x24 Book",
  "Others",
];

export const reportPeriods = [
  "Monthly",
  "Quarterly",
  "Half-Yearly",
  "Annually",
];

export const workflowStages = [
  "Photo Selection",
  "Album Design",
  "Album Printing",
  "Video Editing",
  "Outdoor Shoot",
  "Album Delivery",
];

export const paymentTypes = [
  "Initial Advance",
  "Function Advance",
  "Printing Advance",
  "Final Payment",
];

export const paymentMethods = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Card",
];
