"use client";

import { useState } from "react";
import type { RunResult } from "@/lib/requestRunner";

interface ResponseViewerProps {
  result: RunResult | null;
}

export default function ResponseViewer({ result }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "raw">("body");

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 p-4 text-sm">
        Send a request to see the response
      </div>
    );
  }

  const statusOk = result.status >= 200 && result.status < 300;
  let bodyPreview = result.bodyText;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(result.bodyText);
  } catch {
    // not JSON
  }
  if (parsed !== null) {
    bodyPreview = JSON.stringify(parsed, null, 2);
  }

  const contentLength = result.headers["content-length"] ?? result.bodyText.length;
  const contentType = result.headers["content-type"] ?? "—";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-4 border-b border-slate-800 px-4 py-2">
        <span
          className={`font-mono text-sm font-medium ${
            statusOk ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.status} {result.statusText}
        </span>
        <span className="text-slate-400 text-sm">{result.durationMs} ms</span>
        <span className="text-slate-500 text-sm">
          {contentType} · {contentLength} bytes
        </span>
      </div>
      <div className="flex border-b border-slate-800">
        {(["body", "headers", "raw"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? "border-b-2 border-orange-500 text-orange-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "body" && (
          <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
            {bodyPreview || "(empty)"}
          </pre>
        )}
        {activeTab === "headers" && (
          <div className="space-y-1 font-mono text-sm">
            {Object.entries(result.headers).map(([k, v]) => (
              <div key={k} className="text-slate-400">
                <span className="text-slate-500">{k}:</span> {v}
              </div>
            ))}
          </div>
        )}
        {activeTab === "raw" && (
          <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
            {result.bodyText || "(empty)"}
          </pre>
        )}
      </div>
    </div>
  );
}
