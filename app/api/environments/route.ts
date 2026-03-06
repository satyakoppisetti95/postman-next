import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Environment from "@/lib/models/Environment";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const envs = await Environment.find({ userId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(envs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list environments" }, { status: 500 });
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
    const env = await Environment.create({
      userId,
      name: body.name || "New Environment",
      variables: body.variables || [],
    });
    return NextResponse.json(env, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create environment" }, { status: 500 });
  }
}
