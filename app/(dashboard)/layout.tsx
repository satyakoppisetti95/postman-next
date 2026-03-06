import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login");
  }
  return <>{children}</>;
}
