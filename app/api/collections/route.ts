import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Collection from "@/lib/models/Collection";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const collections = await Collection.find({ userId })
      .sort({ updatedAt: -1 })
      .select("name description updatedAt")
      .lean();
    return NextResponse.json(collections);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list collections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json();
    const col = await Collection.create({
      userId,
      name: body.name || "New Collection",
      description: body.description || "",
      requests: [],
    });
    return NextResponse.json(col, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
