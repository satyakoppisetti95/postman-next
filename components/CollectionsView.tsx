"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { CollectionDoc, EnvironmentDoc, RequestDoc, SelectedNode } from "@/lib/api-types";
import CollectionsSidebar from "./CollectionsSidebar";
import RequestEditor from "./RequestEditor";
import ResponseViewer from "./ResponseViewer";
import ImportPostmanModal from "./ImportPostmanModal";
import {
  runHttpRequestClient,
  type RunResult,
} from "@/lib/requestRunnerClient";

interface CollectionsViewProps {
  initialCollections: CollectionDoc[];
  initialEnvironments: EnvironmentDoc[];
}

export default function CollectionsView({
  initialCollections,
  initialEnvironments,
}: CollectionsViewProps) {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionDoc[]>(initialCollections);
  const [environments, setEnvironments] = useState<EnvironmentDoc[]>(initialEnvironments);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [response, setResponse] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [collectionNameEdit, setCollectionNameEdit] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  const selectedCollection = selectedNode?.type === "collection"
    ? collections.find((c) => c._id === selectedNode.id)
    : selectedNode?.type === "request"
      ? collections.find((c) => c._id === selectedNode.collectionId)
      : null;

  const selectedRequest = selectedNode?.type === "request"
    ? selectedCollection?.requests.find((r) => r._id === selectedNode.requestId)
    : null;

  useEffect(() => {
    if (selectedNode?.type === "collection" && selectedCollection) {
      setCollectionNameEdit(selectedCollection.name);
    }
  }, [selectedNode?.type, selectedCollection?._id, selectedCollection?.name]);

  const selectedEnv = selectedEnvId
    ? environments.find((e) => e._id === selectedEnvId)
    : null;
  const envVars = selectedEnv?.variables ?? [];

  const refreshEnvironments = useCallback(async () => {
    const res = await fetch("/api/environments");
    if (res.ok) {
      const data = await res.json();
      setEnvironments(data);
    }
  }, []);

  const refreshCollections = useCallback(async () => {
    const res = await fetch("/api/collections");
    if (res.ok) {
      const list = await res.json();
      const full = await Promise.all(
        list.map((c: { _id: string }) =>
          fetch(`/api/collections/${c._id}`).then((r) => r.json())
        )
      );
      setCollections(full);
    }
  }, []);

  const handleSaveRequest = useCallback(
    async (updatedRequest: RequestDoc) => {
      if (!selectedCollection) return;
      const requests = selectedCollection.requests.map((r) =>
        r._id === updatedRequest._id ? updatedRequest : r
      );
      setSaving(true);
      try {
        const res = await fetch(`/api/collections/${selectedCollection._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedCollection.name,
            description: selectedCollection.description,
            requests,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCollections((prev) =>
            prev.map((c) => (c._id === updated._id ? updated : c))
          );
        }
      } finally {
        setSaving(false);
      }
    },
    [selectedCollection]
  );

  const handleAddCollection = useCallback(async () => {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Collection" }),
    });
    if (res.ok) {
      const col = await res.json();
      setCollections((prev) => [col, ...prev]);
      setSelectedNode({ type: "collection", id: col._id });
    }
  }, []);

  const handleAddRequest = useCallback(
    async (collectionId: string) => {
      const col = collections.find((c) => c._id === collectionId);
      if (!col) return;
      const newReq: RequestDoc = {
        _id: crypto.randomUUID(),
        name: "New Request",
        method: "GET",
        url: "",
        headers: [],
        queryParams: [],
        body: { mode: "none" },
        auth: { type: "none" },
      };
      const requests = [...(col.requests || []), newReq];
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: col.name,
          description: col.description,
          requests,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCollections((prev) => prev.map((c) => (c._id === collectionId ? updated : c)));
        setSelectedNode({ type: "request", collectionId, requestId: newReq._id });
      }
    },
    [collections]
  );

  const handleDeleteCollection = useCallback(async (id: string) => {
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCollections((prev) => prev.filter((c) => c._id !== id));
      if (selectedNode?.type === "collection" && selectedNode.id === id) setSelectedNode(null);
      if (selectedNode?.type === "request" && selectedNode.collectionId === id) setSelectedNode(null);
    }
  }, [selectedNode]);

  const handleDeleteRequest = useCallback(
    async (collectionId: string, requestId: string) => {
      const col = collections.find((c) => c._id === collectionId);
      if (!col) return;
      const requests = (col.requests || []).filter((r) => r._id !== requestId);
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: col.name,
          description: col.description,
          requests,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCollections((prev) => prev.map((c) => (c._id === collectionId ? updated : c)));
        if (
          selectedNode?.type === "request" &&
          selectedNode.collectionId === collectionId &&
          selectedNode.requestId === requestId
        ) {
          setSelectedNode(null);
        }
      }
    },
    [collections, selectedNode]
  );

  const handleRenameCollection = useCallback(
    async (collectionId: string, name: string) => {
      const col = collections.find((c) => c._id === collectionId);
      if (!col) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/collections/${collectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || col.name,
            description: col.description,
            requests: col.requests ?? [],
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCollections((prev) => prev.map((c) => (c._id === collectionId ? updated : c)));
        }
      } finally {
        setSaving(false);
      }
    },
    [collections]
  );

  function handleLogout() {
    signOut({ callbackUrl: "/auth/login" });
  }

  const handleImportPostman = useCallback(
    async (name: string, requests: RequestDoc[]) => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create collection");
      const col = await res.json();
      const putRes = await fetch(`/api/collections/${col._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: "", requests }),
      });
      if (!putRes.ok) throw new Error("Failed to add requests");
      const updated = await putRes.json();
      setCollections((prev) => [updated, ...prev]);
      setSelectedNode({ type: "collection", id: updated._id });
    },
    []
  );

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-100">Mini Postman</span>
          <a
            href="/environments"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Environments
          </a>
          <select
            value={selectedEnvId ?? ""}
            onChange={(e) => setSelectedEnvId(e.target.value || null)}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200"
          >
            <option value="">No environment</option>
            {environments.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
        >
          Log out
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-r border-slate-800 flex flex-col overflow-hidden">
          <CollectionsSidebar
            collections={collections}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onAddCollection={handleAddCollection}
            onAddRequest={handleAddRequest}
            onDeleteCollection={handleDeleteCollection}
            onDeleteRequest={handleDeleteRequest}
            onImportPostman={() => setShowImportModal(true)}
          />
          {showImportModal && (
            <ImportPostmanModal
              onClose={() => setShowImportModal(false)}
              onImport={handleImportPostman}
            />
          )}
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {selectedNode?.type === "collection" && selectedCollection ? (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="max-w-md space-y-3">
                <h2 className="text-sm font-medium text-slate-400">Rename collection</h2>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={collectionNameEdit}
                    onChange={(e) => setCollectionNameEdit(e.target.value)}
                    placeholder="Collection name"
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleRenameCollection(selectedCollection._id, collectionNameEdit)}
                    className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Add requests using the + next to the collection in the sidebar.</p>
              </div>
            </div>
          ) : (
            <RequestEditor
              request={selectedRequest ?? null}
              envVars={envVars}
              onSave={handleSaveRequest}
              sendingRequest={sendingRequest}
              onSend={async (req) => {
                setSendingRequest(true);
                setResponse(null);
                try {
                  const result = await runHttpRequestClient(req, envVars);
                  setResponse(result);
                } catch (e) {
                  setResponse({
                    status: 0,
                    statusText: "Error",
                    headers: {},
                    durationMs: 0,
                    bodyText:
                      e instanceof Error
                        ? e.message
                        : "Network error or unreachable host.",
                  });
                } finally {
                  setSendingRequest(false);
                }
              }}
              saving={saving}
              collectionId={selectedCollection?._id ?? null}
            />
          )}
          <div className="border-t border-slate-800 flex-1 min-h-0 flex flex-col">
            <ResponseViewer result={response} loading={sendingRequest} />
          </div>
        </main>
      </div>
    </>
  );
}
