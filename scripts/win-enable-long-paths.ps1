#Requires -Version 5.1
<#
  Active Win32 long paths (MAX_PATH > 260) au niveau système.
  À exécuter une fois en PowerShell **Administrateur**, puis redémarrer Windows.

  Usage : clic droit PowerShell → Exécuter en tant qu’administrateur, puis :
    Set-Location '...\Questia'
    .\scripts\win-enable-long-paths.ps1
#>
$ErrorActionPreference = "Stop"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Ce script doit être lancé en administrateur."
}

$key = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
$name = "LongPathsEnabled"
$current = Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue

if ($current.LongPathsEnabled -eq 1) {
  Write-Host "LongPathsEnabled est déjà à 1. Redémarre la machine si CMake/Ninja échouent encore." -ForegroundColor Green
  exit 0
}

New-ItemProperty -Path $key -Name $name -Value 1 -PropertyType DWord -Force | Out-Null
Write-Host "LongPathsEnabled=1 enregistré. Redémarre Windows pour appliquer, puis relance le build Android." -ForegroundColor Yellow
