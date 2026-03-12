# Mini Postman

A desktop API client (Electron + Next.js) with collections, environments, and a request runner. Requests run directly from your machine -- no CORS issues, full `localhost` access. Data is stored in MongoDB.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** -- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or a local MongoDB instance

---

## Setup

### 1. Clone and install

```bash
cd postman-next
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

| Variable | Description | Example |
|----------|-------------|--------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/postman-next` |
| `NEXTAUTH_URL` | App URL (required for NextAuth) | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Session signing secret (min 32 chars) | `openssl rand -base64 32` |

### 3. Run the desktop app (development)

```bash
npm run electron:dev
```

This starts the Next.js dev server and opens the Electron window. Hot reload works -- edit code and see changes immediately.

### 4. Or run as web-only (no Electron)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Note: without Electron, cross-origin requests will be blocked by CORS.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run electron:dev` | Start dev (Next.js + Electron with hot reload) |
| `npm run electron:build` | Build production app and package as `.dmg` / installer |
| `npm run electron:pack` | Build + package (unpacked, for testing) |
| `npm run dev` | Start Next.js dev server only (web) |
| `npm run build` | Next.js production build only |
| `npm run start` | Run Next.js production server |
| `npm run lint` | Run ESLint |

---

## Building and distributing

### Build for macOS

```bash
npm run electron:build
```

Output goes to `release/`. You'll get:
- **`Mini Postman.dmg`** -- drag-to-Applications installer
- **`Mini Postman.zip`** -- zipped `.app` bundle

### Build for other platforms

Electron-builder supports cross-platform builds. On macOS you can also target Windows and Linux:

```bash
# Windows
npx electron-builder --win

# Linux
npx electron-builder --linux
```

### Code signing (recommended for distribution)

**macOS:** Without signing, users see "app is damaged" or Gatekeeper warnings.

1. Get an Apple Developer account ($99/year)
2. Create a "Developer ID Application" certificate in Xcode or Apple Developer portal
3. Set environment variables before building:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
   npm run electron:build
   ```

**Notarization** (required for macOS 10.15+):
```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run electron:build
```

**Without signing (for personal / internal use):**
Users can bypass Gatekeeper:
- Right-click the `.app` -> Open -> Open (first launch only)
- Or: `xattr -cr /Applications/Mini\ Postman.app`

### Distribution options

| Method | Best for | Notes |
|--------|----------|-------|
| **Direct share** | Team / internal | Share the `.dmg` or `.zip`, users bypass Gatekeeper |
| **GitHub Releases** | Open source | Upload `.dmg` / `.zip` to a GitHub release |
| **Mac App Store** | Public distribution | Requires Apple Developer account + review |
| **Auto-update** | Production app | Add `electron-updater` + host updates on GitHub/S3 |

---

## Usage

1. **Environments** -- Click **Environments** in the header. Create envs with variables (e.g. `baseUrl = http://localhost:4000`). Select an environment in the dropdown so `{{baseUrl}}` is replaced when sending.
2. **Collections** -- Click **+ New Collection** or **Import Postman** (drop a Postman export `.json`). Add requests with **+** next to a collection.
3. **Send** -- Click **Send** (or Cmd+Enter). Requests run directly from your machine (no CORS). The response panel shows status, time, headers, and body.
4. **Save** -- Click **Save** to persist request changes to MongoDB.

---

## Features

- **Desktop app** -- Electron shell, no CORS restrictions, full localhost access.
- **Auth** -- Sign up / login with NextAuth (CredentialsProvider, username + password).
- **Environments** -- CRUD; key-value variables with `{{key}}` substitution in URL, headers, and body.
- **Collections & requests** -- Create/rename/delete collections, add requests (GET/POST/PUT/PATCH/DELETE), headers, query params, body (JSON / text / form-urlencoded), Basic Auth.
- **Folders** -- Postman subcollections are preserved as nested folders in the sidebar.
- **Import Postman** -- Drop a Postman Collection v2.1 JSON to import.
- **Request runner** -- Requests go directly from your machine (Electron disables CORS). 60s timeout. Response shows status, duration, headers, and body (JSON auto-formatted).

---

## Tech stack

- **Electron** (desktop shell, CORS disabled)
- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **MongoDB** + **Mongoose**
- **NextAuth** (CredentialsProvider), **bcryptjs**
