"use client";

import { useState, useEffect, useCallback } from "react";
import type { RequestDoc } from "@/lib/api-types";
import type { EnvVariable } from "@/lib/types";
import { Send, Save } from "lucide-react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const BODY_MODES = ["none", "json", "text", "form-urlencoded"] as const;

const emptyRequest: Partial<RequestDoc> = {
  name: "New Request",
  method: "GET",
  url: "",
  headers: [],
  queryParams: [],
  body: { mode: "none" },
  auth: { type: "none" },
};

interface RequestEditorProps {
  request: RequestDoc | null;
  envVars: EnvVariable[];
  onSave: (req: RequestDoc) => void;
  onSend: (req: RequestDoc) => void;
  saving: boolean;
  sendingRequest?: boolean;
  collectionId: string | null;
}

export default function RequestEditor({
  request,
  envVars,
  onSave,
  onSend,
  saving,
  sendingRequest = false,
  collectionId,
}: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "auth">("headers");
  const [edited, setEdited] = useState<RequestDoc | null>(null);

  useEffect(() => {
    if (request) {
      setEdited({
        ...emptyRequest,
        ...request,
        _id: request._id,
        name: request.name ?? "New Request",
        method: request.method ?? "GET",
        url: request.url ?? "",
        headers: request.headers ?? [],
        queryParams: request.queryParams ?? [],
        body: request.body ?? { mode: "none" },
        auth: request.auth ?? { type: "none" },
      });
    } else {
      setEdited(null);
    }
  }, [request?._id, request?.method, request?.url, request?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((patch: Partial<RequestDoc>) => {
    setEdited((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  const updateBody = useCallback((patch: Partial<RequestDoc["body"]>) => {
    setEdited((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        body: { ...prev.body, mode: prev.body?.mode ?? "none", ...patch },
      };
    });
  }, []);

  const updateAuth = useCallback((patch: Partial<RequestDoc["auth"]>) => {
    setEdited((prev) => {
      if (!prev) return null;
      return { ...prev, auth: { ...prev.auth, type: prev.auth?.type ?? "none", ...patch } };
    });
  }, []);

  const addRow = useCallback(
    (field: "headers" | "queryParams" | "formUrlEncoded") => {
      setEdited((prev) => {
        if (!prev) return null;
        if (field === "headers") {
          const list = [...(prev.headers ?? []), { key: "", value: "", enabled: true }];
          return { ...prev, headers: list };
        }
        if (field === "queryParams") {
          const list = [...(prev.queryParams ?? []), { key: "", value: "", enabled: true }];
          return { ...prev, queryParams: list };
        }
        if (field === "formUrlEncoded" && prev.body) {
          const list = [
            ...(prev.body.formUrlEncoded ?? []),
            { key: "", value: "", enabled: true },
          ];
          return { ...prev, body: { ...prev.body, formUrlEncoded: list } };
        }
        return prev;
      });
    },
    []
  );

  const updateRow = useCallback(
    (
      field: "headers" | "queryParams" | "formUrlEncoded",
      index: number,
      key: string,
      value: string | boolean
    ) => {
      setEdited((prev) => {
        if (!prev) return null;
        if (field === "headers") {
          const list = [...(prev.headers ?? [])];
          const row = list[index];
          if (!row) return prev;
          if (key === "key") list[index] = { ...row, key: value as string };
          else if (key === "value") list[index] = { ...row, value: value as string };
          else if (key === "enabled") list[index] = { ...row, enabled: value as boolean };
          return { ...prev, headers: list };
        }
        if (field === "queryParams") {
          const list = [...(prev.queryParams ?? [])];
          const row = list[index];
          if (!row) return prev;
          if (key === "key") list[index] = { ...row, key: value as string };
          else if (key === "value") list[index] = { ...row, value: value as string };
          else if (key === "enabled") list[index] = { ...row, enabled: value as boolean };
          return { ...prev, queryParams: list };
        }
        if (field === "formUrlEncoded" && prev.body?.formUrlEncoded) {
          const list = [...prev.body.formUrlEncoded];
          const row = list[index];
          if (!row) return prev;
          if (key === "key") list[index] = { ...row, key: value as string };
          else if (key === "value") list[index] = { ...row, value: value as string };
          else if (key === "enabled") list[index] = { ...row, enabled: value as boolean };
          return { ...prev, body: { ...prev.body, formUrlEncoded: list } };
        }
        return prev;
      });
    },
    []
  );

  const removeRow = useCallback(
    (field: "headers" | "queryParams" | "formUrlEncoded", index: number) => {
      setEdited((prev) => {
        if (!prev) return null;
        if (field === "headers") {
          const list = (prev.headers ?? []).filter((_, i) => i !== index);
          return { ...prev, headers: list };
        }
        if (field === "queryParams") {
          const list = (prev.queryParams ?? []).filter((_, i) => i !== index);
          return { ...prev, queryParams: list };
        }
        if (field === "formUrlEncoded" && prev.body?.formUrlEncoded) {
          const list = prev.body.formUrlEncoded.filter((_, i) => i !== index);
          return { ...prev, body: { ...prev.body, formUrlEncoded: list } };
        }
        return prev;
      });
    },
    []
  );

  const handleSend = useCallback(() => {
    if (!edited || !edited._id || sendingRequest) return;
    onSend(edited as RequestDoc);
  }, [edited, onSend, sendingRequest]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSend]);

  if (!edited) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 p-8">
        Select a request or add one to a collection
      </div>
    );
  }

  const bodyJsonStr =
    edited.body?.mode === "json"
      ? typeof edited.body.json === "string"
        ? edited.body.json
        : JSON.stringify(edited.body.json ?? {}, null, 2)
      : "";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-slate-800 p-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={edited.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Request name"
          className="w-40 min-w-[120px] rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          title="Request name"
        />
        <select
          value={edited.method}
          onChange={(e) => update({ method: e.target.value as RequestDoc["method"] })}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm font-medium text-slate-200"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={edited.url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="https://api.example.com/..."
          className="flex-1 min-w-[200px] rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sendingRequest}
          className="rounded bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {sendingRequest ? "Sending…" : "Send"}
        </button>
        {collectionId && (
          <button
            type="button"
            onClick={() => onSave(edited as RequestDoc)}
            disabled={saving}
            className="rounded border border-slate-600 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-800">
        {(["headers", "body", "auth"] as const).map((tab) => (
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
        {activeTab === "headers" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Headers</span>
              <button
                type="button"
                onClick={() => addRow("headers")}
                className="text-sm text-orange-400 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {(edited.headers ?? []).map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={row.enabled !== false}
                    onChange={(e) => updateRow("headers", i, "enabled", e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => updateRow("headers", i, "key", e.target.value)}
                    placeholder="Key"
                    className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateRow("headers", i, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow("headers", i)}
                    className="text-slate-500 hover:text-red-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "body" && (
          <div className="space-y-2">
            <div className="flex gap-4">
              {BODY_MODES.map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="bodyMode"
                    checked={(edited.body?.mode ?? "none") === mode}
                    onChange={() => updateBody({ mode })}
                    className="rounded-full"
                  />
                  {mode}
                </label>
              ))}
            </div>
            {(edited.body?.mode === "json" || edited.body?.mode === "text") && (
              <textarea
                value={
                  edited.body?.mode === "json"
                    ? bodyJsonStr
                    : edited.body?.text ?? ""
                }
                onChange={(e) =>
                  edited.body?.mode === "json"
                    ? updateBody({ json: e.target.value })
                    : updateBody({ text: e.target.value })
                }
                className="w-full h-40 rounded border border-slate-600 bg-slate-800 p-2 font-mono text-sm text-slate-200"
                placeholder={edited.body?.mode === "json" ? '{"key": "value"}' : "Plain text body"}
                spellCheck={false}
              />
            )}
            {edited.body?.mode === "form-urlencoded" && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => addRow("formUrlEncoded")}
                  className="text-sm text-orange-400 hover:underline"
                >
                  + Add row
                </button>
                {(edited.body?.formUrlEncoded ?? []).map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={row.enabled !== false}
                      onChange={(e) =>
                        updateRow("formUrlEncoded", i, "enabled", e.target.checked)
                      }
                      className="rounded"
                    />
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateRow("formUrlEncoded", i, "key", e.target.value)}
                      placeholder="Key"
                      className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateRow("formUrlEncoded", i, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow("formUrlEncoded", i)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "auth" && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="authType"
                  checked={(edited.auth?.type ?? "none") === "none"}
                  onChange={() => updateAuth({ type: "none" })}
                  className="rounded-full"
                />
                None
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="authType"
                  checked={(edited.auth?.type ?? "none") === "basic"}
                  onChange={() => updateAuth({ type: "basic", basic: { username: "", password: "" } })}
                  className="rounded-full"
                />
                Basic Auth
              </label>
            </div>
            {edited.auth?.type === "basic" && (
              <div className="space-y-2 max-w-md">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={edited.auth?.basic?.username ?? ""}
                    onChange={(e) =>
                      updateAuth({
                        basic: {
                          ...edited.auth?.basic,
                          username: e.target.value,
                          password: edited.auth?.basic?.password ?? "",
                        },
                      })
                    }
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={edited.auth?.basic?.password ?? ""}
                    onChange={(e) =>
                      updateAuth({
                        basic: {
                          ...edited.auth?.basic,
                          username: edited.auth?.basic?.username ?? "",
                          password: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
