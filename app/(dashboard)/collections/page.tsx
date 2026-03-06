import { connectDB } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import Environment from "@/lib/models/Environment";
import Collection from "@/lib/models/Collection";
import CollectionsView from "@/components/CollectionsView";

export default async function CollectionsPage() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  await connectDB();
  const [collections, environments] = await Promise.all([
    Collection.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Environment.find({ userId }).sort({ updatedAt: -1 }).lean(),
  ]);

  const collectionsJson = JSON.parse(JSON.stringify(collections));
  const environmentsJson = JSON.parse(JSON.stringify(environments));

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <CollectionsView
        initialCollections={collectionsJson}
        initialEnvironments={environmentsJson}
      />
    </div>
  );
}
