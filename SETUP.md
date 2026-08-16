# GoCampusFlow Setup Guide

This project is a Next.js app with Supabase Auth. It is designed to run on a local machine or in Vercel.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git
- Optional: Docker Desktop for the local Supabase stack
- Optional: VS Code

## 1) Install dependencies

```bash
npm install
```

## 2) Create the local environment file

From the project root:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

## 3) Fill in your Supabase values

Open `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production on Vercel, also add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 4) Start the app

```bash
npm run dev
```

Then visit:

```text
http://localhost:3000
```

## 5) Optional: local Supabase stack

If you want the full local database stack:

```powershell
npm run setup:local
npm run dev:local
```

Or on macOS/Linux:

```bash
npm run setup:sh
npm run dev:sh
```

## 6) Useful commands

```bash
npm run build
npm run start
npm run typecheck
npm run lint
npm run test
```

## 7) Important notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.
- Use the `anon` publishable key in browser/public envs.
- Use the same Supabase project for URL and keys across local and production.
- If sign-in fails with `Invalid API key`, check the Vercel env vars and redeploy.
