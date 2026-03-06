import type { RequestDef, KeyValueRow, RequestBody, RequestAuth } from "./types";

export interface EnvVariable {
  key: string;
  value: string;
}

export interface EnvironmentDoc {
  _id: string;
  name: string;
  variables: EnvVariable[];
}

export interface RequestDoc extends RequestDef {
  _id: string;
  name: string;
  folderPath?: string[];
  method: RequestDef["method"];
  url: string;
  headers?: KeyValueRow[];
  queryParams?: KeyValueRow[];
  body?: RequestBody;
  auth?: RequestAuth;
}

export interface CollectionDoc {
  _id: string;
  name: string;
  description?: string;
  requests: RequestDoc[];
}

export type SelectedNode =
  | { type: "collection"; id: string }
  | { type: "request"; collectionId: string; requestId: string }
  | null;
