"use client";

import { useState, useCallback } from "react";
import { parsePostmanCollection, isPostmanCollection } from "@/lib/postman-import";
import type { RequestDoc } from "@/lib/api-types";
import { X, FileJson } from "lucide-react";

interface ImportPostmanModalProps {
  onClose: () => void;
  onImport: (name: string, requests: RequestDoc[]) => Promise<void>;
}

export default function ImportPostmanModal({ onClose, onImport }: ImportPostmanModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ name: string; requests: RequestDoc[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const processFile = useCallback((file: File) => {
    setError(null);
    setParsed(null);
    if (!file.name.endsWith(".json")) {
      setError("Please choose a Postman collection JSON file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const json = JSON.parse(text);
        if (!isPostmanCollection(json)) {
          setError("File doesn't look like a Postman collection (expected 'item' array and optional 'info').");
          return;
        }
        const { name, requests } = parsePostmanCollection(json);
        setParsed({ name, requests });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid JSON");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleCreate = useCallback(async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      await onImport(parsed.name, parsed.requests);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [parsed, onImport, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Import Postman collection</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!parsed ? (
            <>
              <p className="text-sm text-slate-400">
                Drop a Postman collection JSON file (export from Postman) or click to browse.
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? "border-orange-500 bg-slate-800/50" : "border-slate-600 bg-slate-800/30"
                }`}
              >
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInput}
                  className="hidden"
                  id="postman-file-input"
                />
                <label
                  htmlFor="postman-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-slate-200"
                >
                  <FileJson className="h-10 w-10" />
                  <span className="text-sm">Drop file here or click to upload</span>
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">{parsed.name}</span>
                <span className="text-slate-400"> · {parsed.requests.length} request(s)</span>
              </p>
              <p className="text-xs text-slate-500">
                Folders from Postman are preserved as nested groups in the sidebar.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300"
                >
                  Choose another file
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={importing}
                  className="rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                >
                  {importing ? "Creating…" : "Create collection"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
