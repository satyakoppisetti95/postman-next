/**
 * Parse Postman Collection v2.1 JSON and convert to our collection schema.
 * Supports subcollections (folders): they are flattened into requests with folderPath.
 */

import type { RequestDoc } from "./api-types";
import type { HttpMethod } from "./types";

const VALID_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function normalizeMethod(m: string): HttpMethod {
  const upper = (m || "GET").toUpperCase();
  return VALID_METHODS.includes(upper as HttpMethod) ? (upper as HttpMethod) : "GET";
}

function postmanUrlToRaw(url: PostmanUrl | string | undefined): string {
  if (url == null) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;
  const protocol = url?.protocol || "https";
  const host = Array.isArray(url?.host) ? url.host.join(".") : "";
  const port = url?.port ? `:${url.port}` : "";
  const path = Array.isArray(url?.path) ? "/" + url.path.filter(Boolean).join("/") : "";
  const query = Array.isArray(url?.query) && url.query.length
    ? "?" + url.query.map((q: { key?: string; value?: string }) => `${encodeURIComponent(q.key || "")}=${encodeURIComponent(q.value || "")}`).join("&")
    : "";
  return `${protocol}://${host}${port}${path}${query}`;
}

interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: Array<{ key?: string; value?: string; disabled?: boolean }>;
}

interface PostmanHeader {
  key?: string;
  value?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode?: string;
  raw?: string;
  urlencoded?: Array<{ key?: string; value?: string; disabled?: boolean }>;
  formdata?: Array<{ key?: string; value?: string; type?: string }>;
}

interface PostmanRequest {
  method?: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url?: PostmanUrl | string;
  auth?: { type?: string; basic?: Array<{ key?: string; value?: string }> };
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
}

interface PostmanCollection {
  info?: { name?: string };
  item?: PostmanItem[];
}

function convertPostmanRequest(
  postman: PostmanRequest,
  name: string,
  folderPath: string[],
  id: string
): RequestDoc {
  const url = postman.url ? postmanUrlToRaw(postman.url) : "";
  const urlObj = typeof postman.url === "object" && postman.url && "query" in postman.url
    ? postman.url as PostmanUrl
    : null;
  const queryParams = (urlObj?.query ?? []).map((q) => ({
    key: q.key ?? "",
    value: q.value ?? "",
    enabled: !q.disabled,
  }));

  const headers = (postman.header ?? []).map((h) => ({
    key: h.key ?? "",
    value: h.value ?? "",
    enabled: !h.disabled,
  }));

  let body: RequestDoc["body"] = { mode: "none" };
  const bodyMode = postman.body?.mode;
  if (bodyMode === "raw" && postman.body?.raw !== undefined) {
    const raw = postman.body.raw;
    try {
      JSON.parse(raw);
      body = { mode: "json", json: raw };
    } catch {
      body = { mode: "text", text: raw };
    }
  } else if (bodyMode === "urlencoded" && postman.body?.urlencoded?.length) {
    body = {
      mode: "form-urlencoded",
      formUrlEncoded: postman.body.urlencoded.map((f) => ({
        key: f.key ?? "",
        value: f.value ?? "",
        enabled: !f.disabled,
      })),
    };
  } else if (bodyMode === "formdata" && postman.body?.formdata?.length) {
    body = {
      mode: "form-urlencoded",
      formUrlEncoded: postman.body.formdata.map((f) => ({
        key: f.key ?? "",
        value: f.value ?? "",
        enabled: true,
      })),
    };
  }

  let auth: RequestDoc["auth"] = { type: "none" };
  if (postman.auth?.type === "basic" && Array.isArray(postman.auth.basic)) {
    const basic = postman.auth.basic;
    const username = basic.find((b) => b.key === "username")?.value ?? "";
    const password = basic.find((b) => b.key === "password")?.value ?? "";
    auth = { type: "basic", basic: { username, password } };
  }

  return {
    _id: id,
    name: name || "Untitled",
    folderPath: folderPath.length ? folderPath : undefined,
    method: normalizeMethod(postman.method ?? "GET"),
    url,
    headers,
    queryParams,
    body,
    auth,
  };
}

function flattenItems(
  items: PostmanItem[],
  folderPath: string[],
  out: RequestDoc[]
): void {
  for (const it of items) {
    if (it.request) {
      out.push(
        convertPostmanRequest(it.request, it.name ?? "Untitled", folderPath, crypto.randomUUID())
      );
    } else if (Array.isArray(it.item) && it.item.length) {
      flattenItems(it.item, folderPath.concat(it.name ?? "Folder"), out);
    }
  }
}

export interface ParsedPostmanCollection {
  name: string;
  requests: RequestDoc[];
}

/**
 * Parse a Postman collection JSON (v2.0 / v2.1) into our schema.
 * Folders become request.folderPath; top-level requests have no folderPath.
 */
export function parsePostmanCollection(json: unknown): ParsedPostmanCollection {
  const col = json as PostmanCollection;
  const name = col?.info?.name ?? "Imported";
  const items = col?.item ?? [];
  const requests: RequestDoc[] = [];
  flattenItems(items, [], requests);
  return { name, requests };
}

/**
 * Check if the given JSON looks like a Postman collection.
 */
export function isPostmanCollection(json: unknown): boolean {
  const o = json as Record<string, unknown>;
  return (
    o != null &&
    typeof o === "object" &&
    Array.isArray(o.item) &&
    (o.info == null || typeof o.info === "object")
  );
}
