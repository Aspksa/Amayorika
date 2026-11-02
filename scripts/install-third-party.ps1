param([switch]$InstallPython, [switch]$Force)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$runtime=Join-Path $root '.runtime'
$log=Join-Path $root 'logs\third-party-install.log'
New-Item -ItemType Directory -Force -Path $runtime,(Split-Path $log) | Out-Null
$projects=@(
 @{Name='MemOS';Repo='https://github.com/MemTensor/MemOS.git'},
 @{Name='Project_Golem';Repo='https://github.com/CyberMagician/Project_Golem.git'},
 @{Name='hermes-agent';Repo='https://github.com/NousResearch/hermes-agent.git'},
 @{Name='mem0';Repo='https://github.com/mem0ai/mem0.git'},
 @{Name='graphiti';Repo='https://github.com/getzep/graphiti.git'},
 @{Name='crewAI';Repo='https://github.com/crewAIInc/crewAI.git'}
)
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {throw 'Git for Windows is required'}
$results=@()
foreach($item in $projects){
 $name=$item.Name
 $folder=Join-Path (Join-Path $runtime 'third-party') $name
 try{
  if(Test-Path (Join-Path $folder '.git')){
   if($Force){
    & git.exe -C $folder pull --ff-only 2>&1 | Out-File -Append -FilePath $log
    if($LASTEXITCODE -ne 0){throw "Update failed for $name"}
   }
   $state='present'
  }elseif(Test-Path $folder){throw "Folder exists without Git: $folder"}
  else{
   New-Item -ItemType Directory -Force -Path (Split-Path $folder) | Out-Null
   & git.exe clone --depth 1 $item.Repo $folder 2>&1 | Out-File -Append -FilePath $log
   if($LASTEXITCODE -ne 0){throw "Clone failed for $name"}
   $state='downloaded'
  }
  $commit=(& git.exe -C $folder rev-parse HEAD).Trim()
  $results+=@{name=$name;status=$state;commit=$commit;path=$folder}
  Write-Host "[OK] $name $commit"
 }catch{
  $results+=@{name=$name;status='failed';error=$_.Exception.Message}
  Write-Warning "$name : $($_.Exception.Message)"
 }
}
if($InstallPython){
 $python=$null
 if(Get-Command py.exe -ErrorAction SilentlyContinue){
  & py.exe -3.11 -c 'import sys;assert sys.version_info[:2]==(3,11)' 2>$null
  if($LASTEXITCODE -eq 0){$python=@('py.exe','-3.11')}
 }
 if(-not $python){Write-Warning 'Python 3.11 not found. Python dependencies skipped.'}
 else{
  $exe=$python[0];$args=@($python | Select-Object -Skip 1)
  foreach($item in @(@{name='mem0';package='mem0ai'},@{name='graphiti';package='graphiti-core'},@{name='crewAI';package='crewai'})){
   $venv=Join-Path (Join-Path $runtime 'third-party') ($item.name+'-venv')
   try{
    if(-not(Test-Path (Join-Path $venv 'Scripts\python.exe'))){& $exe @args -m venv $venv;if($LASTEXITCODE -ne 0){throw 'venv failed'}}
    $pip=Join-Path $venv 'Scripts\python.exe'
    & $pip -m pip install --disable-pip-version-check $item.package 2>&1 | Out-File -Append -FilePath $log
    if($LASTEXITCODE -ne 0){throw 'pip install failed'}
    Write-Host "[OK] Python: $($item.name)"
   }catch{Write-Warning "Python $($item.name): $($_.Exception.Message)"}
  }
 }
}
$report=Join-Path $runtime 'third-party-install-status.json'
$results | ConvertTo-Json -Depth 5 | Set-Content -Path $report -Encoding UTF8
Write-Host "Report: $report"
if(@($results|Where-Object {$_.status -eq 'failed'}).Count -gt 0){exit 1}
