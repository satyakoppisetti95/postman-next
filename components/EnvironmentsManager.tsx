"use client";

import { useState, useCallback } from "react";
import type { EnvironmentDoc } from "@/lib/api-types";
import { Plus, Trash2 } from "lucide-react";

interface EnvironmentsManagerProps {
  initialEnvironments: EnvironmentDoc[];
}

export default function EnvironmentsManager({
  initialEnvironments,
}: EnvironmentsManagerProps) {
  const [environments, setEnvironments] = useState<EnvironmentDoc[]>(initialEnvironments);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/environments");
    if (res.ok) setEnvironments(await res.json());
  }, []);

  const create = useCallback(async () => {
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Environment", variables: [] }),
    });
    if (res.ok) {
      const env = await res.json();
      setEnvironments((prev) => [env, ...prev]);
      setCreating(false);
    }
  }, []);

  const update = useCallback(async (id: string, name: string, variables: { key: string; value: string }[]) => {
    const res = await fetch(`/api/environments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, variables }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEnvironments((prev) => prev.map((e) => (e._id === id ? updated : e)));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/environments/${id}`, { method: "DELETE" });
    if (res.ok) setEnvironments((prev) => prev.filter((e) => e._id !== id));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">
          Use variables like <code className="text-orange-400">{`{{url}}`}</code> in URLs, headers, and body. Select an environment in the collections view.
        </p>
        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" />
            New environment
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
      {creating && (
        <div className="rounded border border-slate-700 bg-slate-800/50 p-4">
          <input
            type="text"
            placeholder="Environment name"
            defaultValue="New Environment"
            id="new-env-name"
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm mb-2 w-64"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const name = (document.getElementById("new-env-name") as HTMLInputElement)?.value || "New Environment";
                await fetch("/api/environments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, variables: [] }),
                });
                await refresh();
                setCreating(false);
              }}
              className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-500"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {environments.map((env) => (
          <EnvCard
            key={env._id}
            env={env}
            onUpdate={update}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  );
}

function EnvCard({
  env,
  onUpdate,
  onDelete,
}: {
  env: EnvironmentDoc;
  onUpdate: (id: string, name: string, variables: { key: string; value: string }[]) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(env.name);
  const [variables, setVariables] = useState(env.variables);
  const [saving, setSaving] = useState(false);

  const addRow = () => {
    setVariables((prev) => [...prev, { key: "", value: "" }]);
  };
  const updateRow = (i: number, key: string, value: string) => {
    setVariables((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };
  const removeRow = (i: number) => {
    setVariables((prev) => prev.filter((_, idx) => idx !== i));
  };
  const save = async () => {
    setSaving(true);
    await onUpdate(env._id, name, variables);
    setSaving(false);
  };

  return (
    <div className="rounded border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-transparent font-medium text-slate-100 focus:outline-none focus:ring-0"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(env._id)}
            className="rounded border border-slate-600 px-3 py-1 text-sm text-red-400 hover:bg-slate-700"
          >
            <Trash2 className="h-4 w-4 inline" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex gap-2 text-sm text-slate-400 mb-2">
          <span className="w-24">Key</span>
          <span className="flex-1">Value</span>
        </div>
        {variables.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={v.key}
              onChange={(e) => updateRow(i, "key", e.target.value)}
              placeholder="e.g. url"
              className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={v.value}
              onChange={(e) => updateRow(i, "value", e.target.value)}
              placeholder="e.g. https://api.example.com"
              className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-slate-500 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-orange-400 hover:underline"
        >
          + Add variable
        </button>
      </div>
    </div>
  );
}
