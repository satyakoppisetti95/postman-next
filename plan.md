<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I need a full fledged plan (to feed cursor) for building a next.js app to create something like postman . Support for creating environments , collections, all crud requests . Adding headers , body . basic stuff. I can give something like {{url}} that is replaced with actual string from environment . all the logic that basic postman app can do . UI to match postman aswell . Will have basic auth username and password. and the environments and collections are saved to mongodb .

You can treat this as a scoped “Mini‑Postman” with clear modules: auth, environments, collections/requests, request runner, and a Postman‑style UI, all wired to MongoDB. Here’s a concrete, step‑by‑step plan you can paste into Cursor and work through.

***

## 1. Tech stack and project setup

- Next.js 14+ (App Router, TypeScript, API routes / server actions).
- UI: Tailwind CSS + a component library (e.g. shadcn/ui) to get close to Postman’s layout look.
- HTTP client: native `fetch` (for most cases) plus a tiny helper to handle timeouts and JSON parsing.
- Auth: basic auth (username/password persisted in MongoDB, sessions with JWT or NextAuth if you want to grow later).
- DB: MongoDB Atlas + Mongoose or official Node driver.

High‑level folder layout:

- `app/`
    - `app/(dashboard)/collections/page.tsx` – main Postman‑like UI
    - `app/auth/login/page.tsx` – login
- `app/api/` – CRUD API routes for environments, collections, requests, auth
- `lib/` – DB, models, helpers (variable substitution, request runner)
- `components/` – sidebar, tabs, editors, inputs

***

## 2. Data model design (MongoDB)

Use three core collections: users, environments, collections/requests.

### 2.1 User

```ts
// lib/models/User.ts
import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true }, // bcrypt hash
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
```


### 2.2 Environments

Each environment has variables like `{{url}}`, `{{token}}`.

```ts
// lib/models/Environment.ts
const EnvironmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    variables: [
      {
        key: String,
        value: String,
      },
    ],
  },
  { timestamps: true }
);

export default models.Environment || model("Environment", EnvironmentSchema);
```


### 2.3 Collections and requests

One collection has many requests (similar to Postman).

```ts
// lib/models/Collection.ts
const RequestSchema = new Schema(
  {
    name: String,
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: "GET",
    },
    url: String, // can include {{variables}}
    headers: [
      {
        key: String,
        value: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    queryParams: [
      {
        key: String,
        value: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    body: {
      mode: {
        type: String,
        enum: ["none", "json", "text", "form-urlencoded"],
        default: "none",
      },
      json: Schema.Types.Mixed,
      text: String,
      formUrlEncoded: [
        {
          key: String,
          value: String,
          enabled: { type: Boolean, default: true },
        },
      ],
    },
    auth: {
      type: {
        type: String, // "none" | "basic"
        default: "none",
      },
      basic: {
        username: String,
        password: String,
      },
    },
  },
  { _id: true }
);

const CollectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: String,
    requests: [RequestSchema],
  },
  { timestamps: true }
);

export default models.Collection || model("Collection", CollectionSchema);
```


***

## 3. Backend APIs (Next.js route handlers)

Create typed route handlers for environments and collections.

### 3.1 DB helper

```ts
// lib/db.ts
import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);
  isConnected = true;
};
```

Call `connectDB()` at the top of every API route and in server components that query Mongo.

### 3.2 Environments CRUD

`app/api/environments/route.ts`:

- `GET` – list environments for current user.
- `POST` – create environment.

`app/api/environments/[id]/route.ts`:

- `GET` – single environment.
- `PUT` – update name/variables.
- `DELETE` – delete environment.

Each handler pattern:

```ts
// app/api/environments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Environment from "@/lib/models/Environment";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  await connectDB();
  const userId = await getCurrentUserId();
  const envs = await Environment.find({ userId }).lean();
  return NextResponse.json(envs);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const userId = await getCurrentUserId();
  const body = await req.json();
  const env = await Environment.create({
    userId,
    name: body.name,
    variables: body.variables || [],
  });
  return NextResponse.json(env, { status: 201 });
}
```


### 3.3 Collections \& requests CRUD

`app/api/collections/route.ts`:

- `GET` – list collections.
- `POST` – create collection (empty `requests: []`).

`app/api/collections/[id]/route.ts`:

- `GET` – full collection with requests.
- `PUT` – update collection name/description or full tree.
- `DELETE` – delete collection.

For updating a single request inside a collection you can either:

- Send full `collection` document from client and replace, or
- Create a nested API: `/api/collections/[collectionId]/requests/[requestId]`.

For simplicity, plan:

```ts
// app/api/collections/[id]/route.ts
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const userId = await getCurrentUserId();
  const body = await req.json(); // entire collection object
  const updated = await Collection.findOneAndUpdate(
    { _id: params.id, userId },
    body,
    { new: true }
  );
  return NextResponse.json(updated);
}
```

