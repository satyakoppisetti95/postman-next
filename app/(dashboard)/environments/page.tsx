import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import Environment from "@/lib/models/Environment";
import { redirect } from "next/navigation";
import EnvironmentsPageClient from "@/components/EnvironmentsPageClient";

export default async function EnvironmentsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/login");
  await connectDB();
  const environments = await Environment.find({ userId }).sort({ updatedAt: -1 }).lean();
  const data = JSON.parse(JSON.stringify(environments));
  return <EnvironmentsPageClient initialEnvironments={data} />;
}
