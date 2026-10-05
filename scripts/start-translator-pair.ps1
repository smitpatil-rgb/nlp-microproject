param([Parameter(Mandatory=$true)][int]$Port,[Parameter(Mandatory=$true)][string]$Languages)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$env:PYTHONUTF8='1'; $env:PYTHONIOENCODING='utf-8'
$env:XDG_DATA_HOME=Join-Path $root 'work\argos-data'; $env:XDG_CONFIG_HOME=Join-Path $root 'work\argos-config'; $env:XDG_CACHE_HOME=Join-Path $root 'work\argos-cache'
$env:ARGOS_INTER_THREADS='1'; $env:ARGOS_INTRA_THREADS='1'; $env:ARGOS_COMPUTE_TYPE='float32'; $env:ARGOS_DEVICE_TYPE='cpu'
$env:CT2_USE_MKL='0'; $env:CT2_NUM_THREADS='1'; $env:CT2_INTER_THREADS='1'; $env:CT2_INTRA_THREADS='1'
$runtime=Join-Path $root 'work\libretranslate-venv\Scripts\libretranslate.exe'
& $runtime --host 127.0.0.1 --port $Port --load-only $Languages --disable-files-translation --disable-web-ui --threads 1
