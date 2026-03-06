# Mini Postman

A Next.js API client with collections, environments, and request runner (Postman-style). Data is stored in MongoDB.

## Setup

1. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
2. Set `MONGODB_URI` to your MongoDB connection string, `NEXTAUTH_URL` (e.g. `http://localhost:3000`), and `NEXTAUTH_SECRET` to a long random string (min 32 chars).
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000). Sign up, then use **Environments** to create variables (e.g. `url`, `token`) and **Collections** to create requests. Use `{{var}}` in URL, headers, and body; select an environment in the header to substitute.

## Features

- **Auth**: Sign up / login with NextAuth (CredentialsProvider, username + password).
- **Environments**: CRUD; key-value variables with `{{key}}` substitution.
- **Collections & requests**: Create collections, add requests (GET/POST/PUT/PATCH/DELETE), edit method, URL, headers, query params, body (none / JSON / text / form-urlencoded), and Basic Auth.
- **Request runner**: Send via `/api/run-request` (server-side fetch). Response shows status, time, headers, and body (JSON pretty-printed when possible).
- **Save**: Persist request changes to MongoDB from the editor.

## Tech

- Next.js 14 (App Router), TypeScript, Tailwind, Mongoose, bcrypt, NextAuth (CredentialsProvider).