On the frontend, manage the nested requests in state and send the full updated collection when user clicks “Save”.

***

## 4. Variable substitution and request execution logic

### 4.1 Variable resolution

Given a selected environment and a raw URL/body/headers, you need to replace `{{var}}` with the environment’s values.

```ts
// lib/variables.ts
export type EnvVariable = { key: string; value: string };

export function substituteVariables(
  input: string | undefined,
  vars: EnvVariable[]
): string {
  if (!input) return "";
  let output = input;
  for (const v of vars) {
    const pattern = new RegExp(`{{${v.key}}}`, "g");
    output = output.replace(pattern, v.value);
  }
  return output;
}
```

Apply this to:

- Request URL.
- Header values.
- Body text (for `mode === "text"` or stringified JSON).


### 4.2 Build final HTTP request

Create a helper that takes a `request` object and an environment and returns `fetch` options.

```ts
// lib/requestRunner.ts
import { substituteVariables } from "./variables";

export async function runHttpRequest(
  reqDef: RequestType,
  envVars: EnvVariable[]
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  durationMs: number;
  bodyText: string;
}> {
  const urlWithVars = substituteVariables(reqDef.url, envVars);

  // query params
  const enabledParams = (reqDef.queryParams || []).filter((p) => p.enabled);
  const urlObj = new URL(urlWithVars);
  enabledParams.forEach((p) => urlObj.searchParams.set(p.key, substituteVariables(p.value, envVars)));

  // headers
  const headers: Record<string, string> = {};
  (reqDef.headers || [])
    .filter((h) => h.enabled)
    .forEach((h) => {
      headers[h.key] = substituteVariables(h.value, envVars);
    });

  // basic auth
  if (reqDef.auth?.type === "basic" && reqDef.auth.basic) {
    const token = Buffer.from(
      `${reqDef.auth.basic.username}:${reqDef.auth.basic.password}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }

  // body
  let body: BodyInit | undefined;
  if (reqDef.method !== "GET" && reqDef.method !== "HEAD") {
    if (reqDef.body?.mode === "json" && reqDef.body.json) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(reqDef.body.json);
    } else if (reqDef.body?.mode === "text" && reqDef.body.text) {
      body = substituteVariables(reqDef.body.text, envVars);
    } else if (reqDef.body?.mode === "form-urlencoded") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      const usp = new URLSearchParams();
      (reqDef.body.formUrlEncoded || [])
        .filter((f) => f.enabled)
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
  const durationMs = end - start;

  const resHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    resHeaders[key] = value;
  });

  const text = await res.text();

  return {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
    durationMs,
    bodyText: text,
  };
}
```


### 4.3 API route to run requests

You don’t want browser CORS issues when calling arbitrary APIs, so send from the server.

`app/api/run-request/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { runHttpRequest } from "@/lib/requestRunner";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await runHttpRequest(body.request, body.envVars || []);
  return NextResponse.json(result);
}
```

Client: send `{ request, envVars }` to this route, show result.

***

## 5. Auth (basic username/password for your own app)

Minimal: just for your app sessions, not for outbound API.

- Sign‑up route: hash password with `bcrypt`.
- Login route: verify, then issue a session cookie (JWT stored in cookie or NextAuth credentials).
- `getCurrentUserId()` reads user from session and returns `userId`.

For Cursor, you can scaffold:

```ts
// lib/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getCurrentUserId(): Promise<string> {
  const token = cookies().get("session")?.value;
  if (!token) throw new Error("Not authenticated");
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
  return payload.sub;
}
```

You can add proper login/signup pages later; for now, even hard‑coding a user for development is fine while you build the core UI.

***

## 6. Postman‑style UI layout

Target UI layout:

- Left sidebar: environments at top (dropdown), collections tree below.
- Center top: request editor (method dropdown, URL input, “Send” button, environment selector).
- Center bottom: tabs for Headers, Body, Auth.
- Right or bottom panel: response (status, time, response body + headers).


### 6.1 Layout skeleton

In `app/(dashboard)/collections/page.tsx`:

```tsx
export default async function CollectionsPage() {
  const collections = await getCollectionsForUser(); // server function
  const envs = await getEnvironmentsForUser();

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 flex flex-col">
        {/* Environments dropdown + add */}
        {/* Collections tree */}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Request bar */}
        {/* Tabs for Headers/Body/Auth */}
        {/* Response panel */}
      </div>
    </div>
  );
}
```

Use client components for interactive parts:

- `CollectionsSidebar` – list + create/edit/delete.
- `RequestEditor` – method, URL, tabs.
- `ResponseViewer` – show status, time, prettified JSON.


### 6.2 Collections sidebar (basic)

- Tree view:
    - Collection name (click to expand).
    - Under each, list of requests (GET /users, POST /login, etc.).
- Actions:
    - “New Collection” button -> open modal.
    - Right‑click or `...` menu on request/collection for rename/delete.

In state:

```ts
type SelectedNode =
  | { type: "collection"; id: string }
  | { type: "request"; collectionId: string; requestId: string }
  | null;
