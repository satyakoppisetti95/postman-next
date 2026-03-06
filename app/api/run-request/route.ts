import { NextRequest, NextResponse } from "next/server";
import { runHttpRequest } from "@/lib/requestRunner";
import { getCurrentUserId } from "@/lib/auth";
import type { RequestDef, EnvVariable } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json();
    const request = body.request as RequestDef;
    const envVars = (body.envVars ?? []) as EnvVariable[];
    if (!request || !request.method || !request.url) {
      return NextResponse.json(
        { error: "request.method and request.url required" },
        { status: 400 }
      );
    }
    const result = await runHttpRequest(request, envVars);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
