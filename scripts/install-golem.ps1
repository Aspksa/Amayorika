param([switch]$Force)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$install = Join-Path $root '.runtime\project-golem'
$source = Join-Path $install 'Project_Golem'
$data = Join-Path $root 'data\knowledge-graph\golem'
$marker = Join-Path $install '.installed'
New-Item -ItemType Directory -Force -Path $install,$data | Out-Null
if ((Test-Path $marker) -and -not $Force) {
 Write-Host '[Golem] Already downloaded. Skipping.'
 exit 0
}
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git for Windows is required for Project Golem.' }
if (-not (Test-Path (Join-Path $source '.git'))) {
 if (Test-Path $source) { throw 'Existing source folder is not a Git checkout; refusing to overwrite.' }
 & git.exe clone --depth 1 https://github.com/CyberMagician/Project_Golem.git $source
 if ($LASTEXITCODE -ne 0) { throw 'Project Golem clone failed.' }
}
if (-not (Test-Path (Join-Path $source 'LICENSE'))) { throw 'Missing upstream LICENSE.' }
Set-Content -Path $marker -Value "Downloaded $(Get-Date -Format o)" -Encoding UTF8
Write-Host '[Golem] Source downloaded. Python dependencies and model are NOT installed automatically.'
Write-Host "[Golem] Local data directory reserved: $data"
