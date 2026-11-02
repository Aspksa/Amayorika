$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$installRoot = Join-Path $root '.runtime\hermes'
$sourceDir = Join-Path $installRoot 'hermes-agent'
$dataDir = Join-Path $root 'data\hermes'
$marker = Join-Path $installRoot '.installed'
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
if (Test-Path $marker) {
 Write-Host '[Hermes] Already installed in project. Skipping.'
 exit 0
}
Write-Host '[Hermes] First run: downloading official installer. Internet required.'
$uri='https://hermes-agent.nousresearch.com/install.ps1'
$installer = Join-Path $logDir 'hermes-official-install.ps1'
Invoke-WebRequest -Uri $uri -OutFile $installer -UseBasicParsing
# Keep installer on disk for inspection; never silently elevate privileges.
$env:HERMES_HOME=$dataDir
& $installer -InstallDir $sourceDir -HermesHome $dataDir -NonInteractive -SkipBrowser -SkipComputerUse
if ($LASTEXITCODE -ne 0) { throw "Hermes installer exited with $LASTEXITCODE" }
if (-not (Test-Path $sourceDir)) { throw 'Hermes source folder missing after installation' }
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Set-Content -Path $marker -Value "Hermes installed $(Get-Date -Format o)" -Encoding UTF8
Write-Host '[Hermes] Installation complete. Run Hermes setup separately to configure model and gateway.'
