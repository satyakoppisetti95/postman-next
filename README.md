# Mini Postman

A Next.js API client with collections, environments, and a request runner (Postman-style). Store environments and collections in MongoDB, send requests with variable substitution (e.g. `{{baseUrl}}`), and view responses in a dark UI.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** – [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or a local MongoDB instance

---

## Setup

### 1. Clone and install

```bash
cd postman-next
npm install
```

### 2. Environment variables

Copy the example env file and edit it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:

| Variable | Description | Example |
|----------|-------------|--------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/postman-next?retryWrites=true&w=majority` |
| `NEXTAUTH_URL` | App URL (required for NextAuth) | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for signing sessions (min 32 chars) | Generate with: `openssl rand -base64 32` |

**MongoDB Atlas:** Create a cluster, add a database user, allow your IP (or `0.0.0.0/0` for dev), and copy the connection string into `MONGODB_URI`.

**NEXTAUTH_SECRET:** Generate a random string, e.g.:

```bash
openssl rand -base64 32
```

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with email, username, and password, then start creating environments and collections.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Run production server (run `build` first) |
| `npm run lint` | Run ESLint |

---

## Usage

1. **Environments** – In the header, open **Environments** to create envs and add variables (e.g. `baseUrl`, `token`). Select an environment in the dropdown so `{{baseUrl}}` and similar placeholders are replaced when you send a request.
2. **Collections** – Use **+ New Collection**, then add requests with the **+** next to a collection. Choose method, URL, headers, body, and auth.
3. **Send** – Click **Send** (or Cmd/Ctrl+Enter). The response panel shows status, time, and body. Use **Save** to persist changes to a request.

---

## Features

- **Auth** – Sign up / login with NextAuth (CredentialsProvider, username + password).
- **Environments** – Create, rename, delete; key-value variables with `{{key}}` substitution in URL, headers, and body.
- **Collections & requests** – Create collections, add requests (GET/POST/PUT/PATCH/DELETE), edit method, URL, headers, query params, body (none / JSON / text / form-urlencoded), and Basic Auth.
- **Request runner** – Requests are sent from the server (`/api/run-request`) to avoid CORS. Response shows status, duration, headers, and body (JSON pretty-printed when possible).
- **Errors** – 500s and other API errors are shown in the response panel (e.g. when variables are missing or the request fails).

---

## Tech stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **MongoDB** + **Mongoose**
- **NextAuth** (CredentialsProvider), **bcryptjs**
