#Requires -Version 5.1
<#
  Build Android (Gradle) sous Windows.

  Par défaut : Gradle est lancé depuis le chemin réel du dépôt (C:\...\Questia\...).
  C’est nécessaire car avec SUBST (Q:\), React Native codegen + @clerk/expo mélangent
  Q:\node_modules et C:\...\node_modules → erreur « this and base files have different roots ».

  Contournement chemins longs (Ninja / CMake) :
  - préférer « chemins longs » Windows (voir scripts/win-enable-long-paths.ps1) ou un clone court (ex. C:\dev\Questia) ;
  - ou forcer SUBST : $env:QUESTIA_ANDROID_USE_SUBST = '1' puis npm run android:assemble:win
    (peut refaire échouer le codegen Clerk — à éviter si possible).

  Usage (racine du repo) :
    npm run android:assemble:win
    npm run android:assemble:win -- assembleDebug
    npm run android:assemble:win -- clean assembleRelease
#>
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidRel = "apps\mobile\android"
$androidDir = Join-Path $repoRoot $androidRel

$gradleArgs = [System.Collections.ArrayList]@()
$useSubst = ($env:QUESTIA_ANDROID_USE_SUBST -eq '1')
foreach ($a in $args) {
  if ($a -eq '-UseSubst') {
    $useSubst = $true
    continue
  }
  [void]$gradleArgs.Add($a)
}
if ($gradleArgs.Count -eq 0) {
  [void]$gradleArgs.Add("assembleRelease")
}

function Test-DriveLetterFree {
  param([char]$Letter)
  # Ne pas ecrire ${Letter} suivi de : dans une chaine "..." : reserve en PowerShell (qualificateur d'etendue).
  $p = "$($Letter):"
  return -not (Test-Path -LiteralPath $p -ErrorAction SilentlyContinue)
}

$driveLetter = $null
$substPath = $null
$prevPwd = Get-Location
$exitCode = 1

try {
  $workDir = $androidDir

  if ($useSubst) {
    foreach ($c in @('Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z')) {
      if (Test-DriveLetterFree -Letter $c) {
        $driveLetter = $c
        break
      }
    }
    if (-not $driveLetter) {
      Write-Error "QUESTIA_ANDROID_USE_SUBST=1 mais aucun lecteur Q-Z libre pour SUBST."
    }
    $substPath = "$($driveLetter):"
    cmd /c ('subst {0}: "{1}"' -f $driveLetter, $repoRoot) | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "subst a echoue (code $LASTEXITCODE)."
    }
    $substAndroid = Join-Path $substPath $androidRel
    if (-not (Test-Path -LiteralPath $substAndroid)) {
      Write-Error "Chemin attendu introuvable : $substAndroid"
    }
    $workDir = $substAndroid
    Write-Warning "SUBST actif ($substPath). Si erreur ""different roots"" avec Clerk, retirer QUESTIA_ANDROID_USE_SUBST (chemins longs ou clone court)."
    Write-Host "SUBST $substPath -> $repoRoot" -ForegroundColor Cyan
  }
  else {
    if (-not (Test-Path -LiteralPath $androidDir)) {
      Write-Error "Dossier Android introuvable : $androidDir"
    }
    Write-Host "Gradle depuis le chemin reel (pas de SUBST) : $androidDir" -ForegroundColor Cyan
  }

  if ($gradleArgs -contains 'clean') {
    $appCxx = Join-Path $repoRoot 'apps\mobile\android\app\.cxx'
    if (Test-Path -LiteralPath $appCxx) {
      Write-Host "Suppression de $appCxx (clean natif CMake / RN)..." -ForegroundColor Yellow
      Remove-Item -LiteralPath $appCxx -Recurse -Force
    }
  }

  $env:NODE_ENV = "production"
  Set-Location -LiteralPath $workDir

  $gradleLine = $gradleArgs -join ' '
  Write-Host "gradlew.bat $gradleLine" -ForegroundColor Cyan

  & .\gradlew.bat @gradleArgs
  $exitCode = $LASTEXITCODE
}
finally {
  Set-Location -LiteralPath $prevPwd
  if ($driveLetter) {
    cmd /c ('subst {0}: /d' -f $driveLetter) | Out-Null
  }
}

exit $exitCode
