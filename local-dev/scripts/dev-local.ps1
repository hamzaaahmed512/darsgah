$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

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

if (-not (Test-Path -LiteralPath $envFilePath)) {
  & powershell.exe -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup-local.ps1")
}

Invoke-Native -FilePath "npx.cmd" -ArgumentList @("supabase", "start")
Invoke-Native -FilePath "npm.cmd" -ArgumentList @("run", "dev")
