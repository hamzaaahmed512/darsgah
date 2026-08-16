$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  throw "Run this script from an elevated PowerShell window."
}

dism.exe /online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart
if ($LASTEXITCODE -ne 0) {
  throw "Failed to enable Microsoft-Windows-Subsystem-Linux."
}

dism.exe /online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart
if ($LASTEXITCODE -ne 0) {
  throw "Failed to enable VirtualMachinePlatform."
}

Write-Host ""
Write-Host "Docker prerequisites enabled."
Write-Host "Restart Windows, then open Docker Desktop and run:"
Write-Host "  npm.cmd run setup:local"
