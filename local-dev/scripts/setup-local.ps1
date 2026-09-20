$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

$dockerDesktopPath = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"
$envFilePath = Join-Path $repoRoot ".env.local"
function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$ArgumentList = @()
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($ArgumentList -join ' ')"
  }
}

function Start-DockerDesktopIfPresent {
  if (Test-Path -LiteralPath $dockerDesktopPath) {
    $running = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $running) {
      Start-Process -FilePath $dockerDesktopPath
      Start-Sleep -Seconds 5
    }
  }
}

function Test-DockerReady {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $null = & docker ps *> $null
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

Start-DockerDesktopIfPresent

if (-not (Test-DockerReady)) {
  $wslMissing = $false

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $null = & wsl --status *> $null
  $ErrorActionPreference = $previousPreference
  if ($LASTEXITCODE -ne 0) {
    $wslMissing = $true
  }

  $detail = if ($wslMissing) {
    "WSL is not installed on this machine yet."
  } else {
    "Docker Desktop is installed, but its Linux container engine is not ready."
  }

  throw ($detail + @"

Finish the Windows prerequisites in an elevated PowerShell, then restart Windows:

dism.exe /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
dism.exe /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart

After the restart:
1. Open Docker Desktop and wait for the engine to finish starting.
2. Re-run npm.cmd run setup:local
3. Start the app with npm.cmd run dev:local
"@)
}

Invoke-Native -FilePath "npx.cmd" -ArgumentList @("supabase", "start")
Invoke-Native -FilePath "npx.cmd" -ArgumentList @("supabase", "db", "reset", "--local", "--yes")
$statusLines = & npx.cmd supabase status -o env
if ($LASTEXITCODE -ne 0) { throw "Could not read local Supabase credentials." }
$status = @{}
foreach ($line in $statusLines) {
  if ($line -match '^([A-Z_]+)=(.*)$') { $status[$matches[1]] = $matches[2].Trim('"') }
}
foreach ($key in @('API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY')) {
  if (-not $status[$key]) { throw "Local Supabase status is missing $key." }
}
@(
  "NEXT_PUBLIC_SUPABASE_URL=$($status.API_URL)"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($status.ANON_KEY)"
  "SUPABASE_SERVICE_ROLE_KEY=$($status.SERVICE_ROLE_KEY)"
  "NEXT_PUBLIC_APP_URL=http://localhost:3000"
  "PARENT_PORTAL_SESSION_SECRET=$([Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)))"
) | Set-Content -LiteralPath $envFilePath
Write-Host ""
Write-Host "Start the website with:"
Write-Host "  npm.cmd run dev:local"



