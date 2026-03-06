import { substituteVariables } from "./variables";
import type { RequestDef, EnvVariable } from "./types";

export interface RunResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  durationMs: number;
  bodyText: string;
}

export async function runHttpRequest(
  reqDef: RequestDef,
  envVars: EnvVariable[]
): Promise<RunResult> {
  const urlWithVars = substituteVariables(reqDef.url, envVars);
  const enabledParams = (reqDef.queryParams || []).filter((p) => p.enabled !== false);
  let urlObj: URL;
  try {
    urlObj = new URL(urlWithVars);
  } catch {
    urlObj = new URL(urlWithVars, "http://localhost");
  }
  enabledParams.forEach((p) =>
    urlObj.searchParams.set(p.key, substituteVariables(p.value, envVars))
  );

  const headers: Record<string, string> = {};
  (reqDef.headers || [])
    .filter((h) => h.enabled !== false)
    .forEach((h) => {
      headers[h.key] = substituteVariables(h.value, envVars);
    });

  if (reqDef.auth?.type === "basic" && reqDef.auth.basic) {
    const token = Buffer.from(
      `${reqDef.auth.basic.username}:${reqDef.auth.basic.password}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }

  let body: BodyInit | undefined;
  if (reqDef.method !== "GET") {
    if (reqDef.body?.mode === "json" && reqDef.body.json !== undefined) {
      headers["Content-Type"] = "application/json";
      const raw =
        typeof reqDef.body.json === "string"
          ? reqDef.body.json
          : JSON.stringify(reqDef.body.json);
      body = substituteVariables(raw, envVars);
    } else if (reqDef.body?.mode === "text" && reqDef.body.text) {
      body = substituteVariables(reqDef.body.text, envVars);
    } else if (reqDef.body?.mode === "form-urlencoded" && reqDef.body.formUrlEncoded) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      const usp = new URLSearchParams();
      reqDef.body.formUrlEncoded
        .filter((f) => f.enabled !== false)
        .forEach((f) =>
          usp.append(f.key, substituteVariables(f.value, envVars))
        );
      body = usp.toString();
    }
  }

  const start = performance.now();
  const res = await fetch(urlObj.toString(), {
    method: reqDef.method,
    headers,
    body,
  });
  const end = performance.now();
  const durationMs = Math.round(end - start);

  const resHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    resHeaders[key] = value;
  });

  const bodyText = await res.text();

  return {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
    durationMs,
    bodyText,
  };
}
