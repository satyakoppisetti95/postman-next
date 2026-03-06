import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import Environment from "@/lib/models/Environment";
import { redirect } from "next/navigation";
import EnvironmentsManager from "@/components/EnvironmentsManager";

export default async function EnvironmentsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/login");
  await connectDB();
  const environments = await Environment.find({ userId }).sort({ updatedAt: -1 }).lean();
  const data = JSON.parse(JSON.stringify(environments));
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-2 flex items-center gap-4">
        <a href="/collections" className="text-slate-400 hover:text-slate-200">
          ← Back
        </a>
        <h1 className="text-lg font-semibold">Environments</h1>
      </header>
      <main className="p-4">
        <EnvironmentsManager initialEnvironments={data} />
      </main>
    </div>
  );
}
