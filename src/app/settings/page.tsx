"use client";

import SectionCard from "@/components/SectionCard";
import { useTheme } from "@/lib/ThemeContext";

export default function SettingsPage() {
  const { theme, setTheme, colorTheme, setColorTheme, resolvedTheme } = useTheme();

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
