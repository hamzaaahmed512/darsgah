# Local Development Setup

This folder keeps the Windows-only local Supabase setup, helper scripts, and DBeaver files out of the main app root.

## Scripts

- `scripts/setup-local.ps1`: writes `.env.local`, starts the local Supabase stack, resets the local database, and reloads seed data.
- `scripts/dev-local.ps1`: ensures `.env.local` exists, starts local Supabase if needed, and launches the Next.js dev server.
- `scripts/enable-docker-prereqs.ps1`: enables the Windows features Docker Desktop needs for Linux containers.

You can still run them from the repo root through:

```powershell
npm.cmd run setup:docker-prereqs
npm.cmd run setup:local
npm.cmd run dev:local
```

## Windows Local Docker Setup

1. If Docker Desktop reports that the Linux engine cannot start, open an elevated PowerShell and run:

```powershell
dism.exe /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
dism.exe /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart
```

Or run:

```powershell
npm.cmd run setup:docker-prereqs
```

2. Restart Windows.
3. Open Docker Desktop and wait until the engine is running.
4. In the project folder, initialize the local backend and demo data:

```powershell
npm.cmd run setup:local
```

5. Start the website:

```powershell
npm.cmd run dev:local
```

The local setup writes `.env.local`, starts the Supabase containers, applies all migrations, and reloads `supabase/seed.sql`.

## DBeaver Connection

Use these values to connect DBeaver to the local Supabase PostgreSQL instance:

```text
Host: 127.0.0.1
Port: 54322
Database: postgres
Username: postgres
Password: postgres
SSL: Disable
```
