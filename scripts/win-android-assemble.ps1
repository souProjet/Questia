#Requires -Version 5.1
<#
  Build Android (Gradle) depuis un lecteur SUBST court pour éviter l'erreur Ninja
  « Filename longer than 260 characters » sous Windows (monorepo + New Architecture).

  Usage (racine du repo) :
    npm run android:assemble:win
    npm run android:assemble:win -- assembleDebug
    npm run android:assemble:win -- clean assembleRelease
#>
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidRel = "apps\mobile\android"

function Test-DriveLetterFree {
  param([char]$Letter)
  $p = "${Letter}:"
  return -not (Test-Path -LiteralPath $p -ErrorAction SilentlyContinue)
}

$driveLetter = $null
foreach ($c in @('Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z')) {
  if (Test-DriveLetterFree -Letter $c) {
    $driveLetter = $c
    break
  }
}
if (-not $driveLetter) {
  Write-Error "Aucun lecteur Q–Z libre pour SUBST. Libère un lecteur (subst X: /d) ou ferme ce qui utilise Q:–Z:."
}

$gradleArgs = @()
if ($args -and $args.Count -gt 0) {
  $gradleArgs = @($args)
} else {
  $gradleArgs = @("assembleRelease")
}

$substPath = "${driveLetter}:"
$prevPwd = Get-Location
$exitCode = 1

try {
  cmd /c "subst ${driveLetter}: `"$repoRoot`"" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "subst a échoué (code $LASTEXITCODE)."
  }

  if (-not (Test-Path -LiteralPath "${substPath}\$androidRel")) {
    Write-Error "Chemin attendu introuvable : ${substPath}\$androidRel"
  }

  $env:NODE_ENV = "production"
  Set-Location -LiteralPath "${substPath}\$androidRel"

  Write-Host "SUBST $substPath -> $repoRoot" -ForegroundColor Cyan
  Write-Host "gradlew.bat $($gradleArgs -join ' ')" -ForegroundColor Cyan

  & .\gradlew.bat @gradleArgs
  $exitCode = $LASTEXITCODE
}
finally {
  Set-Location -LiteralPath $prevPwd
  cmd /c "subst ${driveLetter}: /d" | Out-Null
}

exit $exitCode
