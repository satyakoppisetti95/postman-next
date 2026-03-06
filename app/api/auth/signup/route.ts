import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { email, username, password } = body;
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Email, username and password required" },
        { status: 400 }
      );
    }
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 400 }
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      passwordHash,
    });
    return NextResponse.json(
      { user: { id: user._id, email: user.email, username: user.username } },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
