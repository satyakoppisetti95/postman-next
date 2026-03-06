import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Environment from "@/lib/models/Environment";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    const env = await Environment.findOne({ _id: id, userId }).lean();
    if (!env) {
      return NextResponse.json({ error: "Environment not found" }, { status: 404 });
    }
    return NextResponse.json(env);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get environment" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const env = await Environment.findOneAndUpdate(
      { _id: id, userId },
      { name: body.name, variables: body.variables ?? [] },
      { new: true }
    ).lean();
    if (!env) {
      return NextResponse.json({ error: "Environment not found" }, { status: 404 });
    }
    return NextResponse.json(env);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update environment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    const result = await Environment.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return NextResponse.json({ error: "Environment not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete environment" }, { status: 500 });
  }
}
