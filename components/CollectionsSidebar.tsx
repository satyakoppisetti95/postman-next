"use client";

import { useState } from "react";
import type { CollectionDoc, RequestDoc, SelectedNode } from "@/lib/api-types";
import { ChevronRight, ChevronDown, Plus, Trash2, FileText, Upload } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-400",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  PATCH: "text-orange-400",
  DELETE: "text-red-400",
};

type FolderTree = {
  name: string;
  path: string[];
  requests: RequestDoc[];
  children: Map<string, FolderTree>;
};

function buildFolderTree(requests: RequestDoc[]): { rootRequests: RequestDoc[]; folders: Map<string, FolderTree> } {
  const rootRequests: RequestDoc[] = [];
  const rootFolders = new Map<string, FolderTree>();
  for (const req of requests) {
    const path = req.folderPath ?? [];
    if (path.length === 0) {
      rootRequests.push(req);
      continue;
    }
    let current = rootFolders;
    let pathSoFar: string[] = [];
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      pathSoFar = pathSoFar.concat(segment);
      if (!current.has(segment)) {
        current.set(segment, { name: segment, path: [...pathSoFar], requests: [], children: new Map() });
      }
      const node = current.get(segment)!;
      if (i === path.length - 1) {
        node.requests.push(req);
      } else {
        current = node.children;
      }
    }
  }
  return { rootRequests, folders: rootFolders };
}

interface CollectionsSidebarProps {
  collections: CollectionDoc[];
  selectedNode: SelectedNode | null;
  onSelectNode: (node: SelectedNode) => void;
  onAddCollection: () => void;
  onAddRequest: (collectionId: string) => void;
  onDeleteCollection: (id: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onImportPostman?: () => void;
}

export default function CollectionsSidebar({
  collections,
  selectedNode,
  onSelectNode,
  onAddCollection,
  onAddRequest,
  onDeleteCollection,
  onDeleteRequest,
  onImportPostman,
}: CollectionsSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(collections.map((c) => c._id))
  );
  const [folderExpanded, setFolderExpanded] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{
    type: "collection" | "request";
    id: string;
    collectionId?: string;
    x: number;
    y: number;
  } | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFolder = (key: string) => {
    setFolderExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function renderFolderTree(
    colId: string,
    tree: Map<string, FolderTree>,
    depth: number,
    parentPath: string[]
  ): React.ReactNode {
    const entries = Array.from(tree.entries()).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([segment, node]) => {
      const pathKey = `${colId}/${node.path.join("/")}`;
      const isFolderExpanded = folderExpanded.has(pathKey);
      return (
        <div key={pathKey}>
          <div
            className="flex items-center gap-1 group"
            style={{ paddingLeft: `${0.75 + depth * 0.5}rem` }}
          >
            <button
              type="button"
              onClick={() => toggleFolder(pathKey)}
              className="p-0.5 text-slate-500 hover:text-slate-300"
            >
              {isFolderExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <span className="flex-1 text-sm text-slate-400 truncate py-0.5">{node.name}</span>
          </div>
          {isFolderExpanded && (
            <>
              {node.requests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center gap-1 group"
                  style={{ paddingLeft: `${0.75 + (depth + 1) * 0.5}rem` }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({
                      type: "request",
                      id: req._id,
                      collectionId: colId,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                >
                  <FileText className="h-3.5 w-3 text-slate-500 flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() =>
                      onSelectNode({ type: "request", collectionId: colId, requestId: req._id })
                    }
                    className={`flex-1 text-left text-sm truncate px-1 py-0.5 rounded flex items-center gap-1 ${
                      selectedNode?.type === "request" &&
                      selectedNode.collectionId === colId &&
                      selectedNode.requestId === req._id
                        ? "bg-slate-700 text-slate-100"
                        : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <span className={METHOD_COLORS[req.method] ?? "text-slate-400"}>{req.method}</span>
                    <span className="truncate">{req.name || "Untitled"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRequest(colId, req._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"
                    title="Delete request"
                  >
                    <Trash2 className="h-3.5 w-3" />
                  </button>
                </div>
              ))}
              {renderFolderTree(colId, node.children, depth + 1, node.path)}
            </>
          )}
        </div>
      );
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-slate-800 space-y-1">
        <button
          type="button"
          onClick={onAddCollection}
          className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
        {onImportPostman && (
          <button
            type="button"
            onClick={onImportPostman}
            className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Import Postman
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {collections.map((col) => {
          const isExpanded = expanded.has(col._id);
          const requests = col.requests ?? [];
          const { rootRequests, folders } = buildFolderTree(requests);
          return (
            <div key={col._id} className="mb-1">
              <div
                className="flex items-center gap-1 group"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    type: "collection",
                    id: col._id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(col._id)}
                  className="p-0.5 text-slate-500 hover:text-slate-300"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectNode({ type: "collection", id: col._id })}
                  className={`flex-1 text-left text-sm truncate px-1 py-0.5 rounded ${
                    selectedNode?.type === "collection" && selectedNode.id === col._id
                      ? "bg-slate-700 text-slate-100"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {col.name}
                </button>
                <button
                  type="button"
                  onClick={() => onAddRequest(col._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300"
                  title="Add request"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {isExpanded && (
                <>
                  {rootRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center gap-1 pl-6 py-0.5 group"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({
                          type: "request",
                          id: req._id,
                          collectionId: col._id,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                    >
                      <FileText className="h-3.5 w-3 text-slate-500 flex-shrink-0" />
                      <button
                        type="button"
                        onClick={() =>
                          onSelectNode({
                            type: "request",
                            collectionId: col._id,
                            requestId: req._id,
                          })
                        }
                        className={`flex-1 text-left text-sm truncate px-1 py-0.5 rounded flex items-center gap-1 ${
                          selectedNode?.type === "request" &&
                          selectedNode.collectionId === col._id &&
                          selectedNode.requestId === req._id
                            ? "bg-slate-700 text-slate-100"
                            : "text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <span className={METHOD_COLORS[req.method] ?? "text-slate-400"}>
                          {req.method}
                        </span>
                        <span className="truncate">{req.name || "Untitled"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRequest(col._id, req._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"
                        title="Delete request"
                      >
                        <Trash2 className="h-3.5 w-3" />
                      </button>
                    </div>
                  ))}
                  {renderFolderTree(col._id, folders, 0, [])}
                </>
              )}
            </div>
          );
        })}
      </div>

      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="fixed z-50 rounded border border-slate-700 bg-slate-800 py-1 shadow-xl"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.type === "collection" && (
              <button
                type="button"
                className="w-full px-4 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  onDeleteCollection(menu.id);
                  setMenu(null);
                }}
              >
                Delete collection
              </button>
            )}
            {menu.type === "request" && menu.collectionId && (
              <button
                type="button"
                className="w-full px-4 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  onDeleteRequest(menu.collectionId!, menu.id);
                  setMenu(null);
                }}
              >
                Delete request
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
