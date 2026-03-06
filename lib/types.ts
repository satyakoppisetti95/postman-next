export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type BodyMode = "none" | "json" | "text" | "form-urlencoded";

export interface KeyValueRow {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface RequestBody {
  mode: BodyMode;
  json?: unknown;
  text?: string;
  formUrlEncoded?: KeyValueRow[];
}

export interface RequestAuth {
  type: "none" | "basic";
  basic?: {
    username: string;
    password: string;
  };
}

export interface RequestDef {
  _id?: string;
  name: string;
  folderPath?: string[];
  method: HttpMethod;
  url: string;
  headers?: KeyValueRow[];
  queryParams?: KeyValueRow[];
  body?: RequestBody;
  auth?: RequestAuth;
}

export interface EnvVariable {
  key: string;
  value: string;
}
