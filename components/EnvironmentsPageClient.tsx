"use client";

import Link from "next/link";
import { useIsElectron } from "@/hooks/useIsElectron";
import EnvironmentsManager from "./EnvironmentsManager";
import type { EnvironmentDoc } from "@/lib/api-types";

interface EnvironmentsPageClientProps {
  initialEnvironments: EnvironmentDoc[];
}

export default function EnvironmentsPageClient({
  initialEnvironments,
}: EnvironmentsPageClientProps) {
  const isElectron = useIsElectron();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header
        className={`border-b border-slate-800 flex items-center gap-4 ${
          isElectron ? "pl-24 pt-8 pb-2 pr-4 electron-drag" : "px-4 py-2"
        }`}
      >
        <Link
          href="/collections"
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Environments</h1>
      </header>
      <main className="p-4">
        <EnvironmentsManager initialEnvironments={initialEnvironments} />
      </main>
    </div>
  );
}
