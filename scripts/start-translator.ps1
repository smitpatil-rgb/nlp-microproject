$ErrorActionPreference = 'Stop'
$pairScript = Join-Path $PSScriptRoot 'start-translator-pair.ps1'
$pairs = @(@{Port=5001; Languages='en,hi'}, @{Port=5002; Languages='en,fr'}, @{Port=5003; Languages='en,es'})
$children = foreach ($pair in $pairs) {
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$pairScript,'-Port',$pair.Port,'-Languages',$pair.Languages)
}
Write-Host 'LibreTranslate pair services running on ports 5001 (EN/HI), 5002 (EN/FR), and 5003 (EN/ES). Press Ctrl+C to stop.'
try { while ($true) { Start-Sleep -Seconds 2 } }
finally { $children | Stop-Process -Force -ErrorAction SilentlyContinue }
