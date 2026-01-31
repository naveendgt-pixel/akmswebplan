"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/constants";
import AuthButton from "@/components/AuthButton";

const isActiveRoute = (pathname: string, href: string) => {
  if (href === "/dashboard" && pathname === "/") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
};

const navIcons: Record<string, string> = {
  "/dashboard": "📊",
  "/customers/new": "👤",
  "/quotation": "📝",
  "/quotations": "📋",
  "/services": "🎯",
  "/orders": "📦",
  "/payments": "💳",
  "/reports": "📈",
  "/settings": "⚙️",
};

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-2 py-2 sm:gap-4 sm:px-4 sm:py-3 md:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
            <div className="flex h-9 w-9 xs:h-10 xs:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg shadow-[var(--primary)]/25 overflow-hidden">
              <img src="/Untitled-1.png" alt="Aura Knot Logo" className="h-8 w-8 xs:h-9 xs:w-9 object-contain" />
              <span className="sr-only">Aura Knot</span>
            </div>
            <div className="hidden xs:block">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight">Aura Knot</h1>
              <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">
                Event Management
              </p>
            </div>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`fixed left-0 top-0 z-50 h-full w-64 max-w-[90vw] transform bg-[var(--card)] shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg overflow-hidden">
                <img src="/Untitled-1.png" alt="Aura Knot Logo" className="h-9 w-9 object-contain" />
                <span className="sr-only">Aura Knot</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Aura Knot</h1>
                <p className="text-xs text-[var(--muted-foreground)]">Event Management</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="mb-2 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Navigation
              </p>
            </div>
            {navItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-md shadow-[var(--primary)]/25"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className={`text-base ${active ? "drop-shadow-sm" : "opacity-70 group-hover:opacity-100"}`}>
                    {navIcons[item.href] || "•"}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row gap-4 md:gap-6 px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6 flex-1">
        {/* Desktop Sidebar */}
        <aside className="sticky top-[73px] hidden h-[calc(100vh-97px)] w-48 xl:w-56 shrink-0 lg:block">
          <nav className="flex h-full flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
            <div className="mb-2 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Navigation
              </p>
            </div>
            {navItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-md shadow-[var(--primary)]/25"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className={`text-base ${active ? "drop-shadow-sm" : "opacity-70 group-hover:opacity-100"}`}>
                    {navIcons[item.href] || "•"}
                  </span>
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-auto border-t border-[var(--border)] pt-3">
              <div className="rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 p-3">
                <p className="text-xs font-medium text-[var(--foreground)]">Pro Tip</p>
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  Use keyboard shortcuts for faster navigation
                </p>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 w-full">
          <div className="flex flex-col gap-3 xs:gap-4 sm:gap-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around px-1 py-1 xs:px-2 xs:py-2">
          {navItems.slice(0, 5).map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all ${
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                <span className={`text-lg ${active ? "scale-110" : ""}`}>
                  {navIcons[item.href] || "•"}
                </span>
                <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-14 xs:h-16 lg:hidden" />
    </div>
  );
}
