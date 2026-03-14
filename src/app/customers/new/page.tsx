"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/quotation");
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Create Quotation</p>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Customer Details Moved</h2>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Customer details are now captured on the quotation page.
      </p>
      <Link
        href="/quotation"
        className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
      >
        Go to Quotation
      </Link>
    </div>
  );
}
