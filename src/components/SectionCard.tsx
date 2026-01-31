import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function SectionCard({
  title,
  description,
  children,
  action,
}: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <header className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--secondary)]/50 to-transparent px-3 xs:px-6 py-3 xs:py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      <div className="p-3 xs:p-6">{children}</div>
    </section>
  );
}
