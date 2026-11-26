# Mizan: serverni va internetdagi havolani tirik ushlab turadi (kompyuter yoqiq bo'lsa).
#   powershell -ExecutionPolicy Bypass -File watchdog.ps1            (server + havola)
#   powershell -ExecutionPolicy Bypass -File watchdog.ps1 -NoTunnel  (faqat server)
# Havola public-url.txt ga yoziladi. To'xtatish: Stop-Process -Name powershell (yoki oynani yoping).
param([int]$Port = 8787, [switch]$NoTunnel)

$root = $PSScriptRoot
$urlFile = Join-Path $root 'public-url.txt'
$lock = Join-Path $env:TEMP 'mizan-watchdog.pid'
$log = Join-Path $env:TEMP 'mizan-watchdog.log'

if (Test-Path $lock) {
  $old = Get-Content $lock -ErrorAction SilentlyContinue
  if ($old -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) { Write-Host "Watchdog allaqachon ishlayapti (pid $old)."; exit 0 }
}
$PID | Set-Content $lock

function Log($m) { "$(Get-Date -Format 's') $m" | Add-Content $log }
function Health($u) { try { return (Invoke-RestMethod "$u/api/health" -TimeoutSec 8).ok -eq $true } catch { return $false } }

$tunnel = $null
Log "watchdog boshlandi (pid $PID)"

while ($true) {
  if (-not (Health "http://127.0.0.1:$Port")) {
    Log 'server javob bermadi, qayta yoqilyapti'
    Start-Process node -ArgumentList '--env-file=.env', 'server.mjs' -WorkingDirectory $root -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $env:TEMP 'mizan-server.log') -RedirectStandardError (Join-Path $env:TEMP 'mizan-server.err') | Out-Null
    Start-Sleep -Seconds 8
  }

  if (-not $NoTunnel) {
    $url = if (Test-Path $urlFile) { (Get-Content $urlFile -ErrorAction SilentlyContinue | Select-Object -First 1) } else { '' }
    $alive = $url -and (Health $url)
    if (-not $alive) {
      Log 'havola ishlamayapti, yangisi ochilyapti'
      Get-Process ssh -ErrorAction SilentlyContinue | Stop-Process -Force
      Start-Sleep -Seconds 1
      $out = Join-Path $env:TEMP 'mizan-tunnel.log'; $err = Join-Path $env:TEMP 'mizan-tunnel.err'
      Remove-Item $out, $err -ErrorAction SilentlyContinue
      $tunnel = Start-Process ssh -ArgumentList '-T', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ServerAliveInterval=30', '-o', 'ExitOnForwardFailure=yes', '-R', "80:127.0.0.1:$Port", 'nokey@localhost.run', '--', '--output', 'json' `
        -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
      Start-Sleep -Seconds 12
      $m = [regex]::Match((Get-Content $out -Raw -ErrorAction SilentlyContinue), '"address":"([^"]+)"')
      if ($m.Success) {
        "https://$($m.Groups[1].Value)" | Set-Content $urlFile
        Log "yangi havola: https://$($m.Groups[1].Value)"
      } else {
        Log 'havola manzili olinmadi'
      }
    }
  }
  Start-Sleep -Seconds 60
}
