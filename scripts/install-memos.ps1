param([switch]$Force)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root '.runtime\memos'
$source = Join-Path $runtime 'MemOS'
$venv = Join-Path $runtime '.venv'
$data = Join-Path $root 'data\memory\memos'
$marker = Join-Path $runtime '.installed'
New-Item -ItemType Directory -Force -Path $runtime,$data | Out-Null
if ((Test-Path $marker) -and -not $Force) {
 Write-Host '[MemOS] Already installed; data retained.'
 exit 0
}
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
 throw 'Git is required to install MemOS. Install Git for Windows.'
}
if (-not (Test-Path (Join-Path $source '.git'))) {
 if (Test-Path $source) { throw 'Existing MemOS source folder is not a Git repository; refusing to overwrite.' }
 & git.exe clone --depth 1 https://github.com/MemTensor/MemOS.git $source
 if ($LASTEXITCODE -ne 0) { throw 'MemOS clone failed.' }
}
$python = $null
foreach ($candidate in @('py.exe','python.exe')) {
 if (Get-Command $candidate -ErrorAction SilentlyContinue) {
  if ($candidate -eq 'py.exe') {
   & py.exe -3.11 -c 'import sys; assert sys.version_info[:2] == (3,11)' 2>$null
   if ($LASTEXITCODE -eq 0) { $python = @('py.exe','-3.11'); break }
  } else {
   & python.exe -c 'import sys; assert sys.version_info[:2] == (3,11)' 2>$null
   if ($LASTEXITCODE -eq 0) { $python = @('python.exe'); break }
  }
 }
}
if (-not $python) { throw 'Python 3.11 required for this MemOS installation profile. Install Python 3.11 and rerun BAT.' }
if (-not (Test-Path (Join-Path $venv 'Scripts\python.exe'))) {
 $pythonExe = $python[0]
$pythonArgs = @($python | Select-Object -Skip 1)
& $pythonExe @pythonArgs -m venv $venv
 if ($LASTEXITCODE -ne 0) { throw 'Failed to create MemOS venv.' }
}
$venvPython = Join-Path $venv 'Scripts\python.exe'
& $venvPython -m pip install --disable-pip-version-check -e $source
if ($LASTEXITCODE -ne 0) { throw 'MemOS pip install failed; inspect logs.' }
& $venvPython -m pip show memos
if ($LASTEXITCODE -ne 0) { throw 'MemOS package verification failed.' }
Set-Content -Path $marker -Value "Installed $(Get-Date -Format o)" -Encoding UTF8
Write-Host "[MemOS] Installed in $runtime"
Write-Host "[MemOS] Persistent data directory: $data"