```


### 6.3 Request editor

Controls:

- Method select: GET, POST, PUT, PATCH, DELETE.
- URL input: supports `{{var}}`.
- Dropdown to pick environment (or “No environment”).
- “Send” button triggers call to `/api/run-request`.
- “Save” button persists changes to Mongo (update collection).

Tabs below:

- Headers: table with columns [enabled checkbox, key, value].
- Body: radio/select for mode (`none`, `json`, `text`, `form-urlencoded`), underlying editor.
    - For JSON: use a text area first, upgrade later to Monaco or CodeMirror.
- Auth:
    - Select `None` or `Basic Auth`.
    - Basic: username/password fields.


### 6.4 Response viewer

Show:

- Status code + text.
- Time (ms).
- Content type + size (from headers).
- Tabs: Body, Headers, Raw.

For JSON detection:

```ts
let parsed: any;
try { parsed = JSON.parse(bodyText); } catch {}
```

If parsed exists, pretty‑print.

***

## 7. State flow and saving

To keep it simple for now:

- Load collections \& envs via server components / `fetch` on mount.
- Keep currently selected collection + request in a React state.
- When user edits any field, update state only.
- “Save” button calls `PUT /api/collections/[id]` with entire collection.

Later optimization: autosave with debounced calls.

***

## 8. MVP feature checklist

Start with this smaller scope, then iterate.

1. Auth
    - Hardcoded user while developing; swap to real login later.
2. Environments
    - Create, rename, delete.
    - Add/remove key‑value variables.
    - Selector in top bar.
    - `{{var}}` replacement in URL/headers/body.
3. Collections \& requests
    - Create collection.
    - Add request (default GET).
    - Rename, delete request.
    - Edit method, URL, headers, body, auth.
4. Request runner
    - Send via server route with `fetch`.
    - Show status, time, headers, body.
    - Support JSON/text body, form‑urlencoded.
    - Basic auth support.
5. UI polish (optional but nice)
    - Dark theme with Tailwind.
    - Icons for methods (GET green, POST blue, DELETE red).
    - Keyboard shortcuts: Cmd/Ctrl+Enter to send.

***

## 9. Suggested implementation order for you

1. Create Next.js app (TypeScript, App Router, Tailwind).
2. Add MongoDB connection + Mongoose models.
3. Implement environment CRUD API + a simple env management page.
4. Implement collections + nested requests in Mongo + API routes.
5. Build the main layout: sidebar + empty editor + dummy response.
6. Wire actual data: load collections \& envs, allow selecting a request.
7. Implement request editing (state only).
8. Implement `/api/run-request` + `runHttpRequest` + variable substitution.
9. Hook “Send” to show live response.
10. Implement “Save” to persist changed collection.

***

Would you prefer I next generate actual starter code files (e.g. `db.ts`, models, and a minimal `collections/page.tsx` layout) that you can paste directly into Cursor, or a smaller first milestone like “just environments + a basic ‘Send request’ editor”?
<span style="display:none">[^1][^10][^11][^12][^13][^14][^15][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.reddit.com/r/nextjs/comments/16asipm/built_a_desktopweb_postman_clone_with_nextjs/

[^2]: https://github.com/kunaalgaur/postman

[^3]: https://www.linkedin.com/posts/jatinder-singh-a62315200_electron-javascript-opensource-activity-7369993454325551104-L34o

[^4]: https://www.youtube.com/watch?v=3k7da4Zhd20

[^5]: https://github.com/ultron1101/postman-clone

[^6]: https://www.postman.com/product/api-client/

[^7]: https://stackoverflow.com/questions/67789036/how-do-i-post-in-mongodb-collections-using-postman-and-express

[^8]: https://dev.to/hezronokwach/building-a-nextjs-back-end-with-mongodb-for-crud-operations-a-guide-to-testing-with-postman-4ne7

[^9]: https://stackoverflow.com/questions/69683760/different-on-postman-and-react-compared-to-sending-it-through-api

[^10]: https://www.youtube.com/watch?v=6t-m1uYqtpI

[^11]: https://www.youtube.com/watch?v=prRUGuLkXzY

[^12]: https://www.youtube.com/watch?v=px3YOn_ez3k

[^13]: https://www.postman.com/postman/postman-team-collections/collection/ph4wmcj/mongodb-data-api

[^14]: https://www.youtube.com/watch?v=QMFCzUk-u50

[^15]: https://www.reddit.com/r/reactjs/comments/1c26x71/path_to_a_cleaner_react_architecture_a_shared_api/

